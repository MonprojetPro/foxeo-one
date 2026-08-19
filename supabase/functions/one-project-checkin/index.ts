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
// Fréquence et activation : table system_config, clé `elio_one_checkin`. Jamais en dur —
// MiKL doit pouvoir couper ou espacer sans redéploiement.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const DEFAULT_IDLE_DAYS = 14
const DEFAULT_COOLDOWN_DAYS = 14

const ONE_CHECKIN_SYSTEM_PROMPT =
  "Tu es Élio, l'assistant du dashboard One de MonprojetPro : l'outil métier quotidien d'un entrepreneur, sa console de pilotage de ses livrables et son lien permanent avec MiKL. Tu es une extension de MiKL auprès du client. Tu écris un court mot proactif (tutoiement) qui prend des nouvelles de son PROJET — pas seulement de son outil — et lui rappelles que tu es là s'il a besoin d'aide pour utiliser sa plateforme. Règles STRICTES : 1 à 2 phrases maximum ; ton chaleureux mais sobre, jamais culpabilisant ni commercial ; pas de markdown, pas de liste, pas de guillemets autour du message ; tu n'inventes AUCUN fait sur son projet, son outil ou son activité — tu ne sais rien de plus que ce qui est écrit ci-dessous. Réponds uniquement avec le mot d'Élio, rien d'autre."

interface Candidate {
  client_id: string
  auth_user_id: string
  client_name: string
  idle_days: number
}

interface CheckinConfig {
  enabled: boolean
  idle_days: number
  cooldown_days: number
}

/** Message déterministe si l'IA échoue / dépasse le délai — jamais de bandeau vide. */
function fallback(): string {
  return "Coucou, c'est Élio 👋 Je prends juste de tes nouvelles : comment ça avance sur ton projet ? Et si tu bloques quelque part sur ton outil, dis-le-moi, je suis là."
}

async function generateCheckin(
  supabaseUrl: string,
  serviceKey: string,
  cand: Candidate,
): Promise<{ body: string; source: 'ai' | 'template' }> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/elio-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        systemPrompt: ONE_CHECKIN_SYSTEM_PROMPT,
        message: `Événement : cela fait environ ${cand.idle_days} jours qu'il n'y a pas eu d'échange avec ce client sur son dashboard One. Écris le mot d'Élio qui prend simplement de ses nouvelles sur l'avancée de son projet et lui propose ton aide s'il a une question sur l'utilisation de son outil. N'invente rien sur ce qu'il a fait ou pas fait entre-temps.`,
        model: HAIKU_MODEL,
        maxTokens: 160,
        temperature: 0.7,
      }),
    })
    if (!resp.ok) return { body: fallback(), source: 'template' }
    const json = await resp.json()
    const text = String(json?.content ?? '').trim()
    return text ? { body: text, source: 'ai' } : { body: fallback(), source: 'template' }
  } catch (_e) {
    return { body: fallback(), source: 'template' }
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
      const { body, source } = await generateCheckin(supabaseUrl, serviceKey, cand)

      // Bandeau accueil One (l'INSERT déclenche le broadcast → affichage en direct).
      const { error: wordError } = await supabase.from('client_concierge_messages').insert({
        client_id: cand.client_id,
        event_type: 'project_checkin',
        agent_label: null,
        body,
        source,
        dashboard_context: 'one',
      })

      // Sans le mot, la notification renverrait vers un bandeau inexistant : on saute.
      if (wordError) {
        console.error('[ONE:CHECKIN] client', cand.client_id, 'insert mot échoué', wordError)
        continue
      }

      const { error: notifError } = await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: cand.auth_user_id,
        type: 'system',
        title: "Élio prend de tes nouvelles",
        body,
        link: '/',
      })

      if (notifError) {
        console.error('[ONE:CHECKIN] client', cand.client_id, 'notification échouée', notifError)
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
