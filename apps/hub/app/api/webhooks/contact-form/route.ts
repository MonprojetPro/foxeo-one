// API Route: /api/webhooks/contact-form
// Reçoit les soumissions du formulaire de contact du site
// POST → upsert fiche client prospect dans Hub
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Mapping type_projet (formulaire site) → project_type DB
const PROJECT_TYPE_MAP: Record<string, string> = {
  'coaching': 'coaching',
  'dev': 'dev',
  'coaching_dev': 'coaching_dev',
  'exchange': 'exchange',
  'other': 'other',
  // Labels formulaire texte libre
  'Coaching de projet': 'coaching',
  'Développement sur mesure': 'dev',
  'Les deux': 'coaching_dev',
  'Simple échange': 'exchange',
  'Autre': 'other',
}

interface ContactFormPayload {
  name: string
  email: string
  phone?: string
  company?: string
  project_type?: string
  message?: string
  // Token HMAC optionnel pour sécuriser l'endpoint
  _token?: string
}

async function verifyToken(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.CONTACT_FORM_WEBHOOK_SECRET
  if (!secret) return true // Dev : accepte tout si pas de secret configuré

  const token = req.headers.get('x-contact-token')
  if (!token) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return token === expected
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    const valid = await verifyToken(req, body)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const payload: ContactFormPayload = JSON.parse(body)

    if (!payload.name || !payload.email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
    }

    // Service role — bypass RLS pour créer le prospect
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Trouver l'opérateur (setup mono-opérateur)
    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .limit(1)
      .single()

    if (!operator) {
      console.error('[CONTACT_FORM_WEBHOOK] No operator found')
      return NextResponse.json({ error: 'Operator not found' }, { status: 500 })
    }

    // Décomposer le nom
    const fullName = payload.name.trim()
    const parts = fullName.split(' ')
    const firstName = parts.length > 1 ? parts[0] : null
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : fullName

    const projectTypeRaw = payload.project_type ?? null
    const projectType = projectTypeRaw
      ? (PROJECT_TYPE_MAP[projectTypeRaw] ?? 'other')
      : null

    // Vérifier si ce prospect existe déjà (email unique par opérateur)
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('operator_id', operator.id)
      .eq('email', payload.email)
      .maybeSingle()

    if (!existing) {
      // Créer la fiche prospect
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          operator_id: operator.id,
          first_name: firstName,
          name: lastName,
          company: payload.company ?? fullName,
          email: payload.email,
          phone: payload.phone ?? null,
          client_type: 'complet',
          status: 'prospect',
          prospect_stage: 'nouveau',
          project_type: projectType,
          lead_message: payload.message ?? null,
          // hub_seen_at NULL → badge Nouveau sur Hub
        })
        .select('id')
        .single()

      if (clientError) {
        console.error('[CONTACT_FORM_WEBHOOK] Client insert error:', clientError)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }

      if (newClient) {
        // Activity log
        await supabase.from('activity_logs').insert({
          actor_type: 'system',
          actor_id: operator.id,
          action: 'prospect_created',
          entity_type: 'client',
          entity_id: newClient.id,
          metadata: { source: 'contact_form' },
        })

        // client_configs minimal
        await supabase.from('client_configs').insert({
          client_id: newClient.id,
          active_modules: [],
          dashboard_type: 'one',
        })
      }
    } else {
      // Prospect existant → mettre à jour lead_message si vide
      await supabase
        .from('clients')
        .update({
          lead_message: payload.message ?? null,
          project_type: projectType ?? undefined,
        })
        .eq('id', existing.id)
        .is('lead_message', null)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[CONTACT_FORM_WEBHOOK] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
