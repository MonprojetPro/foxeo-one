'use client'

// ============================================================
// T-063 — Dossier projet local
//
// Le Hub tourne sur Vercel : il n'a aucun accès au disque de MiKL. La seule
// porte possible est la File System Access API du navigateur (Chrome/Edge,
// pas Firefox) — MiKL autorise une fois un dossier local depuis la page, et
// le Hub peut ensuite y écrire tant que la permission est valide.
//
// Le handle du dossier (FileSystemDirectoryHandle) n'est PAS sérialisable au
// sens JSON et ne peut pas traverser le réseau : il est stocké en IndexedDB,
// côté navigateur, jamais en base Supabase. Si MiKL change de navigateur ou
// de machine, il relie simplement le dossier à nouveau.
//
// Pas de types DOM standard pour cette API expérimentale dans ce tsconfig —
// déclarations minimales ci-dessous plutôt que `any` disséminé.
// ============================================================

type FsPermissionState = 'granted' | 'denied' | 'prompt'

interface FsFileHandle {
  kind: 'file'
  createWritable(): Promise<{ write(data: Blob | ArrayBuffer | string): Promise<void>; close(): Promise<void> }>
}

interface FsDirectoryHandle {
  kind: 'directory'
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FsDirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileHandle>
  queryPermission(options: { mode: 'readwrite' }): Promise<FsPermissionState>
  requestPermission(options: { mode: 'readwrite' }): Promise<FsPermissionState>
  entries(): AsyncIterable<[string, FsDirectoryHandle | FsFileHandle]>
}

type LocalFolderHandle = FsDirectoryHandle

const DB_NAME = 'mpp-local-folders'
const STORE_NAME = 'handles'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function isLocalFolderSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** Ouvre le sélecteur Windows, puis persiste le handle choisi pour ce projet. */
export async function pickAndStoreFolder(projectId: string): Promise<LocalFolderHandle | null> {
  if (!isLocalFolderSupported()) return null

  const picker = (window as unknown as { showDirectoryPicker: (opts: { mode: 'readwrite' }) => Promise<LocalFolderHandle> })
    .showDirectoryPicker
  const handle = await picker({ mode: 'readwrite' })

  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, projectId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return handle
}

/** Relit le handle lié à ce projet, s'il a déjà été choisi sur ce navigateur. */
export async function getStoredFolderHandle(projectId: string): Promise<LocalFolderHandle | null> {
  if (!isLocalFolderSupported()) return null
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(projectId)
    req.onsuccess = () => resolve((req.result as LocalFolderHandle | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function removeStoredFolderHandle(projectId: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(projectId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** true seulement si la permission est DEJA accordée — ne déclenche jamais de prompt. */
export async function hasFolderPermission(handle: LocalFolderHandle): Promise<boolean> {
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted'
}

/** Déclenche le prompt navigateur si besoin — à n'appeler que sur un geste utilisateur. */
export async function requestFolderPermission(handle: LocalFolderHandle): Promise<boolean> {
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

// Arborescence fixe dans le dossier projet — T-063, section "process en 4 temps".
export const LOCAL_FOLDER_CATEGORIES = {
  devisFactures: 'Devis & Factures',
  documentsElio: 'Documents Élio',
  dossierCii: 'Dossier CII',
  transcriptions: 'Transcriptions',
  consignes: 'Consignes',
} as const

export type LocalFolderCategory = keyof typeof LOCAL_FOLDER_CATEGORIES

export async function writeFileToFolder(
  rootHandle: LocalFolderHandle,
  category: LocalFolderCategory,
  fileName: string,
  content: Blob | ArrayBuffer | string
): Promise<void> {
  const subDir = await rootHandle.getDirectoryHandle(LOCAL_FOLDER_CATEGORIES[category], { create: true })
  const fileHandle = await subDir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export type FolderItem = {
  name: string
  kind: 'file' | 'directory'
  /** Handle reel — permet de depiler un sous-dossier a la demande (clic), jamais pre-charge en entier. */
  handle: FsDirectoryHandle | FsFileHandle
}

/**
 * Lit le contenu REEL d'UN niveau du dossier lie — fichiers/sous-dossiers que
 * MiKL y range lui-meme a la main, pas seulement ce que le Hub y a ecrit.
 * Lecture seule. Ne descend jamais automatiquement dans les sous-dossiers :
 * c'est a l'appelant de rappeler cette fonction sur le handle d'un sous-dossier
 * quand MiKL clique dessus pour le deplier (evite de parcourir un dossier
 * enorme en silence au premier chargement).
 */
export async function listFolderLevel(handle: LocalFolderHandle): Promise<FolderItem[]> {
  const items: FolderItem[] = []
  for await (const [name, child] of handle.entries()) {
    items.push({ name, kind: child.kind, handle: child })
  }
  return items.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1
  )
}
