import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// LOT C — Invitation Lab envoyée au LANCEMENT du parcours.
//
// Au lieu d'envoyer un mot de passe en clair (ancien pattern), on génère un lien
// d'invitation à usage unique (admin generateLink type 'recovery') que le client
// suit pour DÉFINIR lui-même son mot de passe, puis on envoie l'email branché
// welcome-lab (via l'Edge Function send-email + Resend) contenant ce lien.
//
// À n'appeler que côté serveur (Server Action) — nécessite le service role.
// Best-effort : l'appelant ne doit JAMAIS échouer si l'envoi échoue.

export interface SendWelcomeLabInviteParams {
  email: string
  clientName: string
  firstStepLabel: string
  /** Injectable pour les tests — sinon construit depuis les env vars service-role. */
  adminClient?: SupabaseClient
}

export interface SendWelcomeLabInviteResult {
  success: boolean
  error?: string
}

function buildAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function sendWelcomeLabInvite(
  params: SendWelcomeLabInviteParams
): Promise<SendWelcomeLabInviteResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const admin = params.adminClient ?? buildAdminClient()
  if (!admin || !supabaseUrl || !serviceKey) {
    return {
      success: false,
      error: 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant',
    }
  }

  const clientBase = process.env.NEXT_PUBLIC_CLIENT_URL ?? 'https://app.monprojet-pro.com'
  // /auth/callback = chemin PUBLIC (middleware) qui échange le code PKCE puis redirige
  // vers /reset-password où le client choisit son mot de passe. Même chemin que le
  // flux « mot de passe oublié » → mêmes URLs autorisées côté Supabase.
  const redirectTo = `${clientBase}/auth/callback?next=/reset-password`

  // 1. Lien d'invitation à usage unique — le client définit son mot de passe.
  let actionLink: string
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: params.email,
      options: { redirectTo },
    })
    const link = (data as { properties?: { action_link?: string } } | null)?.properties?.action_link
    if (error || !link) {
      return { success: false, error: error?.message ?? 'generateLink: action_link vide' }
    }
    actionLink = link
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }

  // 2. Email branché welcome-lab via l'Edge Function send-email (Resend).
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.email,
        template: 'welcome-lab',
        data: {
          clientName: params.clientName,
          firstStepLabel: params.firstStepLabel,
          activationLink: actionLink,
        },
      }),
    })
    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `send-email ${response.status}: ${text}` }
    }
    const json = (await response.json()) as { success?: boolean; error?: string }
    return { success: json.success === true, error: json.error }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
