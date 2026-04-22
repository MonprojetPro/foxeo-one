import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepMobileTabs } from './step-mobile-tabs'

describe('StepMobileTabs', () => {
  it('renders both tab buttons', () => {
    render(<StepMobileTabs activeTab="step" onTabChange={vi.fn()} />)
    expect(screen.getByTestId('tab-step')).toBeDefined()
    expect(screen.getByTestId('tab-history')).toBeDefined()
  })

  it('renders tab labels "Étape" and "Historique"', () => {
    render(<StepMobileTabs activeTab="step" onTabChange={vi.fn()} />)
    expect(screen.getByText('Étape')).toBeDefined()
    expect(screen.getByText('Historique')).toBeDefined()
  })

  it('calls onTabChange with "history" when history tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<StepMobileTabs activeTab="step" onTabChange={onTabChange} />)
    fireEvent.click(screen.getByTestId('tab-history'))
    expect(onTabChange).toHaveBeenCalledWith('history')
  })

  it('calls onTabChange with "step" when step tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<StepMobileTabs activeTab="history" onTabChange={onTabChange} />)
    fireEvent.click(screen.getByTestId('tab-step'))
    expect(onTabChange).toHaveBeenCalledWith('step')
  })

  it('applies active style to the current tab', () => {
    render(<StepMobileTabs activeTab="history" onTabChange={vi.fn()} />)
    const historyBtn = screen.getByTestId('tab-history')
    const stepBtn = screen.getByTestId('tab-step')
    expect(historyBtn.className).toContain('text-[#a78bfa]')
    expect(stepBtn.className).not.toContain('text-[#a78bfa]')
  })

  it('sets aria-selected on active tab', () => {
    render(<StepMobileTabs activeTab="step" onTabChange={vi.fn()} />)
    expect(screen.getByTestId('tab-step').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('tab-history').getAttribute('aria-selected')).toBe('false')
  })

  it('has role tablist on container and role tab on buttons', () => {
    render(<StepMobileTabs activeTab="step" onTabChange={vi.fn()} />)
    expect(screen.getByTestId('step-mobile-tabs').getAttribute('role')).toBe('tablist')
    expect(screen.getByTestId('tab-step').getAttribute('role')).toBe('tab')
    expect(screen.getByTestId('tab-history').getAttribute('role')).toBe('tab')
  })
})
