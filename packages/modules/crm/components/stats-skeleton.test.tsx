import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsSkeleton } from './stats-skeleton'

describe('StatsSkeleton', () => {
  it('should render skeleton cards grid', () => {
    const { container } = render(<StatsSkeleton />)

    // Should have skeleton elements for loading state
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should render without crashing', () => {
    expect(() => render(<StatsSkeleton />)).not.toThrow()
  })
})
