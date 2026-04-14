'use client'

/**
 * Extrait le contenu textuel d'un fichier uploadé.
 * Supporte : texte brut, PDF, Word (.docx)
 * Retourne { text, error }
 */
export async function readFileContent(
  file: File
): Promise<{ text: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

  // ── Fichiers texte brut ─────────────────────────────────────────────────────
  const textTypes = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'js', 'ts', 'py', 'yaml', 'yml']
  if (textTypes.includes(ext) || file.type.startsWith('text/')) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve({ text: ev.target?.result as string, error: null })
      reader.onerror = () => resolve({ text: null, error: 'Erreur de lecture du fichier' })
      reader.readAsText(file)
    })
  }

  // ── PDF ─────────────────────────────────────────────────────────────────────
  // Le PDF est transmis tel quel à Claude (API documents) qui le lit nativement.
  // Pas d'extraction texte côté client — on retourne juste un marqueur.
  if (ext === 'pdf' || file.type === 'application/pdf') {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      text: `[Document PDF : ${file.name} (${sizeMb} Mo) — contenu transmis à Élio pour analyse]`,
      error: null,
    }
  }

  // ── Word (.docx) ────────────────────────────────────────────────────────────
  if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      const text = result.value.trim()
      if (!text) return { text: null, error: 'Document Word vide ou non lisible' }
      return { text, error: null }
    } catch {
      return { text: null, error: 'Erreur lors de la lecture du fichier Word' }
    }
  }

  return {
    text: null,
    error: `Format ".${ext}" non supporté — formats acceptés : txt, md, pdf, docx, csv, json`,
  }
}
