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
  listFolderEntries,
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

type FakeNode = { name: string; kind: 'file' } | { name: string; kind: 'directory'; children: FakeNode[] }

function makeFakeTree(nodes: FakeNode[]): { kind: 'directory'; entries: () => AsyncGenerator<[string, unknown]> } {
  return {
    kind: 'directory',
    entries: async function* () {
      for (const node of nodes) {
        if (node.kind === 'file') {
          yield [node.name, { kind: 'file' }] as [string, unknown]
        } else {
          yield [node.name, makeFakeTree(node.children)] as [string, unknown]
        }
      }
    },
  }
}

describe('listFolderEntries', () => {
  it('liste fichiers et sous-dossiers, tries dossiers puis fichiers par ordre alphabetique', async () => {
    const tree = makeFakeTree([
      { name: 'facture.pdf', kind: 'file' },
      { name: 'sous dossier de test', kind: 'directory', children: [{ name: 'note.txt', kind: 'file' }] },
      { name: 'devis.pdf', kind: 'file' },
    ])

    const result = await listFolderEntries(tree as never)

    expect(result.map((e) => e.name)).toEqual(['sous dossier de test', 'devis.pdf', 'facture.pdf'])
    expect(result[0]).toMatchObject({ kind: 'directory', children: [{ name: 'note.txt', kind: 'file' }] })
  })

  it('rend un tableau vide pour un dossier vide', async () => {
    const tree = makeFakeTree([])
    const result = await listFolderEntries(tree as never)
    expect(result).toEqual([])
  })

  it('plafonne la profondeur pour ne pas parcourir un dossier sans fin', async () => {
    const tree = makeFakeTree([
      {
        name: 'a',
        kind: 'directory',
        children: [{ name: 'b', kind: 'directory', children: [{ name: 'c', kind: 'directory', children: [{ name: 'd', kind: 'directory', children: [{ name: 'trop-profond.txt', kind: 'file' }] }] }] }],
      },
    ])

    const result = await listFolderEntries(tree as never, 2)

    // a -> b -> c autorises (depth 2), c.children reste undefined (profondeur epuisee)
    const a = result[0]
    const b = a?.children?.[0]
    const c = b?.children?.[0]
    expect(c?.name).toBe('c')
    expect(c?.children).toBeUndefined()
  })
})

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
