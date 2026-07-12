import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

/**
 * Garde d'accès module (Server Component). À appeler en TÊTE de chaque page
 * `modules/<x>/page.tsx` avec l'id du module correspondant.
 *
 * Si le module n'est pas dans `client_configs.active_modules` du client connecté, on redirige
 * vers l'accueil. Sans ce garde, désactiver un module ne fait que le masquer de la sidebar — il
 * reste atteignable en tapant l'URL à la main. Cette fonction ferme cette porte.
 *
 * `core-dashboard` (accueil) n'a jamais besoin d'être gardé (c'est la cible de la redirection).
 */
export async function requireActiveModule(moduleId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('clients')
    .select('client_configs(active_modules)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const rawConfig = (data as { client_configs: unknown } | null)?.client_configs
  const config = Array.isArray(rawConfig) ? rawConfig[0] : rawConfig
  const activeModules: string[] = (config as { active_modules: string[] | null } | null)?.active_modules ?? [
    'core-dashboard',
  ]

  if (!activeModules.includes(moduleId)) {
    redirect('/')
  }
}
