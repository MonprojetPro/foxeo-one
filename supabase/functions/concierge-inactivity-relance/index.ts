// Edge Function : concierge-inactivity-relance (LOT F, Incrément 3)
// Planifiée quotidiennement via pg_cron. Pour chaque client inactif sur son parcours
// (cf. RPC find_inactive_parcours_clients), Élio le Concierge poste une RELANCE proactive :
//   • un « mot d'Élio » sur-mesure (IA Haiku via elio-chat, fallback templaté) → bandeau parcours,
//   • une notification in-app (cloche) → recipient_id = auth_user_id (schéma notifications actuel).
//
// Anti-spam : la détection exclut déjà les clients ayant reçu un mot d'Élio récent (cooldown).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const IDLE_DAYS = 7
const COOLDOWN_DAYS = 7

const CONCIERGE_SYSTEM_PROMPT =
  "Tu es Élio, le Concierge du Lab MonprojetPro : l'assistant qui accompagne un entrepreneur dans son parcours d'incubation, comme un vrai partenaire de projet. Tu écris une courte relance proactive et BIENVEILLANTE (tutoiement), jamais culpabilisante. Règles STRICTES : 1 à 2 phrases maximum ; pas de markdown, pas de guillemets autour du message ; tu te bases UNIQUEMENT sur l'information donnée et tu n'inventes rien. Réponds uniquement avec le mot d'Élio, rien d'autre."

interface Candidate {
  client_id: string
  auth_user_id: string
  agent_label: string
  idle_days: number
}

function fallback(agentLabel: string): string {
  return `Coucou, c'est Élio 👋 Ça fait quelques jours qu'on n'a pas avancé ensemble sur « ${agentLabel} ». Aucune pression — reprends quand tu veux, je suis là dès que tu reviens.`
}

async function generateRelance(
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
        systemPrompt: CONCIERGE_SYSTEM_PROMPT,
        message: `Événement : le client n'a pas avancé sur l'étape « ${cand.agent_label} » de son parcours depuis environ ${cand.idle_days} jours. Écris une relance douce d'Élio qui prend de ses nouvelles et l'invite à reprendre cette étape quand il le souhaite, sans le culpabiliser.`,
        model: HAIKU_MODEL,
        maxTokens: 160,
        temperature: 0.7,
      }),
    })
    if (!resp.ok) return { body: fallback(cand.agent_label), source: 'template' }
    const json = await resp.json()
    const text = String(json?.content ?? '').trim()
    return text
      ? { body: text, source: 'ai' }
      : { body: fallback(cand.agent_label), source: 'template' }
  } catch (_e) {
    return { body: fallback(cand.agent_label), source: 'template' }
  }
}

serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Seuils paramétrables (pour tests). Le cron n'envoie pas de body → défauts 7/7.
  let idleDays = IDLE_DAYS
  let cooldownDays = COOLDOWN_DAYS
  try {
    const body = await req.json()
    if (typeof body?.p_idle_days === 'number') idleDays = body.p_idle_days
    if (typeof body?.p_cooldown_days === 'number') cooldownDays = body.p_cooldown_days
  } catch (_e) {
    // pas de body → défauts
  }

  const { data: candidates, error } = await supabase.rpc('find_inactive_parcours_clients', {
    p_idle_days: idleDays,
    p_cooldown_days: cooldownDays,
  })

  if (error) {
    console.error('[CONCIERGE:RELANCE] RPC error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  for (const cand of (candidates ?? []) as Candidate[]) {
    try {
      const { body, source } = await generateRelance(supabaseUrl, serviceKey, cand)

      // Bandeau parcours (déclenche le broadcast → mise à jour en direct si le client est en ligne).
      await supabase.from('client_concierge_messages').insert({
        client_id: cand.client_id,
        event_type: 'inactivity_relance',
        agent_label: cand.agent_label,
        body,
        source,
      })

      // Notification in-app (cloche) — schéma actuel : recipient_id = auth_user_id.
      await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: cand.auth_user_id,
        type: 'system',
        title: "Élio t'a laissé un mot",
        body,
        link: '/modules/parcours',
      })

      sent++
    } catch (e) {
      console.error('[CONCIERGE:RELANCE] client', cand.client_id, 'échec (ignoré)', e)
    }
  }

  console.info(`[CONCIERGE:RELANCE] ${(candidates ?? []).length} inactifs, ${sent} relances envoyées`)
  return new Response(JSON.stringify({ processed: (candidates ?? []).length, sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
