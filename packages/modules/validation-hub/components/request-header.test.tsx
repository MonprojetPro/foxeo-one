import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
      <button onClick={onClick} {...props}>{children}</button>,
  }
})

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    formatFullDate: (date: string) => `formatted:${date}`,
  }
})

describe('RequestHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importComponent() {
    const { RequestHeader } = await import('./request-header')
    return RequestHeader
  }

  it('should render the title', async () => {
    const RequestHeader = await importComponent()
    render(
      <RequestHeader
        title="Mon brief important"
        type="brief_lab"
        status="pending"
        submittedAt="2026-02-20T10:00:00Z"
      />
    )
    expect(screen.getByText('Mon brief important')).toBeDefined()
  })

  it('should display the type badge for brief_lab', async () => {
    const RequestHeader = await importComponent()
    render(
      <RequestHeader
        title="Brief"
        type="brief_lab"
        status="pending"
        submittedAt="2026-02-20T10:00:00Z"
      />
    )
    expect(screen.getByText('Brief Lab')).toBeDefined()
  })

  it('should display the type badge for evolution_one', async () => {
    const RequestHeader = await importComponent()
    render(
      <RequestHeader
        title="Évolution"
        type="evolution_one"
        status="approved"
        submittedAt="2026-02-20T10:00:00Z"
      />
    )
    expect(screen.getByText('Évolution One')).toBeDefined()
  })

  it('should display the correct status badge', async () => {
    const RequestHeader = await importComponent()
    render(
      <RequestHeader
        title="Brief"
        type="brief_lab"
        status="needs_clarification"
        submittedAt="2026-02-20T10:00:00Z"
      />
    )
    expect(screen.getByText('Précisions demandées')).toBeDefined()
  })

  it('should display formatted submission date', async () => {
    const RequestHeader = await importComponent()
    render(
      <RequestHeader
        title="Brief"
        type="brief_lab"
        status="pending"
        submittedAt="2026-02-20T10:00:00Z"
      />
    )
    expect(screen.getByText('formatted:2026-02-20T10:00:00Z')).toBeDefined()
  })

  it('should navigate back to queue on back button click', async () => {
    const RequestHeader = await importComponent()
    render(
      <RequestHeader
        title="Brief"
        type="brief_lab"
        status="pending"
        submittedAt="2026-02-20T10:00:00Z"
      />
    )
    const backBtn = screen.getByRole('button', {
      name: /file d'attente|retour/i,
    })
    fireEvent.click(backBtn)
    expect(mockPush).toHaveBeenCalledWith('/modules/validation-hub')
  })
})
