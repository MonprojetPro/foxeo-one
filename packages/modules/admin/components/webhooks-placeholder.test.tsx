import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WebhooksPlaceholder } from './webhooks-placeholder'

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual }
})

describe('WebhooksPlaceholder', () => {
  it('renders Phase 2 badge', () => {
    render(<WebhooksPlaceholder />)
    expect(screen.getByText('Phase 2')).toBeTruthy()
  })

  it('renders webhooks title', () => {
    render(<WebhooksPlaceholder />)
    expect(screen.getByText('Webhooks sortants')).toBeTruthy()
  })

  it('renders integration description mentioning Slack, Zapier, Make', () => {
    render(<WebhooksPlaceholder />)
    const desc = screen.getByText(/Slack, Zapier, Make/)
    expect(desc).toBeTruthy()
  })

  it('renders webhook icon', () => {
    render(<WebhooksPlaceholder />)
    expect(screen.getByText('🔗')).toBeTruthy()
  })
})
