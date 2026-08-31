// ============================================================
// Ce qu'une pièce jointe de signalement a le droit d'être
// ============================================================
// Repris du pattern GuardVeto (src/lib/support/contraintes.ts) à la demande
// de MiKL le 2026-08-31 — jusqu'à 3 pièces jointes par signalement.
//
// Fichier partagé navigateur/composant : le formulaire refuse poliment avec
// ces valeurs, le bucket Supabase refuse fermement avec les MÊMES (migration
// 00137_screenshots_bucket_multi_format.sql). Si l'une des deux bouge,
// l'autre doit bouger le même jour.

/** 10 Mo par fichier, avant compression. Identique à `file_size_limit` du bucket. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

/** Trois pièces jointes. Identique à la contrainte `cardinality(...) <= 3` en base. */
export const MAX_ATTACHMENTS = 3

/**
 * `image/heic` et `image/heif` : format par défaut des photos d'iPhone.
 * Les oublier revient à refuser la capture d'écran de la moitié des clients
 * sans le leur dire.
 */
export const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const

/** Ce que l'attribut `accept` d'un `<input type="file">` attend. */
export const ACCEPT_HTML = ACCEPTED_TYPES.join(',')

/** « 3,4 Mo », jamais « 3565158 octets ». */
export function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

/** Le refus d'un fichier, en français, ou `null` s'il passe. */
export function rejectFile(file: { name: string; size: number; type: string }): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return `« ${file.name} » n'est pas un format accepté. Envoie une image (capture d'écran, photo) ou un PDF.`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `« ${file.name} » est trop lourd (${readableSize(file.size)}, limite ${readableSize(MAX_FILE_BYTES)}).`
  }
  if (file.size === 0) {
    return `« ${file.name} » est vide.`
  }
  return null
}

/**
 * Le nom d'un fichier, ramené à ce qu'un chemin de stockage Supabase accepte
 * (accents, espaces et apostrophes y sont refusés ou mutilés en silence).
 */
export function sanitizeFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : 'bin'

  const clean = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase()

  const cleanExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  return `${clean || 'fichier'}.${cleanExt}`
}
