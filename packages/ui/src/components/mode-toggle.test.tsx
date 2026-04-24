import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModeToggle } from './mode-toggle'

const mockSetActiveViewMode = vi.fn(() => Promise.resolve())

vi.mock('./mode-toggle-action', () => ({
  setActiveViewMode: (mode: 'lab' | 'one') => mockSetActiveViewMode(mode),
}))

vi.mock('./mode-toggle-constants', () => ({
  MODE_TOGGLE_COOKIE: 'mpp_active_view',
}))

describe('ModeToggle', () => {
  const originalReplace = window.location.replace
  const mockReplace = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Stub window.location.replace (JSDOM ne le supporte pas nativement sur nav)
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace: mockReplace },
    })
    mockReplace.mockClear()
  })

  it('exports ModeToggle component', () => {
    expect(ModeToggle).toBeDefined()
  })

  it('does NOT render when labModeAvailable is false', () => {
    const { container } = render(
      <ModeToggle currentMode="one" labModeAvailable={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders both Mode Lab and Mode One buttons when labModeAvailable is true', () => {
    render(<ModeToggle currentMode="one" labModeAvailable={true} />)
    expect(screen.getByText('Mode Lab')).toBeDefined()
    expect(screen.getByText('Mode One')).toBeDefined()
  })

  it('marks the current mode button as aria-pressed=true', () => {
    render(<ModeToggle currentMode="lab" labModeAvailable={true} />)
    const labBtn = screen.getByText('Mode Lab')
    const oneBtn = screen.getByText('Mode One')
    expect(labBtn.getAttribute('aria-pressed')).toBe('true')
    expect(oneBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('calls setActiveViewMode server action when toggling to a new mode', async () => {
    render(<ModeToggle currentMode="one" labModeAvailable={true} />)
    fireEvent.click(screen.getByText('Mode Lab'))
    await waitFor(() => {
      expect(mockSetActiveViewMode).toHaveBeenCalledWith('lab')
    })
  })

  it('reloads to / via window.location.replace after the server action resolves', async () => {
    render(<ModeToggle currentMode="one" labModeAvailable={true} />)
    fireEvent.click(screen.getByText('Mode Lab'))
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
  })

  it('calls onToggle callback with the new mode', () => {
    const onToggle = vi.fn()
    render(
      <ModeToggle currentMode="one" labModeAvailable={true} onToggle={onToggle} />
    )
    fireEvent.click(screen.getByText('Mode Lab'))
    expect(onToggle).toHaveBeenCalledWith('lab')
  })

  it('does nothing when clicking the already active mode', () => {
    const onToggle = vi.fn()
    render(
      <ModeToggle currentMode="lab" labModeAvailable={true} onToggle={onToggle} />
    )
    fireEvent.click(screen.getByText('Mode Lab'))
    expect(onToggle).not.toHaveBeenCalled()
    expect(mockSetActiveViewMode).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('switches the active button after a click', () => {
    render(<ModeToggle currentMode="one" labModeAvailable={true} />)
    const labBtn = screen.getByText('Mode Lab')
    expect(labBtn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(labBtn)
    expect(labBtn.getAttribute('aria-pressed')).toBe('true')
  })
})
