'use server'

import { headers, cookies } from 'next/headers'
import { createHash } from 'crypto'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  type UserSession,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { hubLoginSchema, mfaCodeSchema } from './auth-schemas'

// --- Type casts ---
// Supabase typed client does not resolve RPC function args or operators table
// columns added after initial gen:types. All `as never` casts below are for
// this reason and will be removed once database.types.ts is auto-generated.

// --- Types ---

type HubLoginResult = {
  requiresMfa: boolean
  needsSetup: boolean
  operatorId: string
  operatorName: string
}

type MfaSetupResult = {
  factorId: string
  qrCode: string
  secret: string
  uri: string
}

type MfaSetupVerifyResult = {
  recoveryCodes: string[]
}

// --- Server Actions ---

export async function hubLoginAction(
  formData: FormData
): Promise<ActionResponse<HubLoginResult>> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = hubLoginSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Donnees invalides',
      'VALIDATION_ERROR',
      parsed.error.flatten()
    )
  }

  const { email, password } = parsed.data
  const supabase = await createServerSupabaseClient()

  // Brute force check (reuse existing SECURITY DEFINER function)
  // Type assertion needed: Supabase typed client does not resolve RPC function args correctly
  const { data: lockout } = (await supabase.rpc('fn_check_login_attempts' as never, {
    p_email: email,
  } as never)) as unknown as { data: { blocked: boolean; remainingSeconds: number } | null }

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
    await supabase.auth.signInWithPassword({ email, password })

  // Get IP for recording attempt
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  if (authError || !authData.user) {
    await supabase.rpc('fn_record_login_attempt' as never, {
      p_email: email,
      p_ip_address: ip,
      p_success: false,
    } as never)
    return errorResponse('Email ou mot de passe incorrect', 'AUTH_ERROR')
  }

  // Record successful login
  await supabase.rpc('fn_record_login_attempt' as never, {
    p_email: email,
    p_ip_address: ip,
    p_success: true,
  } as never)

  // Verify operator via SECURITY DEFINER function (bypasses RLS)
  // Direct table query would fail before auth_user_id is linked
  const { data: operator } = (await supabase.rpc('fn_get_operator_by_email' as never, {
    p_email: email,
  } as never)) as unknown as {
    data: { id: string; name: string; role: string; twoFactorEnabled: boolean; authUserId: string | null } | null
  }

  if (!operator) {
    // Sign out — not an operator
    await supabase.auth.signOut()
    return errorResponse('Acces non autorise. Compte operateur requis.', 'UNAUTHORIZED')
  }

  // Link auth_user_id if not yet linked (SECURITY DEFINER, bypasses RLS)
  if (!operator.authUserId) {
    await supabase.rpc('fn_link_operator_auth_user' as never, {
      p_auth_user_id: authData.user.id,
      p_email: email,
    } as never)
  }

  // Check MFA status
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactors = factors?.totp ?? []
  const hasVerifiedTotp = totpFactors.some(
    (f: { status: string }) => f.status === 'verified'
  )

  // Cache factorId in a short-lived cookie to skip listFactors() during verify
  const verifiedFactor = totpFactors.find((f: { id: string; status: string }) => f.status === 'verified')
  if (verifiedFactor) {
    const cookieStore = await cookies()
    cookieStore.set('mpp_mfa_factor_id', verifiedFactor.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 300,
      path: '/',
    })
  }

  return successResponse({
    requiresMfa: hasVerifiedTotp,
    needsSetup: !hasVerifiedTotp && !operator.twoFactorEnabled,
    operatorId: operator.id,
    operatorName: operator.name,
  })
}

