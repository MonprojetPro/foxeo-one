import JSZip from 'jszip'
import type { ExportedFile } from '../actions/export-lab-documents'
import type { ExportedBrief } from '../actions/export-lab-briefs'
import type { ExportedChat } from '../../elio/actions/export-lab-chats'

interface BuildLabZipInput {
  files: ExportedFile[]
  briefs: ExportedBrief[]
  chats: ExportedChat[]
  prd: string | null
  clientName: string
}

export async function buildLabZip(input: BuildLabZipInput): Promise<Buffer> {
  const zip = new JSZip()

  // Add documents
  for (const file of input.files) {
    zip.file(file.path, file.buffer)
  }

  // Add briefs as Markdown
  for (const brief of input.briefs) {
    zip.file(brief.path, brief.content)
  }

  // Add chat transcripts
  for (const chat of input.chats) {
    zip.file(chat.path, chat.content)
  }

  // Add PRD if available
  if (input.prd) {
    zip.file('PRD.md', input.prd)
  }

  // Add README
  const readme = [
    `# Export Lab — ${input.clientName}`,
    '',
    `*Généré le ${new Date().toLocaleDateString('fr-FR')}*`,
    '',
    '## Contenu',
    '',
    `- **Documents** : ${input.files.length} fichier(s) dans \`/documents/\``,
    `- **Briefs** : ${input.briefs.length} brief(s) dans \`/briefs/\``,
    `- **Conversations Élio** : ${input.chats.length} transcript(s) dans \`/chats/\``,
    input.prd ? '- **PRD consolidé** : `PRD.md` à la racine' : '',
    '',
    '## Questions ?',
    '',
    'Contactez contact@monprojet-pro.com pour toute question.',
    '',
  ].filter(Boolean).join('\n')

  zip.file('README.md', readme)

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return zipBuffer
}
