import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Thin wrapper around supabase.auth.admin.createUser, using the service role
// key. Must only be called from server-side code (webhook route / Server
// Action), never from the client bundle.

export type CreateClientAuthUserResult =
  | { userId: string; error: null }
  | { userId: null; error: { code: string; message: string; details?: unknown } }

export interface CreateClientAuthUserOptions {
  email: string
  password: string
  adminClient?: SupabaseClient
}

function buildAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function createClientAuthUser(
  options: CreateClientAuthUserOptions
): Promise<CreateClientAuthUserResult> {
  const admin = options.adminClient ?? buildAdminClient()
  if (!admin) {
    return {
      userId: null,
      error: {
        code: 'CONFIG_ERROR',
        message:
          'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant — impossible de creer un compte',
      },
    }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
  })

  if (error || !data?.user) {
    return {
      userId: null,
      error: {
        code: 'AUTH_ADMIN_CREATE_FAILED',
        message: error?.message ?? 'auth.admin.createUser a retourne une reponse vide',
        details: error,
      },
    }
  }

  return { userId: data.user.id, error: null }
}
