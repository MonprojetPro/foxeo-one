'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'

/**
 * Construit un résumé textuel léger de l'état du dashboard ONE d'un client, destiné au
 * system prompt d'Élio One (volet RÉACTIF — Élio « au courant » du fonctionnement et de
 * l'état du One, pendant Lab de getLabParcoursContext).
 *
 * Objectif : Élio One sait, sans halluciner :
 *   • les modules actifs du client (client_configs.active_modules),
 *   • l'offre / le tier (elio_tier + subscription_tier),
 *   • l'état du cycle de vie de l'outil (one_status : en chantier / livré),
 *   • les derniers posts du Suivi de l'outil (tool_posts),
 *   • les tickets de support encore ouverts (support_tickets).
 *
 * Volontairement minimal et factuel — les modules ne s'importent pas entre eux (règle d'archi)
 * → on requête directement Supabase. Retourne `null` s'il n'y a rien d'utile à injecter.
 * Ne throw jamais : un échec ne doit pas casser le chat (renvoie null).
 */
export async function getOneContext(clientId: string): Promise<string | null> {
  if (!clientId) return null

  try {
    const supabase = await createServerSupabaseClient()

    // 1. Config client : modules actifs, tier, statut du cycle de vie de l'outil.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cfg } = await (supabase as any)
      .from('client_configs')
      .select('active_modules, elio_tier, subscription_tier, one_status')
      .eq('client_id', clientId)
      .maybeSingle() as {
        data: {
          active_modules: string[] | null
          elio_tier: 'one' | 'one_plus' | null
          subscription_tier: string | null
          one_status: string | null
        } | null
      }

    // 2. Derniers posts du Suivi de l'outil (les 3 plus récents — titre + date).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: posts } = await (supabase as any)
      .from('tool_posts')
      .select('title, body, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(3) as {
        data: Array<{ title: string | null; body: string; created_at: string }> | null
      }

    // 3. Tickets de support encore ouverts (open / in_progress).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tickets } = await (supabase as any)
      .from('support_tickets')
      .select('subject, status')
      .eq('client_id', clientId)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(5) as {
        data: Array<{ subject: string; status: string }> | null
      }

    const lines: string[] = []

    // --- Cycle de vie de l'outil (en chantier / livré) ---
    if (cfg?.one_status === 'construction') {
      lines.push(
        '- État de l\'outil : EN CHANTIER. L\'outil sur-mesure du client est encore en cours de développement par MiKL. Tout le socle (relation, suivi, support) est déjà disponible ; les cockpits sur-mesure s\'allumeront à la livraison. Si le client s\'inquiète de fonctionnalités « pas encore là », rassure-le : c\'est normal pendant cette phase, il peut suivre l\'avancement dans l\'onglet Suivi de l\'outil.'
      )
    } else if (cfg?.one_status === 'delivered') {
      lines.push('- État de l\'outil : LIVRÉ. Les cockpits sur-mesure du client sont actifs.')
    }

    // --- Offre / tier ---
    const tierLabel = cfg?.elio_tier === 'one_plus' ? 'One+' : 'One'
    lines.push(`- Offre du client : ${tierLabel}${cfg?.subscription_tier ? ` (abonnement : ${cfg.subscription_tier})` : ''}.`)

    // --- Modules actifs ---
    const activeModules = cfg?.active_modules ?? []
    if (activeModules.length > 0) {
      lines.push(`- Modules actifs du client : ${activeModules.join(', ')}.`)
    } else {
      lines.push('- Aucun module cockpit sur-mesure n\'est encore actif (le client dispose du socle de base).')
    }

    // --- Suivi de l'outil ---
    if (posts && posts.length > 0) {
      const postsList = posts
        .map((p) => {
          const label = p.title?.trim() || p.body.slice(0, 60).trim()
          return `« ${label} »`
        })
        .join(' · ')
      lines.push(`- Dernières actualités du Suivi de l'outil : ${postsList}.`)
    }

    // --- Support ouvert ---
    if (tickets && tickets.length > 0) {
      const statusLabel = (s: string): string => (s === 'in_progress' ? 'en cours de traitement' : 'ouvert')
      const ticketsList = tickets
        .map((t) => `« ${t.subject} » (${statusLabel(t.status)})`)
        .join(' · ')
      lines.push(`- Tickets de support en cours : ${ticketsList}.`)
    } else {
      lines.push('- Aucun ticket de support en cours.')
    }

    return lines.length > 0 ? lines.join('\n') : null
  } catch (err) {
    // Un échec de récupération du contexte One ne doit jamais casser le chat.
    console.error('[ELIO:ONE_CONTEXT] Failed:', err)
    return null
  }
}
