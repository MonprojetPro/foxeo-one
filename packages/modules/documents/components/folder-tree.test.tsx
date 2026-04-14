import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { FolderTree } from './folder-tree'
import type { DocumentFolder } from '../types/folder.types'

// Mock @monprojetpro/ui
vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Input: ({ value, onChange, ...props }: React.ComponentProps<'input'>) => (
    <input value={value} onChange={onChange} {...props} />
  ),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Folder: () => <span>Folder</span>,
  FolderOpen: () => <span>FolderOpen</span>,
  Plus: () => <span>+</span>,
  MoreHorizontal: () => <span>...</span>,
  Pencil: () => <span>Edit</span>,
  Trash2: () => <span>Delete</span>,
}))

vi.mock('@monprojetpro/utils', () => ({ cn: (...args: string[]) => args.filter(Boolean).join(' ') }))

const mockCreateFolder = vi.fn()
const mockRenameFolder = vi.fn()
const mockDeleteFolder = vi.fn()

vi.mock('../hooks/use-folder-mutations', () => ({
  useFolderMutations: () => ({
    useCreateFolder: { mutate: mockCreateFolder, isPending: false, isSuccess: false },
    useRenameFolder: { mutate: mockRenameFolder, isPending: false, isSuccess: false },
    useDeleteFolder: { mutate: mockDeleteFolder, isPending: false, isSuccess: false },
    useMoveDocument: { mutate: vi.fn(), isPending: false },
  }),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'

const mockFolders: DocumentFolder[] = [
  {
    id: 'folder-1',
    clientId: CLIENT_ID,
    operatorId: OPERATOR_ID,
    name: 'Contrats',
    parentId: null,
    createdAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 'folder-2',
    clientId: CLIENT_ID,
    operatorId: OPERATOR_ID,
    name: 'Factures',
    parentId: null,
    createdAt: '2026-02-20T10:00:00Z',
  },
]

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('FolderTree', () => {
  const mockOnSelectFolder = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without folders — shows Tous les documents and Non classés', () => {
    render(
      <FolderTree
        folders={[]}
        selectedFolderId={null}
        onSelectFolder={mockOnSelectFolder}
        clientId={CLIENT_ID}
        operatorId={OPERATOR_ID}
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByTestId('folder-all')).toBeInTheDocument()
    expect(screen.getByTestId('folder-uncategorized')).toBeInTheDocument()
    expect(screen.getByTestId('new-folder-btn')).toBeInTheDocument()
  })

  it('renders with folders', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockOnSelectFolder}
        clientId={CLIENT_ID}
        operatorId={OPERATOR_ID}
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByTestId('folder-item-folder-1')).toBeInTheDocument()
    expect(screen.getByTestId('folder-item-folder-2')).toBeInTheDocument()
    expect(screen.getByText('Contrats')).toBeInTheDocument()
    expect(screen.getByText('Factures')).toBeInTheDocument()
  })

  it('calls onSelectFolder when clicking a folder', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockOnSelectFolder}
        clientId={CLIENT_ID}
        operatorId={OPERATOR_ID}
      />,
      { wrapper: createWrapper() }
    )
    fireEvent.click(screen.getByTestId('folder-item-folder-1'))
    expect(mockOnSelectFolder).toHaveBeenCalledWith('folder-1')
  })

  it('calls onSelectFolder(null) when clicking Tous les documents', () => {
    render(
      <FolderTree
        folders={[]}
        selectedFolderId="folder-1"
        onSelectFolder={mockOnSelectFolder}
        clientId={CLIENT_ID}
        operatorId={OPERATOR_ID}
      />,
      { wrapper: createWrapper() }
    )
    fireEvent.click(screen.getByTestId('folder-all'))
    expect(mockOnSelectFolder).toHaveBeenCalledWith(null)
  })

  it('calls onSelectFolder("uncategorized") when clicking Non classés', () => {
    render(
      <FolderTree
        folders={[]}
        selectedFolderId={null}
        onSelectFolder={mockOnSelectFolder}
        clientId={CLIENT_ID}
        operatorId={OPERATOR_ID}
      />,
      { wrapper: createWrapper() }
    )
    fireEvent.click(screen.getByTestId('folder-uncategorized'))
    expect(mockOnSelectFolder).toHaveBeenCalledWith('uncategorized')
  })

  it('opens create dialog when clicking Nouveau dossier', () => {
    render(
      <FolderTree
        folders={[]}
        selectedFolderId={null}
        onSelectFolder={mockOnSelectFolder}
        clientId={CLIENT_ID}
        operatorId={OPERATOR_ID}
      />,
      { wrapper: createWrapper() }
    )
    fireEvent.click(screen.getByTestId('new-folder-btn'))
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
  })

  it('shows delete confirmation when clicking delete icon', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockOnSelectFolder}
        clientId={CLIENT_ID}
        operatorId={OPERATOR_ID}
      />,
      { wrapper: createWrapper() }
    )
    fireEvent.mouseEnter(screen.getByTestId('folder-item-folder-1'))
    fireEvent.click(screen.getByTestId('delete-folder-folder-1'))
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
  })
})
