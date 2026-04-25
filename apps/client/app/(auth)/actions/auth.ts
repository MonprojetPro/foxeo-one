'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  type UserSession,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { loginSchema, signupSchema, forgotPasswordSchema } from './schemas'

// --- Server Actions ---

export async function loginAction(
  formData: FormData
): Promise<ActionResponse<UserSession>> {
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

  return successResponse(session)
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
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback?next=/reset-password`,
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
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return errorResponse('Erreur lors de la mise a jour du mot de passe', 'AUTH_ERROR')
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
