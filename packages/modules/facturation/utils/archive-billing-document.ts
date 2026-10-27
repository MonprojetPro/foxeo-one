import { pennylaneClient } from '../config/pennylane'

// ============================================================
// archiveBillingDocumentAsDocument — T-063b
//
// Jusqu'ici aucun devis/facture n'etait archive dans `documents` : le PDF
// n'existait que chez Pennylane. Verifie (pas suppose) avant d'ecrire ce
// fichier : les reponses de creation de devis/facture portent deja un lien
// PDF direct — `public_file_url` (devis) / `file_url` (facture), voir
// `billing-mappers.ts`. Pas besoin d'un nouvel endpoint Pennylane.
//
// Le PDF n'est pas toujours pret a l'instant de la creation (meme delai
// que pour `send_by_email`, deja gere par `send-by-email-with-retry.ts`) —
// on retente donc une relecture du document le temps qu'il se genere.
//
// Best-effort, comme `archiveValidatedBriefAsDocument` (validation-hub) :
// une erreur ici ne doit JAMAIS faire echouer la creation du devis/facture,
// qui est deja actee cote Pennylane a ce stade.
// ============================================================

type SupabaseServerClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: ArrayBuffer,
        options: { contentType: string; upsert: boolean }
      ) => Promise<{ error: { message: string } | null }>
      remove: (paths: string[]) => Promise<unknown>
    }
  }
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }
}

export type BillingDocumentKind = 'quote' | 'invoice'

export interface ArchiveBillingDocumentInput {
  supabase: SupabaseServerClient
  clientId: string
  operatorId: string
  kind: BillingDocumentKind
  pennylaneId: string
  /** Numero affiche par Pennylane (quote_number / invoice_number) — pour nommer le fichier. */
  documentNumber: string | null
}

const MAX_RETRIES = 4
const BASE_DELAY_MS = 2000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/** Relit le document chez Pennylane jusqu'a ce que son PDF soit genere, ou abandonne. */
async function fetchPennylaneFileUrl(kind: BillingDocumentKind, pennylaneId: string): Promise<string | null> {
  const resource = kind === 'quote' ? 'quotes' : 'customer_invoices'
  const urlField = kind === 'quote' ? 'public_file_url' : 'file_url'

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await pennylaneClient.get<Record<string, unknown>>(`/${resource}/${pennylaneId}`)
    if (!result.error && result.data) {
      const url = result.data[urlField]
      if (typeof url === 'string' && url.trim() !== '') return url
    }
    if (attempt < MAX_RETRIES) await sleep(BASE_DELAY_MS * attempt)
  }
  return null
}

export async function archiveBillingDocumentAsDocument(input: ArchiveBillingDocumentInput): Promise<void> {
  try {
    const fileUrl = await fetchPennylaneFileUrl(input.kind, input.pennylaneId)
    if (!fileUrl) {
      console.warn(
        `[FACTURATION:ARCHIVE] PDF pas disponible apres ${MAX_RETRIES} tentatives pour ${input.kind} ${input.pennylaneId} — non archive`
      )
      return
    }

    const response = await fetch(fileUrl)
    if (!response.ok) {
      console.warn(`[FACTURATION:ARCHIVE] Telechargement du PDF echoue (${response.status})`)
      return
    }
    const body = await response.arrayBuffer()

    const label = input.kind === 'quote' ? 'Devis' : 'Facture'
    const baseName = sanitizeFilename(`${label}${input.documentNumber ? ` ${input.documentNumber}` : ''}`).slice(0, 80)
    const fileName = `${baseName || label}.pdf`
    const storagePath = `${input.operatorId}/${input.clientId}/${crypto.randomUUID()}-${fileName}`

    const { error: uploadError } = await input.supabase.storage
      .from('documents')
      .upload(storagePath, body, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      console.error('[FACTURATION:ARCHIVE] Storage error:', uploadError)
      return
    }

    const { error: insertError } = await input.supabase.from('documents').insert({
      client_id: input.clientId,
      operator_id: input.operatorId,
      name: fileName,
      file_path: storagePath,
      file_type: 'pdf',
      file_size: body.byteLength,
      visibility: 'shared',
      uploaded_by: 'operator',
      tags: ['Facturation', label],
    })

    if (insertError) {
      console.error('[FACTURATION:ARCHIVE] DB insert error:', insertError)
      await input.supabase.storage.from('documents').remove([storagePath])
    }
  } catch (err) {
    console.error('[FACTURATION:ARCHIVE] Unexpected error:', err)
  }
}