export async function hubVerifyMfaAction(
  formData: FormData
): Promise<ActionResponse<UserSession>> {
  const raw = { code: formData.get('code') }

  const parsed = mfaCodeSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Code invalide',
      'VALIDATION_ERROR'
    )
  }

  const { code } = parsed.data
  const supabase = await createServerSupabaseClient()

  // 1. Vérifier la session (gère le refresh du token si nécessaire)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('[MFA:VERIFY] Session invalide:', userError)
    return errorResponse('Session expiree. Veuillez vous reconnecter.', 'AUTH_ERROR')
  }

  // 2. Résoudre le factorId depuis la source de vérité (jamais depuis un cookie périmé)
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) {
    console.error('[MFA:VERIFY] listFactors échoué:', factorsError)
    return errorResponse('Erreur lors de la verification 2FA.', 'MFA_ERROR')
  }

  const totpFactor = factors?.totp?.find((f: { status: string }) => f.status === 'verified')
  if (!totpFactor) {
    return errorResponse('Aucun facteur 2FA configure.', 'MFA_NOT_CONFIGURED')
  }

  const factorId = totpFactor.id

  // 3. Challenge + Verify enchaînés immédiatement — réduire le délai entre les deux
  //    pour éviter que le code TOTP (fenêtre 30s) n'expire entre les appels
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })

  if (challengeError || !challenge) {
    console.error('[MFA:VERIFY] Challenge échoué — factorId:', factorId, 'erreur:', challengeError)
    return errorResponse('Erreur lors de la verification 2FA.', 'MFA_ERROR')
  }

  const { data: verify, error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })

  if (verifyError || !verify) {
    return errorResponse('Code 2FA incorrect. Veuillez reessayer.', 'MFA_INVALID_CODE')
  }

  // 4. Nettoyer le cookie factorId résiduel si présent
  const cookieStore = await cookies()
  cookieStore.delete('mpp_mfa_factor_id')

  // 5. Session AAL2 confirmée — construire UserSession
  const { data: operator } = (await supabase.rpc('fn_get_operator_by_email' as never, {
    p_email: user.email ?? '',
  } as never)) as unknown as {
    data: { id: string; name: string; role: string; twoFactorEnabled: boolean; authUserId: string | null } | null
  }

  const session: UserSession = {
    id: user.id,
    email: user.email ?? '',
    role: 'operator',
    dashboardType: 'hub',
    operatorId: operator?.id,
    displayName: operator?.name ?? undefined,
  }

  return successResponse(session)
}

export async function hubSetupMfaAction(): Promise<ActionResponse<MfaSetupResult>> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse('Session expiree.', 'AUTH_ERROR')
  }

  const { data: enroll, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'MonprojetPro Hub TOTP',
  })

  if (enrollError || !enroll) {
    return errorResponse('Erreur lors de la configuration 2FA.', 'MFA_ENROLL_ERROR')
  }

  return successResponse({
    factorId: enroll.id,
    qrCode: enroll.totp.qr_code,
    secret: enroll.totp.secret,
    uri: enroll.totp.uri,
  })
}

export async function hubVerifyMfaSetupAction(
  formData: FormData
): Promise<ActionResponse<MfaSetupVerifyResult>> {
  const raw = { code: formData.get('code') }
  const factorId = formData.get('factorId') as string

  const parsed = mfaCodeSchema.safeParse(raw)
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Code invalide',
      'VALIDATION_ERROR'
    )
  }

  if (!factorId) {
    return errorResponse('Facteur MFA manquant.', 'VALIDATION_ERROR')
  }

  const { code } = parsed.data
  const supabase = await createServerSupabaseClient()

  // Create challenge for the newly enrolled factor
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })

  if (challengeError || !challenge) {
    return errorResponse('Erreur lors de la verification.', 'MFA_ERROR')
  }

  // Verify the code to activate the factor
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  })

  if (verifyError) {
    return errorResponse('Code incorrect. Scannez le QR code et reessayez.', 'MFA_INVALID_CODE')
  }

  // Mark operator as 2FA enabled
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email) {
    await supabase
      .from('operators')
      .update({ two_factor_enabled: true } as never)
      .eq('email', user.email ?? '')
  }

  // Generate 10 recovery codes and store SHA-256 hashes
  const recoveryCodes = Array.from({ length: 10 }, () =>
    Array.from({ length: 8 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('')
  )

  const recoveryCodeHashes = recoveryCodes.map((code) =>
    createHash('sha256').update(code).digest('hex')
  )

  if (user?.email) {
    await supabase
      .from('operators')
      .update({
        mfa_metadata: {
          recovery_codes_created_at: new Date().toISOString(),
          recovery_codes_hashes: recoveryCodeHashes,
          recovery_codes_used: 0,
        },
      } as never)
      .eq('email', user.email ?? '')
  }

  return successResponse({ recoveryCodes })
}

export async function hubLogoutAction(): Promise<ActionResponse<null>> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return errorResponse('Erreur lors de la deconnexion', 'AUTH_ERROR')
  }

  return successResponse(null)
}
