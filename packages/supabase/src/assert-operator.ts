import { createServerSupabaseClient } from './server'

/**
 * Garde « opérateur » partagée — T-082.
 *
 * 🔑 POURQUOI DANS LA BRIQUE COMMUNE ET PAS DANS CHAQUE MODULE : une Server
 * Action n'est pas protégée par la page qui l'affiche. Next expose un
 * identifiant d'action, et quiconque le connaît peut l'appeler directement,
 * sans jamais ouvrir l'écran du Hub. Chaque action sensible doit donc se
 * défendre elle-même.
 *
 * Le module `facturation` en avait écrit sa propre copie ; le module
 * `menu-facile`, lui, n'en a aucune — ses actions de cockpit sont appelables
 * par tout utilisateur connecté. Une troisième copie aurait garanti une
 * troisième divergence : la garde vit donc ici, où tous les modules peuvent la
 * prendre, puisqu'aucun module ne peut en importer un autre.
 *
 * Renvoie `{ supabase, userId }` pour que l'appelant enchaîne sans refaire la
 * requête, ou `{ error }` typé — jamais d'exception : les Server Actions du
 * projet rendent toujours `{ data, error }`.
 */

export type AssertOperatorResult = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null
  userId: string | null
  error: { message: string; code: string } | null
}

export async function assertOperator(): Promise<AssertOperatorResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      supabase: null,
      userId: null,
      error: { message: 'Non authentifié', code: 'UNAUTHORIZED' },
    }
  }

  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) {
    return {
      supabase: null,
      userId: null,
      error: { message: 'Accès réservé aux opérateurs', code: 'FORBIDDEN' },
    }
  }

  return { supabase, userId: user.id, error: null }
}
