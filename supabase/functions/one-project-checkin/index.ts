// Edge Function : one-project-checkin (Élio One — extension de MiKL, 2026-08-19)
//
// Planifiée quotidiennement via pg_cron. Pour chaque client One actif dont on n'a pas pris
// de nouvelles depuis un moment (cf. RPC find_one_clients_for_checkin), Élio poste un mot
// PROACTIF qui prend des nouvelles du PROJET (pas seulement de l'outil) :
//   • un « mot d'Élio » sur-mesure (IA via elio-chat, fallback templaté) → accueil One,
//   • une notification in-app (cloche) → recipient_id = auth_user_id.
//
// Élio ne prévient JAMAIS MiKL depuis ici : si le client répond que ça ne va pas, c'est le
// chat (jeton [[prevenir-mikl:…]] + bouton d'accord) qui relaie — avec son consentement.
//
// 2026-08-20 — le mot est devenu une QUESTION : le bandeau One affiche deux boutons
// (« Oui, tout va bien » / « Non, pas trop »), et tant que le client n'a pas répondu, ce mot
// masque le précédent. Dès qu'il répond (RPC answer_one_checkin), le mot est marqué
// `answered_at` et le mot d'avant (livraison, évolution de l'outil) reprend sa place.
// D'où le `notification_id` posé ici : répondre éteint aussi le badge de la cloche.
//
// Fréquence et activation : table system_config, clé `elio_one_checkin`. Jamais en dur —
// MiKL doit pouvoir couper ou espacer sans redéploiement.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const DEFAULT_IDLE_DAYS = 14
const DEFAULT_COOLDOWN_DAYS = 14

// Réorienté le 2026-08-20 (décision MiKL) : le mot ne doit pas se contenter de « ça va ? ».
// Il porte le message « MiKL est là pour toi » — c'est la promesse du modèle Centaure, et la
// seule chose qui distingue vraiment ce dashboard d'un outil SaaS de plus. Le mot se termine
// donc TOUJOURS sur une porte ouverte concrète : les séances de coaching restantes quand il y
// en a, le chat vers MiKL sinon.
const ONE_CHECKIN_SYSTEM_PROMPT =
  "Tu es Élio, l'assistant du dashboard One de MonprojetPro : l'outil métier quotidien d'un entrepreneur, sa console de pilotage de ses livrables et son lien permanent avec MiKL. Tu es une extension de MiKL auprès du client — ton rôle ici est de lui rappeler qu'il n'est pas seul, que MiKL est là pour lui. Tu écris un court mot proactif (tutoiement) qui prend des nouvelles de son PROJET — pas seulement de son outil — et qui ouvre une porte concrète vers MiKL selon le contexte fourni. Règles STRICTES : 2 à 3 phrases maximum ; ton chaleureux mais sobre, jamais culpabilisant ni commercial ; ne demande jamais explicitement de cliquer sur un bouton (l'interface pose déjà la question) ; pas de markdown, pas de liste, pas de guillemets autour du message ; tu n'inventes AUCUN fait sur son projet, son outil, son activité ou ses séances — tu ne sais rien de plus que ce qui est écrit ci-dessous. Réponds uniquement avec le mot d'Élio, rien d'autre."

interface Candidate {
  client_id: string
  auth_user_id: string
  client_name: string
  idle_days: number
}

/** Contexte relationnel du client, qui oriente la porte ouverte du mot d'Élio. */
interface ClientContext {
  /** true = au moins une séance de coaching disponible au solde. */
  hasCoachingCredits: boolean
  coachingBalance: number
}

interface CheckinConfig {
  enabled: boolean
  idle_days: number
  cooldown_days: number
}

/**
 * Message déterministe si l'IA échoue / dépasse le délai — jamais de bandeau vide.
 * Deux variantes, exactement comme le prompt : la porte ouverte n'est pas la même selon
 * qu'il reste des séances de coaching ou non. Ne jamais promettre une séance à un client
 * qui n'en a pas : le fallback doit rester vrai en toutes circonstances.
 */
