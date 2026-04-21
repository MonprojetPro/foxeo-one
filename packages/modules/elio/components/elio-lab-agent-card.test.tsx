import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ElioLabAgentCard } from './elio-lab-agent-card'
import type { ElioLabAgent } from '../actions/sync-elio-lab-agents'

const ACTIVE_AGENT: ElioLabAgent = {
  id: 'uuid-1',
  name: 'Agent Test',
  description: 'Un agent de test pour valider le composant',
  model: 'claude-sonnet-4-6',
  temperature: 1.0,
  imagePath: null,
  filePath: 'packages/modules/elio/agents/lab/agent-test.md',
  systemPrompt: 'Tu es un agent de test.',
  archived: false,
  createdAt: '2026-04-21T00:00:00Z',
  updatedAt: '2026-04-21T00:00:00Z',
}

const ARCHIVED_AGENT: ElioLabAgent = {
  ...ACTIVE_AGENT,
  id: 'uuid-2',
  archived: true,
}

describe('ElioLabAgentCard', () => {
  const onArchive = vi.fn()
  const onDuplicate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    onArchive.mockResolvedValue(undefined)
    onDuplicate.mockResolvedValue(undefined)
  })

  it('affiche le nom, la description, le modèle et la température', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)

    expect(screen.getByText('Agent Test')).toBeTruthy()
    expect(screen.getByText('Un agent de test pour valider le composant')).toBeTruthy()
    expect(screen.getByText(/Sonnet/)).toBeTruthy()
    expect(screen.getByText(/temp 1/)).toBeTruthy()
  })

  it('affiche le badge Actif pour un agent actif', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)
    expect(screen.getByText('Actif')).toBeTruthy()
  })

  it('affiche le badge Archivé pour un agent archivé', () => {
    render(<ElioLabAgentCard agent={ARCHIVED_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)
    expect(screen.getByText('Archivé')).toBeTruthy()
  })

  it('masque les actions pour un agent archivé', () => {
    render(<ElioLabAgentCard agent={ARCHIVED_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)
    expect(screen.queryByText('Archiver')).toBeNull()
    expect(screen.queryByText('Dupliquer')).toBeNull()
  })

  it('demande confirmation avant archivage', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)

    fireEvent.click(screen.getByText('Archiver'))
    expect(screen.getByText('Confirmer ?')).toBeTruthy()
    expect(onArchive).not.toHaveBeenCalled()
  })

  it('annule l\'archivage quand on clique Non', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)

    fireEvent.click(screen.getByText('Archiver'))
    fireEvent.click(screen.getByText('Non'))
    expect(screen.getByText('Archiver')).toBeTruthy()
    expect(onArchive).not.toHaveBeenCalled()
  })

  it('appelle onArchive après double clic', async () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)

    fireEvent.click(screen.getByText('Archiver'))
    fireEvent.click(screen.getByText('Oui'))

    await waitFor(() => {
      expect(onArchive).toHaveBeenCalledWith('uuid-1')
    })
  })

  it('appelle onDuplicate au clic Dupliquer', async () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)

    fireEvent.click(screen.getByText('Dupliquer'))

    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledWith('uuid-1')
    })
  })

  it('affiche le system prompt dans un bloc code', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onArchive={onArchive} onDuplicate={onDuplicate} />)
    expect(screen.getByText('Tu es un agent de test.')).toBeTruthy()
  })
})
