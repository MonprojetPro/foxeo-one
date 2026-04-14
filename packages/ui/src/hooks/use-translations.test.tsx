import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTranslations } from './use-translations'
import { LocaleProvider } from '../providers/locale-provider'
import { loadMessages } from '@monprojetpro/utils'
import type { ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>
}

describe('useTranslations', () => {
  beforeEach(() => {
    loadMessages('fr', {
      test: {
        simple: 'Valeur simple',
        nested: {
          deep: 'Valeur profonde',
        },
      },
      module: {
        header: {
          title: 'Titre du module',
        },
      },
    })
  })

  it('should return t function', () => {
    const { result } = renderHook(() => useTranslations(), { wrapper })
    expect(typeof result.current.t).toBe('function')
  })

  it('should return current locale', () => {
    const { result } = renderHook(() => useTranslations(), { wrapper })
    expect(result.current.locale).toBe('fr')
  })

  it('should translate without namespace', () => {
    const { result } = renderHook(() => useTranslations(), { wrapper })
    expect(result.current.t('test.simple')).toBe('Valeur simple')
  })

  it('should translate with namespace', () => {
    const { result } = renderHook(() => useTranslations('module'), { wrapper })
    expect(result.current.t('header.title')).toBe('Titre du module')
  })

  it('should combine namespace and key correctly', () => {
    const { result } = renderHook(() => useTranslations('test'), { wrapper })
    expect(result.current.t('nested.deep')).toBe('Valeur profonde')
  })

  it('should fallback to key if not found', () => {
    const { result } = renderHook(() => useTranslations(), { wrapper })
    expect(result.current.t('missing.key')).toBe('missing.key')
  })
})
