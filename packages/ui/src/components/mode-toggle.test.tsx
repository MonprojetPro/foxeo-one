import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeToggle, MODE_TOGGLE_COOKIE } from './mode-toggle'

const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

describe('ModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset cookies between tests
    document.cookie = `${MODE_TOGGLE_COOKIE}=; path=/; max-age=0`
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

  it('writes the cookie when toggling to a new mode', () => {
    render(<ModeToggle currentMode="one" labModeAvailable={true} />)
    fireEvent.click(screen.getByText('Mode Lab'))
    expect(document.cookie).toContain(`${MODE_TOGGLE_COOKIE}=lab`)
  })

  it('calls router.refresh() after toggle', () => {
    render(<ModeToggle currentMode="one" labModeAvailable={true} />)
    fireEvent.click(screen.getByText('Mode Lab'))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
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
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('switches the active button after a click', () => {
    render(<ModeToggle currentMode="one" labModeAvailable={true} />)
    const labBtn = screen.getByText('Mode Lab')
    expect(labBtn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(labBtn)
    expect(labBtn.getAttribute('aria-pressed')).toBe('true')
  })
})
