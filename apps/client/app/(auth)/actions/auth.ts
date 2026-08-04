'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient, buildHubHandoffLink } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  type UserSession,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { getClientAppUrl } from '@monprojetpro/utils'
import { loginSchema, signupSchema, forgotPasswordSchema } from './schemas'

// --- Server Actions ---

/**
 * Résultat du login — l'entrée est unique, la destination ne l'est pas.
 * `client` : on reste sur place (Lab ou One selon le compte).
 * `operator` : on repart vers le Hub via un jeton de bascule à usage unique.
 */
type LoginOutcome =
  | ({ kind: 'client' } & UserSession)
  | { kind: 'operator'; handoffUrl: string }

export async function loginAction(
  formData: FormData
): Promise<ActionResponse<LoginOutcome>> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Donnees invalides',
      'VALIDATION_ERROR',
      parsed.error.flatten()
    )
  }

  const { email, password } = parsed.data
  const supabase = await createServerSupabaseClient()

  // Check brute force protection via SECURITY DEFINER function
  const { data: lockout } = await supabase.rpc('fn_check_login_attempts', {
    p_email: email,
  } as never) as { data: { blocked: boolean; remainingSeconds: number } | null }

  if (lockout?.blocked) {
    const minutes = Math.ceil(lockout.remainingSeconds / 60)
    return errorResponse(
      `Trop de tentatives. Reessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      'RATE_LIMITED',
      { remainingSeconds: lockout.remainingSeconds }
    )
  }

  // Attempt sign in
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  // Get IP for recording attempt
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  if (authError || !authData.user) {
    await supabase.rpc('fn_record_login_attempt', {
      p_email: email,
      p_ip_address: ip,
      p_success: false,
    } as never)
    return errorResponse(
      'Email ou mot de passe incorrect',
      'AUTH_ERROR'
    )
  }

  // Record successful login
  await supabase.rpc('fn_record_login_attempt', {
    p_email: email,
    p_ip_address: ip,
    p_success: true,
  } as never)

  // --- Entrée de connexion unique (décision MiKL du 2026-08-03) ---
  //
  // Cette page est la SEULE porte d'entrée : clients et opérateur y saisissent le même
  // formulaire. Un opérateur doit repartir vers le Hub, qui vit sur un autre
  // sous-domaine et ne partage aucun cookie — d'où le jeton de bascule à usage unique.
  //
  // Résolution par auth_user_id, jamais par email (deux sources non synchronisées).
  // La policy RLS `operators_select_merged` fait le tri toute seule : un client lit
  // zéro ligne ici, et rien ne lui indique que la question a été posée.
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle()

  if (operator) {
    const handoff = await buildHubHandoffLink({ email: authData.user.email ?? email })

    // Scope 'local' : on referme CETTE session (un opérateur n'a pas de ligne dans
    // `clients`, elle ne lui sert à rien ici) sans toucher à ses autres sessions.
    // Un signOut global révoquerait les refresh tokens et déconnecterait le Hub
    // déjà ouvert dans un autre onglet — le piège d'avril 2026.
    await supabase.auth.signOut({ scope: 'local' })

    if (handoff.error) {
      console.error('[LOGIN:HANDOFF] Génération du lien Hub échouée:', handoff.error)
      return errorResponse(
        "Connexion au cockpit indisponible. Réessayez dans un instant.",
        'HUB_HANDOFF_ERROR'
      )
    }

    return successResponse({ kind: 'operator' as const, handoffUrl: handoff.url })
  }

  // Fetch client record to build session
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, client_type, status')
    .eq('auth_user_id', authData.user.id)
    .single() as { data: { id: string; name: string; client_type: string; status: string } | null }

  // Fetch client config for dashboard type
  const { data: config } = client
    ? await supabase
        .from('client_configs')
        .select('dashboard_type')
        .eq('client_id', client.id)
        .single() as { data: { dashboard_type: string } | null }
    : { data: null }

  const session: UserSession = {
    id: authData.user.id,
    email: authData.user.email ?? email,
    role: 'client',
    dashboardType:
      (config?.dashboard_type as UserSession['dashboardType']) ?? 'lab',
    clientId: client?.id,
    displayName: client?.name ?? undefined,
  }

  return successResponse({ kind: 'client' as const, ...session })
}

export async function signupAction(
  formData: FormData
): Promise<ActionResponse<UserSession>> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    acceptCgu: formData.get('acceptCgu') === 'true',
    acceptIaProcessing: formData.get('acceptIaProcessing') === 'true',
  }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Donnees invalides',
      'VALIDATION_ERROR',
      parsed.error.flatten()
    )
  }

  const { email, password, acceptCgu, acceptIaProcessing } = parsed.data
  const supabase = await createServerSupabaseClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return errorResponse(
        'Un compte existe deja avec cet email',
        'DUPLICATE_EMAIL'
      )
    }
    return errorResponse(authError.message, 'AUTH_ERROR')
  }

  if (!authData.user) {
    return errorResponse(
      'Erreur lors de la creation du compte',
      'AUTH_ERROR'
    )
  }

  // Link auth user to existing client record (if MiKL pre-created one)
  const { data: linked } = await supabase.rpc('fn_link_auth_user', {
    p_auth_user_id: authData.user.id,
    p_email: email,
  } as never) as { data: { clientId: string; name: string } | null }

  // Get IP and user-agent for consent tracking
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  const userAgent = headersList.get('user-agent') ?? 'unknown'

  // Insert CGU consent (mandatory)
  const { error: cguError } = await supabase.from('consents').insert({
    client_id: linked?.clientId ?? authData.user.id,
    consent_type: 'cgu',
    accepted: acceptCgu,
    version: 'v1.0',
    ip_address: ip,
    user_agent: userAgent,
  } as any)

  if (cguError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    return errorResponse(
      'Erreur lors de l\'enregistrement des consentements',
      'CONSENT_ERROR',
      { details: cguError.message }
    )
  }

  // Insert IA consent (optional)
  const { error: iaError } = await supabase.from('consents').insert({
    client_id: linked?.clientId ?? authData.user.id,
    consent_type: 'ia_processing',
    accepted: acceptIaProcessing,
    version: 'v1.0',
    ip_address: ip,
    user_agent: userAgent,
  } as any)

  if (iaError) {
    // Rollback: delete auth user and CGU consent
    await supabase.auth.admin.deleteUser(authData.user.id)
    return errorResponse(
      'Erreur lors de l\'enregistrement des consentements',
      'CONSENT_ERROR',
      { details: iaError.message }
    )
  }

  const session: UserSession = {
    id: authData.user.id,
    email: authData.user.email ?? email,
    role: 'client',
    dashboardType: 'lab',
    clientId: linked?.clientId,
    displayName: linked?.name ?? undefined,
  }

  return successResponse(session)
}

export async function forgotPasswordAction(
  formData: FormData
): Promise<ActionResponse<null>> {
  const raw = { email: formData.get('email') }
  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Email invalide',
      'VALIDATION_ERROR'
    )
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // NEXT_PUBLIC_APP_URL n'existe pas côté client : le `?? ''` produisait une URL
    // relative que Supabase rejette, et le client atterrissait sur l'accueil sans
    // pouvoir changer son mot de passe. Même base que l'invitation Lab
    // (send-welcome-lab-invite) pour partager les URLs autorisées Supabase.
    redirectTo: `${getClientAppUrl()}/auth/callback?next=/reset-password`,
  })

  // On retourne toujours succès pour ne pas révéler si l'email existe
  if (error) {
    console.error('[AUTH:FORGOT_PASSWORD]', error)
  }

  return successResponse(null)
}

export async function resetPasswordAction(
  formData: FormData
): Promise<ActionResponse<null>> {
  const password = formData.get('password') as string
  if (!password || password.length < 8) {
    return errorResponse('Minimum 8 caracteres', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()
  const { data: updated, error } = await supabase.auth.updateUser({ password })

  if (error) {
    return errorResponse('Erreur lors de la mise a jour du mot de passe', 'AUTH_ERROR')
  }

  // Alerte de securite : le titulaire du compte doit etre prevenu qu'on vient de
  // changer son mot de passe — c'est le seul signal s'il n'est pas a l'origine
  // de l'operation. L'INSERT declenche trg_send_email_on_notification -> email.
  // Best-effort : un echec ici ne doit jamais empecher la reinitialisation.
  if (updated?.user?.id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      recipient_type: 'client',
      recipient_id: updated.user.id, // auth_user_id (convention notifications)
      type: 'system',
      title: 'Votre mot de passe a ete modifie',
      body: "Le mot de passe de votre espace MonprojetPro vient d'etre changé. Si vous n'êtes pas à l'origine de cette modification, contactez-nous immédiatement à contact@monprojet-pro.com.",
      link: null,
    })
    if (notifError) {
      console.error('[AUTH:RESET_PASSWORD] Notification securite non creee:', notifError.message)
    }
  }

  return successResponse(null)
}

export async function logoutAction(): Promise<ActionResponse<null>> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return errorResponse(
      'Erreur lors de la deconnexion',
      'AUTH_ERROR'
    )
  }

  return successResponse(null)
}
