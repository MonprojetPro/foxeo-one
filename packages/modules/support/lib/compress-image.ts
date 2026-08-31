// ============================================================
// Compression des images jointes avant upload (demande MiKL 2026-08-31)
// ============================================================
// GuardVeto n'a pas cette étape (nettoyé directement chez Supabase). Ici, on
// la fait CÔTÉ NAVIGATEUR, avant l'upload direct : une capture d'écran ou une
// photo de téléphone redimensionnée + réencodée en WebP prend une fraction de
// la place, sans passer par le serveur (donc sans jamais buter sur une limite
// de taille de requête).
//
// Formats volontairement exclus : GIF (l'animation serait détruite par un
// canvas), HEIC/HEIF (aucun navigateur ne sait les décoder dans un <canvas> —
// on les upload tels quels) et PDF (ce n'est pas une image).
//
// Toute erreur de compression retombe sur le fichier d'origine : mieux vaut
// un upload un peu plus lourd qu'un upload qui échoue à cause d'un bug de
// compression.

const COMPRESSIBLE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_DIMENSION = 1920
const QUALITY = 0.82

export async function compressImageIfPossible(file: File): Promise<File> {
  if (!COMPRESSIBLE_TYPES.has(file.type)) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY)
    )

    if (!blob || blob.size >= file.size) {
      // La compression n'a rien gagné (petite image déjà optimisée) — on
      // garde l'original plutôt que d'imposer un format différent pour rien.
      return file
    }

    const newName = file.name.replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], newName, { type: 'image/webp' })
  } catch (error) {
    console.warn('[SUPPORT:COMPRESS] Compression ignorée, fichier original conservé :', error)
    return file
  }
}
