// ============================================================
// T-062 — parsing du fichier uploadé (liste de fonctions dev)
//
// Chaque ligne porte un nom de fonction et, en fin de ligne, un temps fourni
// DIRECTEMENT par MiKL (jamais estimé par l'IA — décision du 23-10) :
//   "Validation du formulaire de paiement — 2h"
//   "Export PDF multi-pages : 1.5j"
//   "Synchronisation calendrier Google"          (sans temps — à corriger ensuite)
// ============================================================

export type ParsedCiiLine = {
  functionName: string
  timeRaw: string | null
  timeDays: number | null
}

const HOURS_PER_DAY = 8

// Temps optionnellement précédé d'un séparateur (-, —, –, :), en fin de ligne.
const TRAILING_TIME_PATTERN = /[\s\-–—:]*([0-9]+(?:[.,][0-9]+)?)\s*(h|heures?|j|jours?)\.?\s*$/i

export function parseCiiFunctionsFile(rawContent: string): ParsedCiiLine[] {
  return rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseCiiFunctionLine)
}

function parseCiiFunctionLine(line: string): ParsedCiiLine {
  const match = line.match(TRAILING_TIME_PATTERN)

  if (!match) {
    return { functionName: line, timeRaw: null, timeDays: null }
  }

  const functionName = line.slice(0, match.index).trim()
  const amount = Number.parseFloat((match[1] ?? '0').replace(',', '.'))
  const unit = (match[2] ?? 'j').toLowerCase()
  const isHours = unit.startsWith('h')
  const timeDays = Math.round((isHours ? amount / HOURS_PER_DAY : amount) * 100) / 100

  return {
    // Ligne sans nom exploitable (que du temps) — on garde la ligne brute pour
    // que MiKL voie qu'il faut la corriger, plutôt que de perdre l'information.
    functionName: functionName.length > 0 ? functionName : line,
    timeRaw: match[0].trim(),
    timeDays,
  }
}