function fallback(ctx: ClientContext): string {
  if (ctx.hasCoachingCredits) {
    const s = ctx.coachingBalance > 1 ? 's' : ''
    return `Coucou, c'est Élio 👋 Je prends de tes nouvelles : comment ça avance sur ton projet ? Il te reste ${ctx.coachingBalance} séance${s} de coaching avec MiKL — n'hésite pas à en caler une si tu veux faire le point avec lui.`
  }
  return "Coucou, c'est Élio 👋 Je prends de tes nouvelles : comment ça avance sur ton projet ? Et si quelque chose ne va pas dans sa conduite, MiKL reste joignable à tout moment — écris-lui dans le chat, je fais le lien."
}

/**
 * Contexte relationnel du client. Le service_role bypasse la RLS : on somme directement le
 * ledger plutôt que d'appeler get_coaching_balance (dont l'EXECUTE est restreint owner/opérateur).
 * En cas de pépin, on retombe sur « pas de crédits » — le mot restera vrai, juste moins précis.
 */
async function loadClientContext(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
): Promise<ClientContext> {
  const neutral: ClientContext = { hasCoachingCredits: false, coachingBalance: 0 }

  try {
    // On interroge le LEDGER, jamais le tier : c'est le solde qui décide si on peut proposer
    // une séance. Se fier au tier ferait diverger le mot de la réalité dans les deux sens —
    // un One+ à sec s'entendrait proposer une séance qu'il n'a pas, et un ajustement manuel
    // de crédits sur un autre profil passerait inaperçu. (Attribution : elio_tier=one_plus
    // dans monthly-billing ; ici on ne veut que le fait vérifié.)
    const { data: ledger } = await supabase
      .from('coaching_credit_ledger')
      .select('delta')
      .eq('client_id', clientId)

    const balance = (ledger ?? []).reduce(
      (sum: number, row: { delta: number | null }) => sum + (row.delta ?? 0),
      0,
    )

    return { hasCoachingCredits: balance > 0, coachingBalance: balance }
  } catch (e) {
    console.error('[ONE:CHECKIN] contexte client', clientId, 'illisible (ignoré)', e)
    return neutral
  }
}

async function generateCheckin(
  supabaseUrl: string,
  serviceKey: string,
  cand: Candidate,
  ctx: ClientContext,
): Promise<{ body: string; source: 'ai' | 'template' }> {
  // La porte ouverte est DICTÉE, pas suggérée : c'est un fait vérifié en base, l'IA n'a pas
  // à décider si le client a des séances (elle inventerait).
  const doorway = ctx.hasCoachingCredits
    ? `Ce client est en offre One+ et il lui reste ${ctx.coachingBalance} séance(s) de coaching avec MiKL. Termine en lui rappelant qu'il peut en programmer une pour faire le point avec MiKL.`
    : `Ce client n'a pas de séance de coaching disponible. Termine en lui rappelant qu'il peut contacter MiKL à tout moment via le chat si quelque chose ne va pas dans la conduite de son projet.`

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/elio-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        systemPrompt: ONE_CHECKIN_SYSTEM_PROMPT,
        message: `Événement : cela fait environ ${cand.idle_days} jours qu'il n'y a pas eu d'échange avec ce client sur son dashboard One. Écris le mot d'Élio qui prend des nouvelles de l'avancée de son projet et lui rappelle que MiKL est là pour lui. ${doorway} N'invente rien sur ce qu'il a fait ou pas fait entre-temps.`,
        model: HAIKU_MODEL,
        maxTokens: 220,
        temperature: 0.7,
      }),
    })
    if (!resp.ok) return { body: fallback(ctx), source: 'template' }
    const json = await resp.json()
    const text = String(json?.content ?? '').trim()
    return text ? { body: text, source: 'ai' } : { body: fallback(ctx), source: 'template' }
  } catch (_e) {
    return { body: fallback(ctx), source: 'template' }
  }
}

serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Réglage MiKL (system_config). Absent / illisible → défauts prudents (14 jours).
  let config: CheckinConfig = {
    enabled: true,
    idle_days: DEFAULT_IDLE_DAYS,
    cooldown_days: DEFAULT_COOLDOWN_DAYS,
  }

  const { data: configRow } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'elio_one_checkin')
    .maybeSingle()

  if (configRow?.value) {
    const v = configRow.value as Partial<CheckinConfig>
    config = {
      enabled: v.enabled !== false,
      idle_days: typeof v.idle_days === 'number' && v.idle_days > 0 ? v.idle_days : DEFAULT_IDLE_DAYS,
      cooldown_days:
        typeof v.cooldown_days === 'number' && v.cooldown_days > 0
          ? v.cooldown_days
          : DEFAULT_COOLDOWN_DAYS,
    }
  }

  // Surcharge par le body (tests manuels uniquement — le cron n'envoie pas de body).
  try {
    const body = await req.json()
    if (typeof body?.p_idle_days === 'number') config.idle_days = body.p_idle_days
    if (typeof body?.p_cooldown_days === 'number') config.cooldown_days = body.p_cooldown_days
  } catch (_e) {
    // pas de body → config system_config
  }

  if (!config.enabled) {
    console.info('[ONE:CHECKIN] Désactivé par MiKL (system_config.elio_one_checkin.enabled=false)')
    return new Response(JSON.stringify({ disabled: true, processed: 0, sent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: candidates, error } = await supabase.rpc('find_one_clients_for_checkin', {
    p_idle_days: config.idle_days,
    p_cooldown_days: config.cooldown_days,
  })

  if (error) {
    console.error('[ONE:CHECKIN] RPC error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  for (const cand of (candidates ?? []) as Candidate[]) {
    try {
      const ctx = await loadClientContext(supabase, cand.client_id)
      const { body, source } = await generateCheckin(supabaseUrl, serviceKey, cand, ctx)

      // Bandeau accueil One (l'INSERT déclenche le broadcast → affichage en direct).
      // On récupère l'id : le client répondra à CE mot (RPC answer_one_checkin), et c'est
      // aussi lui qui portera le lien vers la notification pour l'éteindre à la réponse.
      const { data: word, error: wordError } = await supabase
        .from('client_concierge_messages')
        .insert({
          client_id: cand.client_id,
          event_type: 'project_checkin',
          agent_label: null,
          body,
          source,
          dashboard_context: 'one',
        })
        .select('id')
        .single()

      // Sans le mot, la notification renverrait vers un bandeau inexistant : on saute.
      if (wordError || !word) {
        console.error('[ONE:CHECKIN] client', cand.client_id, 'insert mot échoué', wordError)
        continue
      }

      const { data: notif, error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_type: 'client',
          recipient_id: cand.auth_user_id,
          type: 'system',
          title: 'Élio prend de tes nouvelles',
          body,
          link: '/',
        })
        .select('id')
        .single()

      if (notifError) {
        console.error('[ONE:CHECKIN] client', cand.client_id, 'notification échouée', notifError)
      }

      // Lien mot → notification : quand le client répondra, la RPC éteindra le badge de la
      // cloche. Un badge qui ne s'éteint pas quand l'événement est traité devient du décor.
      if (notif?.id) {
        const { error: linkError } = await supabase
          .from('client_concierge_messages')
          .update({ notification_id: notif.id })
          .eq('id', word.id)

        if (linkError) {
          console.error('[ONE:CHECKIN] client', cand.client_id, 'lien notif échoué', linkError)
        }
      }

      sent++
    } catch (e) {
      console.error('[ONE:CHECKIN] client', cand.client_id, 'échec (ignoré)', e)
    }
  }

  console.info(`[ONE:CHECKIN] ${(candidates ?? []).length} candidats, ${sent} mots envoyés`)
  return new Response(JSON.stringify({ processed: (candidates ?? []).length, sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
