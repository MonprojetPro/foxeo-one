/**
 * Nommage du document de transcription déposé dans le dossier du client — T-050.
 * Fonctions PURES : aucun accès réseau, aucun Supabase. Testables sans mock.
 */

/** Dossier d'accueil des transcriptions dans le dossier du client. */
export const TRANSCRIPT_FOLDER_NAME = 'Comptes rendus de visio'

/**
 * Nom lisible du document, tel que MiKL le verra dans l'onglet Documents.
 * Le titre de la visio ET la date : deux visios du même nom à deux dates
 * différentes doivent rester distinguables d'un coup d'œil.
 */
export function buildTranscriptDocumentName(
  meetingTitle: string,
  dateIso: string | null,
  extension: 'pdf' | 'txt' = 'pdf'
): string {
  const title = meetingTitle.trim() || 'Visio'
  const date = dateIso ? new Date(dateIso) : null
  const stamp =
    date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('fr-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Europe/Paris',
        }).format(date)
      : null

  return stamp
    ? `Transcription — ${title} — ${stamp}.${extension}`
    : `Transcription — ${title}.${extension}`
}

/**
 * Nom de fichier acceptable par Supabase Storage (ni accent, ni espace).
 * Même règle que `uploadDocument` : un chemin de stockage refusé fait échouer
 * l'upload APRÈS coup, avec un message qui ne dit pas que le nom est en cause.
 */
export function sanitizeStorageFileName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '') || 'transcription'
  )
}
