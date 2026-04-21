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

const INACTIVE_AGENT: ElioLabAgent = {
  ...ACTIVE_AGENT,
  id: 'uuid-2',
  archived: true,
}

describe('ElioLabAgentCard', () => {
  const onDeactivate = vi.fn()
  const onActivate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    onDeactivate.mockResolvedValue(undefined)
    onActivate.mockResolvedValue(undefined)
  })

  it('affiche le nom, la description, le modèle et la température', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onDeactivate={onDeactivate} onActivate={onActivate} />)
    expect(screen.getByText('Agent Test')).toBeTruthy()
    expect(screen.getByText('Un agent de test pour valider le composant')).toBeTruthy()
    expect(screen.getByText(/Sonnet/)).toBeTruthy()
    expect(screen.getByText(/temp 1/)).toBeTruthy()
  })

  it('affiche le badge Actif pour un agent actif', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onDeactivate={onDeactivate} onActivate={onActivate} />)
    expect(screen.getByText('Actif')).toBeTruthy()
  })

  it('affiche le badge Inactif pour un agent inactif', () => {
    render(<ElioLabAgentCard agent={INACTIVE_AGENT} onDeactivate={onDeactivate} onActivate={onActivate} />)
    expect(screen.getByText('Inactif')).toBeTruthy()
  })

  it('affiche le bouton Désactiver pour un agent actif', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onDeactivate={onDeactivate} onActivate={onActivate} />)
    expect(screen.getByText('Désactiver')).toBeTruthy()
  })

  it('affiche le bouton Activer pour un agent inactif', () => {
    render(<ElioLabAgentCard agent={INACTIVE_AGENT} onDeactivate={onDeactivate} onActivate={onActivate} />)
    expect(screen.getByText('Activer')).toBeTruthy()
  })

  it('appelle onDeactivate au clic Désactiver', async () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onDeactivate={onDeactivate} onActivate={onActivate} />)
    fireEvent.click(screen.getByText('Désactiver'))
    await waitFor(() => expect(onDeactivate).toHaveBeenCalledWith('uuid-1'))
    expect(onActivate).not.toHaveBeenCalled()
  })

  it('appelle onActivate au clic Activer', async () => {
    render(<ElioLabAgentCard agent={INACTIVE_AGENT} onDeactivate={onDeactivate} onActivate={onActivate} />)
    fireEvent.click(screen.getByText('Activer'))
    await waitFor(() => expect(onActivate).toHaveBeenCalledWith('uuid-2'))
    expect(onDeactivate).not.toHaveBeenCalled()
  })

  it('affiche le system prompt dans un bloc code', () => {
    render(<ElioLabAgentCard agent={ACTIVE_AGENT} onDeactivate={onDeactivate} onActivate={onActivate} />)
    expect(screen.getByText('Tu es un agent de test.')).toBeTruthy()
  })
})
