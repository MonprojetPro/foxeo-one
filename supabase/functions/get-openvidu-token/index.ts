// Edge Function: get-openvidu-token
// Sécurise l'accès à OpenVidu — le secret ne quitte jamais le serveur

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // CORS — restreindre aux domaines MonprojetPro
  const allowedOrigins = [
    'https://hub.monprojet-pro.com',
    'https://lab.monprojet-pro.com',
    Deno.env.get('CORS_ALLOWED_ORIGIN') ?? 'http://localhost:3000',
  ]
  const origin = req.headers.get('Origin') ?? ''
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.monprojet-pro.com')
  const corsOrigin = isAllowed ? origin : allowedOrigins[0]

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let meetingId: string
  try {
    const body = await req.json()
    meetingId = body.meetingId
    if (!meetingId) throw new Error('meetingId requis')
  } catch {
    return jsonResponse({ error: 'meetingId requis' }, 400)
  }

  // Vérifier accès au meeting via RLS
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id, session_id, status')
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    return jsonResponse({ error: 'Meeting non trouvé' }, 404)
  }

  if (meeting.status === 'completed' || meeting.status === 'cancelled') {
    return jsonResponse({ error: 'Meeting terminé ou annulé' }, 400)
  }

  const openviduUrl = Deno.env.get('OPENVIDU_URL')!
  const openviduSecret = Deno.env.get('OPENVIDU_SECRET')!
  const sessionId = meeting.session_id || `session-${meetingId}`
  const authHeader = `Basic ${btoa(`OPENVIDUAPP:${openviduSecret}`)}`

  // Créer session OpenVidu (idempotent si déjà existante)
  await fetch(`${openviduUrl}/openvidu/api/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customSessionId: sessionId }),
  })

  // Créer connexion (token)
  const tokenRes = await fetch(`${openviduUrl}/openvidu/api/sessions/${sessionId}/connection`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  if (!tokenRes.ok) {
    return jsonResponse({ error: 'Erreur OpenVidu' }, 502)
  }

  const tokenData = await tokenRes.json()

  // Mettre à jour session_id si nécessaire
  if (!meeting.session_id) {
    await supabase
      .from('meetings')
      .update({ session_id: sessionId })
      .eq('id', meetingId)
  }

  return jsonResponse({ token: tokenData.token, sessionId })
})
