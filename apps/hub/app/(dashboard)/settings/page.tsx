import Link from 'next/link'
import { UserCog } from 'lucide-react'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { CockpitHeader, CockpitPanel, StatusPill } from '@monprojetpro/ui'
import { ProfileForm } from './profile-form'
import { PasswordForm } from './password-form'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Résolution par auth_user_id — jamais par email (cf. actions/update-operator-profile.ts).
  const { data: operator } = await supabase
    .from('operators')
    .select('name, email, role, two_factor_enabled')
    .eq('auth_user_id', user?.id ?? '')
    .maybeSingle()

  const name = operator?.name ?? ''
  const email = operator?.email ?? user?.email ?? ''
  const roleLabel = operator?.role === 'admin' ? 'Administrateur' : 'Opérateur'
  const twoFactorEnabled = operator?.two_factor_enabled ?? false

  return (
    <div className="space-y-6 p-6 md:p-8">
      <CockpitHeader
        icon={UserCog}
        title="Mon profil"
        subtitle="Vos informations de connexion et la sécurité de votre compte opérateur"
        tone="cyan"
      />

      <CockpitPanel title="Profil">
        <div className="space-y-4 p-3">
          <p className="text-sm text-gray-400">Rôle : {roleLabel}</p>
          <ProfileForm name={name} email={email} />
        </div>
      </CockpitPanel>

      <CockpitPanel title="Sécurité">
        <div className="space-y-6 p-3">
          <PasswordForm />

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Double authentification (2FA)</p>
              <p className="text-sm text-gray-400">
                {twoFactorEnabled
                  ? 'Activée — un code est demandé à chaque connexion.'
                  : 'Non activée — recommandé pour protéger votre compte.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill
                state={twoFactorEnabled ? 'live' : 'idle'}
                label={twoFactorEnabled ? 'Activée' : 'Inactive'}
              />
              {!twoFactorEnabled && (
                <Link href="/setup-mfa" className="text-sm text-cyan-300/80 hover:text-cyan-200">
                  Activer →
                </Link>
              )}
            </div>
          </div>
        </div>
      </CockpitPanel>
    </div>
  )
}
