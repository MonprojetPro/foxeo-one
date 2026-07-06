'use client'

/**
 * Dictée vocale via Web Speech API (chantier Élio Hub 2026-07-06).
 *
 * Branché sur les boutons micro du widget sidebar (elio-query-box) et du chat
 * plein écran Hub (elio-chat). Support navigateur : Chrome / Edge / Safari
 * (webkitSpeechRecognition). Firefox ne supporte pas l'API → isSupported=false,
 * les consommateurs masquent le bouton micro.
 *
 * Les types SpeechRecognition ne font pas partie de lib DOM standard de
 * TypeScript : ils sont déclarés localement ci-dessous (sous-ensemble utilisé).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types Web Speech API (sous-ensemble — absents de lib.dom.d.ts) ───────────

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

export interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

interface WindowWithSpeechRecognition {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as WindowWithSpeechRecognition
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// ── Logique extraite (testable sans navigateur) ───────────────────────────────

/**
 * Concatène les segments FINAUX d'un événement `result` (les interimResults
 * sont ignorés — seuls les segments validés par le moteur sont dictés).
 */
export function extractFinalTranscript(event: SpeechRecognitionEventLike): string {
  let text = ''
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i]
    if (result?.isFinal && result[0]) {
      text += result[0].transcript
    }
  }
  return text.trim()
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseSpeechDictationOptions {
  /** Appelé avec chaque segment FINAL dicté (déjà trimé, jamais vide). */
  onTranscript: (text: string) => void
  /** Langue de reconnaissance — défaut fr-FR. */
  lang?: string
}

export interface UseSpeechDictationResult {
  /** false sur Firefox et tout navigateur sans Web Speech API → masquer le bouton. */
  isSupported: boolean
  isListening: boolean
  /** Démarre / arrête l'écoute. */
  toggle: () => void
  /** Message d'erreur discret (permission refusée, panne du service) — null sinon. */
  error: string | null
}

export function useSpeechDictation({
  onTranscript,
  lang = 'fr-FR',
}: UseSpeechDictationOptions): UseSpeechDictationResult {
  // Constructeur résolu une seule fois côté client (null en SSR → re-résolu au mount).
  const [isSupported, setIsSupported] = useState<boolean>(() => getSpeechRecognitionConstructor() !== null)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Latest-ref : le callback consommateur change à chaque render — on garde la
  // dernière version sans recréer l'instance de reconnaissance.
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  // SSR : le state initial est false côté serveur ; on re-vérifie au mount.
  useEffect(() => {
    setIsSupported(getSpeechRecognitionConstructor() !== null)
  }, [])

  // Cleanup à l'unmount : on coupe le micro sans déclencher les callbacks.
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current
      if (rec) {
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        try {
          rec.abort()
        } catch {
          /* déjà arrêté */
        }
        recognitionRef.current = null
      }
    }
  }, [])

  const toggle = useCallback(() => {
    // Arrêt demandé
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch {
        /* déjà arrêté */
      }
      setIsListening(false)
      return
    }

    // Démarrage
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      setIsSupported(false)
      return
    }

    setError(null)

    let recognition = recognitionRef.current
    if (!recognition) {
      recognition = new Ctor()
      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event) => {
        const finalText = extractFinalTranscript(event)
        if (finalText) onTranscriptRef.current(finalText)
      }

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Accès au micro refusé — autorise le microphone dans ton navigateur.')
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError('La dictée vocale a rencontré un problème. Réessaie.')
        }
        setIsListening(false)
      }

      // Le moteur peut s'arrêter tout seul (silence prolongé) : refléter l'état.
      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    try {
      recognition.start()
      setIsListening(true)
    } catch {
      // start() jette si déjà démarré — on resynchronise l'état.
      setIsListening(true)
    }
  }, [isListening, lang])

  return { isSupported, isListening, toggle, error }
}
