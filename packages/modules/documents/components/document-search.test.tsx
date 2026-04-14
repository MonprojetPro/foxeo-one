import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@monprojetpro/ui', () => ({
  Input: ({ onChange, defaultValue, ...props }: React.ComponentProps<'input'>) => (
    <input defaultValue={defaultValue} onChange={onChange} {...props} />
  ),
}))

vi.mock('lucide-react', () => ({
  Search: () => <span>Search</span>,
  X: () => <span>X</span>,
}))

describe('DocumentSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with placeholder', async () => {
    const { DocumentSearch } = await import('./document-search')
    render(<DocumentSearch value="" onChange={vi.fn()} />)
    expect(screen.getByTestId('document-search')).toBeInTheDocument()
    expect(screen.getByTestId('document-search-input')).toBeInTheDocument()
  })

  it('calls onChange after 200ms debounce', async () => {
    const { DocumentSearch } = await import('./document-search')
    const mockOnChange = vi.fn()
    render(<DocumentSearch value="" onChange={mockOnChange} />)

    fireEvent.change(screen.getByTestId('document-search-input'), {
      target: { value: 'contrat' },
    })

    // Not called immediately
    expect(mockOnChange).not.toHaveBeenCalled()

    // Advance timers past debounce
    vi.advanceTimersByTime(200)
    expect(mockOnChange).toHaveBeenCalledWith('contrat')
  })

  it('shows clear button when value is non-empty', async () => {
    const { DocumentSearch } = await import('./document-search')
    render(<DocumentSearch value="" onChange={vi.fn()} />)

    fireEvent.change(screen.getByTestId('document-search-input'), {
      target: { value: 'test' },
    })

    expect(screen.getByTestId('document-search-clear')).toBeInTheDocument()
  })

  it('clears value and calls onChange("") when clicking clear', async () => {
    const { DocumentSearch } = await import('./document-search')
    const mockOnChange = vi.fn()
    render(<DocumentSearch value="test" onChange={mockOnChange} />)

    // Type something to show the clear button
    fireEvent.change(screen.getByTestId('document-search-input'), {
      target: { value: 'test' },
    })

    fireEvent.click(screen.getByTestId('document-search-clear'))
    expect(mockOnChange).toHaveBeenCalledWith('')
  })
})
