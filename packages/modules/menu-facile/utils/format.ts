/**
 * Helpers d'affichage du cockpit MenuFacile.
 *
 * Règle transverse : le guichet renvoie `null` pour « non calculable » et un
 * nombre pour une vraie valeur (y compris 0). L'affichage doit donc distinguer
 * les deux — jamais de `?? 0` qui ferait passer « inconnu » pour « zéro ».
 */

/** Nombre formaté en français ; « — » si la donnée n'est pas calculable. */
export function num(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString('fr-FR')
}

/** Date courte (12 janv. 2026) ; « — » si absente ou illisible. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Date + heure complètes, pour les infobulles. */
export function fullDate(iso: string | null | undefined): string {
  if (!iso) return 'Donnée non disponible'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? 'Date illisible' : d.toLocaleString('fr-FR')
}

/**
 * Ancienneté lisible : « à l'instant », « il y a 3 h », « il y a 12 j »…
 * Le guichet renvoie des dates en `+00:00` (et non `Z`) : `new Date()` les
 * interprète correctement, aucun traitement particulier n'est nécessaire.
 */
export function relativeDate(iso: string | null | undefined): string {
  if (!iso) return 'jamais'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'

  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 31) return `il y a ${days} j`

  const months = Math.floor(days / 30)
  if (months < 12) return `il y a ${months} mois`

  return `il y a ${Math.floor(months / 12)} an${months >= 24 ? 's' : ''}`
}

/**
 * Sérialise des lignes en CSV (séparateur `;`, lu nativement par Excel FR).
 * Le BOM UTF-8 est ajouté à l'écriture du fichier, pas ici.
 */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(cell).join(';'), ...rows.map((r) => r.map(cell).join(';'))].join('\r\n')
}

/** Déclenche le téléchargement d'un CSV dans le navigateur (BOM inclus). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
