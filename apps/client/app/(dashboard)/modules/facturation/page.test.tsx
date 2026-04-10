import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Stubs pour Server Components non pertinents dans ce test
vi.mock('next/navigation', () => ({ notFound: vi.fn() }))
vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } } }) },
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'c-1' } }) })),
  })),
}))
vi.mock('@monprojetpro/modules-facturation', () => ({
  InvoicesList: () => null,
  BillingSummary: () => null,
}))

// Story 13.1 — Titre "Comptabilité" sur la page client facturation
describe('ClientFacturationPage — Story 13.1', () => {
  it('affiche "Comptabilité" comme titre (pas "Mes factures")', async () => {
    // Import dynamique pour déclencher le rendu du Server Component
    const { default: Page } = await import('./page')
    const jsx = await Page()
    render(jsx as React.ReactElement)
    expect(screen.getByRole('heading', { name: /Comptabilité/i })).toBeInTheDocument()
    expect(screen.queryByText(/Mes factures/i)).not.toBeInTheDocument()
  })
})
