// [VISIO:CALCOM_WEBHOOK] Demande d'un lien Google Meet au Hub — T-049 (volet ①)
// Séparé de index.ts pour testabilité Vitest (pas d'import Deno ici).

export interface MeetLinkResult {
  meetSpaceName?: string
  meetUri?: string
}

export interface RequestMeetLinkConfig {
  /** CALCOM_MEET_LINK_SECRET — absent = route désactivée, jamais bloquant. */
  secret: string | undefined
  hubUrl: string
  fetchImpl: typeof fetch
}

/**
 * Demande un lien Google Meet au Hub — JAMAIS bloquant : un RDV pris via
 * Cal.com doit exister même si Google refuse ou si le secret n'est pas
 * encore posé. Avant ce correctif, `meet_uri` restait NULL dans 100% des cas
 * (vérifié : les 6 meetings archivés + les 0 meetings réels issus de Cal.com
 * n'en portaient aucun) — le client n'avait alors AUCUN moyen de rejoindre
 * son RDV depuis MonprojetPro.
 *
 * 🔑 POURQUOI UN APPEL HTTP ET PAS LA LOGIQUE GOOGLE ICI : les secrets Google
 * vivent sur Vercel (Hub), pas dans les secrets de cette Edge Function — les
 * dupliquer multiplierait les endroits où un jeton peut mourir sans qu'on le
 * voie (même raison que la route `/api/cron/sync-meeting-results`, T-050).
 * On appelle donc la MÊME brique (`createGoogleMeetSpace`) via une route Next
 * dédiée, protégée par un secret partagé.
 */
export async function requestMeetLink(config: RequestMeetLinkConfig): Promise<MeetLinkResult> {
  if (!config.secret) {
    console.error('[VISIO:CALCOM_WEBHOOK] CALCOM_MEET_LINK_SECRET absent — meeting créé SANS lien Meet')
    return {}
  }

  try {
    const res = await config.fetchImpl(`${config.hubUrl}/api/internal/calcom-meet-link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.secret}` },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[VISIO:CALCOM_WEBHOOK] Lien Meet refusé (HTTP ${res.status}), meeting créé SANS lien:`, body)
      return {}
    }

    const json = await res.json()
    return { meetSpaceName: json.data?.meetSpaceName, meetUri: json.data?.meetUri }
  } catch (err) {
    console.error('[VISIO:CALCOM_WEBHOOK] Appel Hub échoué, meeting créé SANS lien Meet:', err)
    return {}
  }
}
