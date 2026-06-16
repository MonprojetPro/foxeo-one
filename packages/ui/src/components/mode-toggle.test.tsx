import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeToggle } from './mode-toggle'

describe('ModeToggle', () => {
  const mockReplace = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // JSDOM ne supporte pas nativement la navigation — on stub replace.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace: mockReplace },
    })
    mockReplace.mockClear()
  })

  it('ne rend rien si labModeAvailable=false (One direct, pas de toggle)', () => {
    const { container } = render(<ModeToggle currentMode="one" labModeAvailable={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('affiche les deux boutons quand le toggle est visible', () => {
    render(<ModeToggle currentMode="one" labModeAvailable />)
    expect(screen.getByText('Mode Lab')).toBeDefined()
    expect(screen.getByText('Mode One')).toBeDefined()
  })

  it('marque le mode actif avec aria-pressed=true', () => {
    render(<ModeToggle currentMode="lab" labModeAvailable />)
    expect(screen.getByText('Mode Lab').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Mode One').getAttribute('aria-pressed')).toBe('false')
  })

  it('bascule vers un mode disponible → navigation', () => {
    render(<ModeToggle currentMode="lab" labModeAvailable />)
    fireEvent.click(screen.getByText('Mode One'))
    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  it('appelle onToggle avec le nouveau mode', () => {
    const onToggle = vi.fn()
    render(<ModeToggle currentMode="lab" labModeAvailable onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Mode One'))
    expect(onToggle).toHaveBeenCalledWith('one')
  })

  it('clic sur le mode déjà actif → ne fait rien', () => {
    const onToggle = vi.fn()
    render(<ModeToggle currentMode="lab" labModeAvailable onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Mode Lab'))
    expect(onToggle).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('clic sur Mode One VERROUILLÉ → message teasing, aucune navigation', () => {
    render(<ModeToggle currentMode="lab" labModeAvailable oneLocked />)
    expect(screen.queryByText(/futur espace One/i)).toBeNull()
    fireEvent.click(screen.getByText('Mode One'))
    expect(screen.queryByText(/futur espace One/i)).not.toBeNull()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
