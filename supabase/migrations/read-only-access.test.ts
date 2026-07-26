import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contrat de la migration « accès dégradé après résiliation ».
 *
 * Ce test existe surtout pour le SENS INVERSE : garantir qu'aucune passe future ne
 * verrouille par mégarde le chat ou le support. Un client résilié qui ne peut plus
 * écrire à MiKL perd la seule porte par laquelle il pourrait revenir — c'est le point
 * central du besoin, et c'est silencieux si ça casse.
 */
const MIGRATION = readFileSync(
  join(__dirname, '20260726170000_read_only_access_subscription_cancelled.sql'),
  'utf-8'
)

describe('migration accès dégradé — helpers RLS', () => {
  it('déclare les deux helpers en SECURITY DEFINER avec search_path figé', () => {
    expect(MIGRATION).toContain('CREATE OR REPLACE FUNCTION is_client_write_allowed(p_client_id UUID)')
    expect(MIGRATION).toContain('CREATE OR REPLACE FUNCTION is_current_client_write_allowed()')
    expect(MIGRATION.match(/SECURITY DEFINER STABLE/g)?.length).toBe(2)
    expect(MIGRATION.match(/SET search_path = public/g)?.length).toBe(2)
  })

  it('ne bride jamais l’opérateur — MiKL doit pouvoir gérer un dossier résilié', () => {
    expect(MIGRATION.match(/IF is_operator\(\) THEN\s+RETURN TRUE;/g)?.length).toBe(2)
  })

  it('ne ferme l’écriture que sur les deux statuts de fin d’abonnement', () => {
    expect(MIGRATION.match(/status IN \('subscription_cancelled', 'handed_off'\)/g)?.length).toBe(2)
    // NOT EXISTS = permissif par défaut : un statut inconnu n'a jamais l'effet de bloquer.
    expect(MIGRATION.match(/RETURN NOT EXISTS/g)?.length).toBe(2)
  })

  it('accorde l’exécution aux utilisateurs authentifiés', () => {
    expect(MIGRATION).toContain('GRANT EXECUTE ON FUNCTION is_client_write_allowed(UUID) TO authenticated')
    expect(MIGRATION).toContain('GRANT EXECUTE ON FUNCTION is_current_client_write_allowed() TO authenticated')
  })

  it('respecte le pattern de perf RLS (auth.uid() enveloppé dans un SELECT)', () => {
    expect(MIGRATION).toContain('(SELECT auth.uid())')
    expect(MIGRATION).not.toMatch(/=\s*auth\.uid\(\)\s*$/m)
  })
})

describe('migration accès dégradé — périmètre des verrous', () => {
  const GATED_TABLES = [
    'public.step_submissions',
    'public.validation_requests',
    'public.parcours',
    'public.parcours_steps',
    'public.client_parcours_agents',
  ]

  it.each(GATED_TABLES)('verrouille l’écriture sur %s', (table) => {
    expect(MIGRATION).toContain(`ON ${table}`)
  })

  it('n’utilise que des policies RESTRICTIVE — aucune policy existante réécrite', () => {
    const created = MIGRATION.match(/CREATE POLICY/g)?.length ?? 0
    const restrictive = MIGRATION.match(/AS RESTRICTIVE/g)?.length ?? 0

    expect(created).toBeGreaterThan(0)
    expect(restrictive).toBe(created)
  })

  it('ne DROP aucune policy qu’elle n’a pas créée elle-même', () => {
    const dropped = MIGRATION.match(/DROP POLICY IF EXISTS (\w+)/g) ?? []

    for (const drop of dropped) {
      const name = drop.replace('DROP POLICY IF EXISTS ', '')
      expect(MIGRATION).toContain(`CREATE POLICY ${name}`)
    }
  })

  it('ne touche à AUCUNE table qui doit rester ouverte au client résilié', () => {
    // Tables du canal de retour + consultation. Le commentaire final de la migration les
    // cite ; ce test vérifie qu'aucune n'est la cible d'une policy.
    const MUST_STAY_OPEN = [
      'messages',
      'support_tickets',
      'notifications',
      'documents',
      'document_folders',
      'client_concierge_messages',
      'elio_conversations',
      'elio_messages',
      'tool_post_comments',
      'consents',
    ]

    for (const table of MUST_STAY_OPEN) {
      expect(MIGRATION).not.toContain(`ON public.${table}\n`)
      expect(MIGRATION).not.toMatch(new RegExp(`CREATE POLICY[\\s\\S]{0,120}ON public\\.${table}\\b`))
    }
  })
})
