import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useSpeechDictation,
  extractFinalTranscript,
  type SpeechRecognitionEventLike,
} from './use-speech-dictation'

// ── Fake Web Speech API ───────────────────────────────────────────────────────

type ResultHandler = (event: SpeechRecognitionEventLike) => void
type ErrorHandler = (event: { error: string }) => void

const instances: FakeSpeechRecognition[] = []

class FakeSpeechRecognition {
  lang = ''
  continuous = false
  interimResults = false
  onresult: ResultHandler | null = null
  onerror: ErrorHandler | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()

  constructor() {
    instances.push(this)
  }
}

function makeEvent(
  segments: Array<{ transcript: string; isFinal: boolean }>,
  resultIndex = 0,
): SpeechRecognitionEventLike {
  const results = segments.map((s) => ({
    isFinal: s.isFinal,
    length: 1,
    0: { transcript: s.transcript },
  }))
  return { resultIndex, results: Object.assign(results, { length: results.length }) }
}

declare global {
  interface Window {
    webkitSpeechRecognition?: unknown
  }
}

beforeEach(() => {
  instances.length = 0
  window.webkitSpeechRecognition = FakeSpeechRecognition
})

afterEach(() => {
  delete window.webkitSpeechRecognition
})

// ── extractFinalTranscript (logique pure) ────────────────────────────────────

describe('extractFinalTranscript', () => {
  it('concatène uniquement les segments finaux à partir de resultIndex', () => {
    const event = makeEvent(
      [
        { transcript: 'déjà traité ', isFinal: true },
        { transcript: 'bonjour Élio', isFinal: true },
        { transcript: ' hypothèse en cours', isFinal: false },
      ],
      1,
    )
    expect(extractFinalTranscript(event)).toBe('bonjour Élio')
  })

  it('retourne une chaîne vide si aucun segment final', () => {
    const event = makeEvent([{ transcript: 'en cours…', isFinal: false }])
    expect(extractFinalTranscript(event)).toBe('')
  })
})

// ── useSpeechDictation ────────────────────────────────────────────────────────

describe('useSpeechDictation', () => {
  it('isSupported=false quand le navigateur n’a pas la Web Speech API (Firefox)', () => {
    delete window.webkitSpeechRecognition
    const { result } = renderHook(() => useSpeechDictation({ onTranscript: vi.fn() }))
    expect(result.current.isSupported).toBe(false)
  })

  it('toggle démarre l’écoute en fr-FR, continuous + interimResults', () => {
    const { result } = renderHook(() => useSpeechDictation({ onTranscript: vi.fn() }))
    expect(result.current.isSupported).toBe(true)

    act(() => result.current.toggle())

    expect(result.current.isListening).toBe(true)
    const rec = instances[0]!
    expect(rec.start).toHaveBeenCalledTimes(1)
    expect(rec.lang).toBe('fr-FR')
    expect(rec.continuous).toBe(true)
    expect(rec.interimResults).toBe(true)
  })

  it('les résultats FINAUX appellent onTranscript (les interim sont ignorés)', () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useSpeechDictation({ onTranscript }))

    act(() => result.current.toggle())
    const rec = instances[0]!

    act(() => rec.onresult?.(makeEvent([{ transcript: 'hypothèse…', isFinal: false }])))
    expect(onTranscript).not.toHaveBeenCalled()

    act(() => rec.onresult?.(makeEvent([{ transcript: ' envoie un message à Dupont ', isFinal: true }])))
    expect(onTranscript).toHaveBeenCalledWith('envoie un message à Dupont')
  })

  it('re-toggle arrête l’écoute (stop)', () => {
    const { result } = renderHook(() => useSpeechDictation({ onTranscript: vi.fn() }))

    act(() => result.current.toggle())
    act(() => result.current.toggle())

    expect(instances[0]!.stop).toHaveBeenCalledTimes(1)
    expect(result.current.isListening).toBe(false)
  })

  it('permission refusée → message d’erreur discret + écoute stoppée', () => {
    const { result } = renderHook(() => useSpeechDictation({ onTranscript: vi.fn() }))

    act(() => result.current.toggle())
    act(() => instances[0]!.onerror?.({ error: 'not-allowed' }))

    expect(result.current.isListening).toBe(false)
    expect(result.current.error).toContain('micro refusé')
  })

  it('no-speech est bénin : pas de message d’erreur', () => {
    const { result } = renderHook(() => useSpeechDictation({ onTranscript: vi.fn() }))

    act(() => result.current.toggle())
    act(() => instances[0]!.onerror?.({ error: 'no-speech' }))

    expect(result.current.error).toBeNull()
  })

  it('onend spontané (silence) → isListening repasse à false', () => {
    const { result } = renderHook(() => useSpeechDictation({ onTranscript: vi.fn() }))

    act(() => result.current.toggle())
    expect(result.current.isListening).toBe(true)

    act(() => instances[0]!.onend?.())
    expect(result.current.isListening).toBe(false)
  })

  it('cleanup à l’unmount : abort() appelé, handlers détachés', () => {
    const { result, unmount } = renderHook(() => useSpeechDictation({ onTranscript: vi.fn() }))

    act(() => result.current.toggle())
    const rec = instances[0]!

    unmount()

    expect(rec.abort).toHaveBeenCalledTimes(1)
    expect(rec.onresult).toBeNull()
    expect(rec.onend).toBeNull()
  })
})
