import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ModuleToggleList } from './module-toggle-list'
import type { ModuleManifest } from '@monprojetpro/types'

const mockUpdateActiveModules = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('../actions/update-active-modules', () => ({
  updateActiveModules: (...args: unknown[]) => mockUpdateActiveModules(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
    showError: (...args: unknown[]) => mockShowError(...args),
  }
})

const CLIENT_ID = '123e4567-e89b-12d3-a456-426614174000'

const BASE_MODULES: ModuleManifest[] = [
  {
    id: 'core-dashboard',
    name: 'Dashboard',
    version: '1.0.0',
    description: 'Dashboard principal',
    navigation: { icon: '🏠', label: 'Dashboard', position: 1 },
    routes: [],
    requiredTables: [],
    targets: ['client-one'],
    dependencies: [],
  },
  {
    id: 'elio',
    name: 'Élio',
    version: '1.0.0',
    description: 'Agent IA Élio',
    navigation: { icon: '🤖', label: 'Élio', position: 2 },
    routes: [],
    requiredTables: [],
    targets: ['client-one'],
    dependencies: [],
  },
]

const COMMERCIAL_MODULES: ModuleManifest[] = [
  {
    id: 'crm',
    name: 'CRM',
    version: '1.0.0',
    description: 'Gestion des contacts',
    navigation: { icon: '👥', label: 'CRM', position: 10 },
    routes: [],
    requiredTables: [],
    targets: ['client-one'],
    dependencies: [],
  },
  {
    id: 'signature',
    name: 'Signature',
    version: '1.0.0',
    description: 'Signature électronique',
    navigation: { icon: '✍️', label: 'Signature', position: 11 },
    routes: [],
    requiredTables: [],
    targets: ['client-one'],
    dependencies: [],
  },
]

const ALL_MODULES = [...BASE_MODULES, ...COMMERCIAL_MODULES]

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('ModuleToggleList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateActiveModules.mockResolvedValue({ data: undefined, error: null })
  })

  describe('Rendu modules de base', () => {
    it('affiche tous les modules fournis', () => {
      renderWithQueryClient(
        <ModuleToggleList
          clientId={CLIENT_ID}
          activeModules={['core-dashboard', 'elio']}
          allModules={ALL_MODULES}
        />
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Élio')).toBeInTheDocument()
      expect(screen.getByText('CRM')).toBeInTheDocument()
    })

    it('affiche le badge "Inclus" pour les modules de base', () => {
      renderWithQueryClient(
        <ModuleToggleList
          clientId={CLIENT_ID}
          activeModules={['core-dashboard', 'elio']}
          allModules={BASE_MODULES}
        />
      )

      const badges = screen.getAllByText('Inclus')
      expect(badges.length).toBeGreaterThanOrEqual(2)
    })

    it('désactive le toggle pour les modules de base (core-dashboard)', () => {
      renderWithQueryClient(
        <ModuleToggleList
          clientId={CLIENT_ID}
          activeModules={['core-dashboard', 'elio']}
          allModules={BASE_MODULES}
        />
      )

      const toggle = screen.getByRole('switch', { name: /désactiver le module dashboard/i })
      expect(toggle).toBeDisabled()
    })

    it('désactive le toggle pour elio (module de base)', () => {
      renderWithQueryClient(
        <ModuleToggleList
          clientId={CLIENT_ID}
          activeModules={['elio']}
          allModules={BASE_MODULES}
        />
      )

      const toggle = screen.getByRole('switch', { name: /désactiver le module élio/i })
      expect(toggle).toBeDisabled()
    })
  })

  describe('Toggle module commercial', () => {
    it('appelle updateActiveModules quand on clique sur le toggle d\'un module commercial', async () => {
      renderWithQueryClient(
        <ModuleToggleList
          clientId={CLIENT_ID}
          activeModules={['core-dashboard']}
          allModules={COMMERCIAL_MODULES}
        />
      )

      const toggle = screen.getByRole('switch', { name: /activer le module crm/i })
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(mockUpdateActiveModules).toHaveBeenCalledWith(CLIENT_ID, 'crm', true)
      })
    })

    it('affiche un toast succès après activation', async () => {
      renderWithQueryClient(
        <ModuleToggleList
          clientId={CLIENT_ID}
          activeModules={[]}
          allModules={COMMERCIAL_MODULES}
        />
      )

      const toggle = screen.getByRole('switch', { name: /activer le module crm/i })
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('CRM'))
      })
    })

    it('affiche un toast erreur si updateActiveModules échoue', async () => {
      mockUpdateActiveModules.mockResolvedValueOnce({
        data: null,
        error: { message: 'Erreur serveur', code: 'DATABASE_ERROR' },
      })

      renderWithQueryClient(
        <ModuleToggleList
          clientId={CLIENT_ID}
          activeModules={[]}
          allModules={COMMERCIAL_MODULES}
        />
      )

      const toggle = screen.getByRole('switch', { name: /activer le module crm/i })
      fireEvent.click(toggle)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('Erreur serveur'))
      })
    })
  })

  describe('État vide', () => {
    it('affiche un message si aucun module disponible', () => {
      renderWithQueryClient(
        <ModuleToggleList
          clientId={CLIENT_ID}
          activeModules={[]}
          allModules={[]}
        />
      )

      expect(screen.getByText(/aucun module disponible/i)).toBeInTheDocument()
    })
  })
})
