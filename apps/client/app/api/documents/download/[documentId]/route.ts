import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

// Téléchargement du fichier réel d'un document (ex : brief .md archivé), côté app client.
// Même logique que la route Hub : la RLS garantit que le client n'accède qu'à ses documents
// (uploads perso + documents partagés). Signed URL Storage 60s puis buffer complet.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params

  /**
   * `?inline=1` → le navigateur AFFICHE le fichier au lieu de le télécharger.
   *
   * Pourquoi ça compte (constaté le 16-10) : pour consulter une transcription
   * de visio, MiKL n'avait aucun moyen d'ouvrir le document — la seule chose
   * cliquable sur la ligne était le badge de partage, qu'il a donc cliqué.
   * Le compte rendu est parti chez le client sans qu'il le veuille. Un
   * document qu'on ne peut pas ouvrir pousse à cliquer sur autre chose.
   */
  const inline = req.nextUrl.searchParams.get('inline') === '1'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Non autorisé', { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('file_path, name, file_type')
    .eq('id', documentId)
    .single()

  if (!doc) return new NextResponse('Document introuvable', { status: 404 })

  const { data: urlData } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 60)

  if (!urlData?.signedUrl) return new NextResponse('Erreur URL', { status: 500 })

  // Charger le fichier en buffer complet (plus fiable que le streaming en Next.js)
  const fileRes = await fetch(urlData.signedUrl)
  if (!fileRes.ok) return new NextResponse('Fichier introuvable', { status: 404 })

  const buffer = await fileRes.arrayBuffer()
  const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream'
  const filename = encodeURIComponent(doc.name)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${filename}`,
      'Content-Length': buffer.byteLength.toString(),
    },
  })
}
