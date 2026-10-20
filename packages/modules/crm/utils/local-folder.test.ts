import { describe, it, expect, beforeEach, vi } from 'vitest'

// happy-dom (l'environnement par défaut de ce dépôt) n'implémente pas
// IndexedDB — un fake minimal suffit ici, pas besoin d'une dépendance de plus
// juste pour vérifier que put()/get() passent bien par la même clé de projet.
function installFakeIndexedDb() {
  const store = new Map<string, unknown>()

  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => {},
    transaction: () => {
      const tx: Record<string, unknown> = {
        objectStore: () => ({
          put: (value: unknown, key: string) => {
            store.set(key, value)
            queueMicrotask(() => (tx.oncomplete as (() => void) | undefined)?.())
            return {}
          },
          get: (key: string) => {
            const req: Record<string, unknown> = { result: store.get(key) }
            queueMicrotask(() => (req.onsuccess as (() => void) | undefined)?.())
            return req
          },
          delete: (key: string) => {
            store.delete(key)
            queueMicrotask(() => (tx.oncomplete as (() => void) | undefined)?.())
            return {}
          },
        }),
      }
      return tx
    },
  }

  ;(globalThis as unknown as { indexedDB: unknown }).indexedDB = {
    open: () => {
      const req: Record<string, unknown> = { result: db }
      queueMicrotask(() => (req.onsuccess as (() => void) | undefined)?.())
      return req
    },
  }

  return store
}
import {
  isLocalFolderSupported,
  pickAndStoreFolder,
  getStoredFolderHandle,
  hasFolderPermission,
  requestFolderPermission,
  writeFileToFolder,
} from './local-folder'

// ============================================================
// T-063 — le Hub n'a jamais d'accès direct au disque de MiKL : cette API est
// la seule porte (File System Access, Chrome/Edge). `fake-indexeddb` simule
// le stockage du handle pour que le test n'ait pas besoin d'un vrai navigateur.
// ============================================================

function makeFileHandle() {
  const writable = { write: vi.fn(async () => {}), close: vi.fn(async () => {}) }
  return {
    createWritable: vi.fn(async () => writable),
    __writable: writable,
  }
}

function makeDirectoryHandle() {
  const fileHandle = makeFileHandle()
  const subDir: Record<string, unknown> = {
    getFileHandle: vi.fn(async () => fileHandle),
  }
  return {
    queryPermission: vi.fn(async () => 'granted' as const),
    requestPermission: vi.fn(async () => 'granted' as const),
    getDirectoryHandle: vi.fn(async () => subDir),
    __fileHandle: fileHandle,
    __subDir: subDir,
  }
}

describe('isLocalFolderSupported', () => {
  it('false si showDirectoryPicker est absent de window', () => {
    expect(isLocalFolderSupported()).toBe(false)
  })

  it('true si showDirectoryPicker existe', () => {
    ;(window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker = vi.fn()
    expect(isLocalFolderSupported()).toBe(true)
    delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker
  })
})

describe('pickAndStoreFolder / getStoredFolderHandle', () => {
  const PROJECT_ID = 'project-1'

  beforeEach(() => {
    delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker
    installFakeIndexedDb()
  })

  it('retourne null si le navigateur ne supporte pas', async () => {
    const result = await pickAndStoreFolder(PROJECT_ID)
    expect(result).toBeNull()
  })

  it('stocke le handle choisi, puis le relit pour le même projet', async () => {
    const handle = makeDirectoryHandle()
    ;(window as unknown as { showDirectoryPicker: () => Promise<unknown> }).showDirectoryPicker = vi.fn(
      async () => handle
    )

    const picked = await pickAndStoreFolder(PROJECT_ID)
    expect(picked).toBe(handle)

    const reloaded = await getStoredFolderHandle(PROJECT_ID)
    expect(reloaded).toBe(handle)
  })

  it("rend null pour un projet qui n'a jamais ete lie", async () => {
    const result = await getStoredFolderHandle('projet-jamais-lie')
    expect(result).toBeNull()
  })
})

describe('permissions', () => {
  it("hasFolderPermission reflete l'etat queryPermission", async () => {
    const handle = makeDirectoryHandle()
    expect(await hasFolderPermission(handle as never)).toBe(true)

    handle.queryPermission = vi.fn(async () => 'prompt' as const)
    expect(await hasFolderPermission(handle as never)).toBe(false)
  })

  it('requestFolderPermission reflete la reponse du prompt', async () => {
    const handle = makeDirectoryHandle()
    handle.requestPermission = vi.fn(async () => 'denied' as const)
    expect(await requestFolderPermission(handle as never)).toBe(false)
  })
})

describe('writeFileToFolder', () => {
  it('ecrit dans la sous-arborescence fixe correspondant a la categorie', async () => {
    const handle = makeDirectoryHandle()
    await writeFileToFolder(handle as never, 'dossierCii', 'reformulation.md', 'contenu')

    expect(handle.getDirectoryHandle).toHaveBeenCalledWith('Dossier CII', { create: true })
    expect(handle.__subDir.getFileHandle).toHaveBeenCalledWith('reformulation.md', { create: true })
    expect(handle.__fileHandle.__writable.write).toHaveBeenCalledWith('contenu')
    expect(handle.__fileHandle.__writable.close).toHaveBeenCalled()
  })
})
