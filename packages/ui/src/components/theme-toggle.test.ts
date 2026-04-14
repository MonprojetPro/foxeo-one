import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const COMPONENT_PATH = resolve(__dirname, 'theme-toggle.tsx')

describe('ThemeToggle component', () => {
  const source = readFileSync(COMPONENT_PATH, 'utf-8')

  it('is a client component', () => {
    expect(source).toContain("'use client'")
  })

  it('imports useTheme from @monprojetpro/supabase/theme', () => {
    expect(source).toContain("from '@monprojetpro/supabase/theme'")
    expect(source).toContain('useTheme')
  })

  it('uses Sun and Moon icons from lucide-react', () => {
    expect(source).toContain('Sun')
    expect(source).toContain('Moon')
    expect(source).toContain("from 'lucide-react'")
  })

  it('has aria-label for accessibility', () => {
    expect(source).toContain('aria-label')
  })

  it('has French accessible labels with accents', () => {
    expect(source).toContain('Activer le mode clair')
    expect(source).toContain('Activer le mode sombre')
  })

  it('has sr-only label for screen readers', () => {
    expect(source).toContain('sr-only')
  })

  it('exports ThemeToggle function', () => {
    expect(source).toContain('export function ThemeToggle')
  })

  it('uses ghost variant button', () => {
    expect(source).toContain('variant="ghost"')
  })

  it('toggles between dark and light', () => {
    expect(source).toContain("'light'")
    expect(source).toContain("'dark'")
    expect(source).toContain('setTheme')
  })
})
