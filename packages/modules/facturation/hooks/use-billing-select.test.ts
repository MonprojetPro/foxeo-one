import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ============================================================
// T-044a — le `select` de `useBillingSyncRows` enumere ses colonnes.
//
// ⛔ CE QUI S'EST PASSE : T-044 a ajoute la colonne `billing_sync.last_sent_at`,
// l'a ecrite a l'envoi, et l'a affichee dans la liste... mais ne l'a PAS ajoutee
// a ce `select`. Resultat : `row.last_sent_at` arrivait `undefined`, sans la
// moindre erreur — la date ne s'affichait jamais, le bouton restait « Envoyer au
// client » sur une facture deja partie, et la garde anti-double-envoi ne
// protegeait rien. Trouve par MiKL sur une capture, pas par un test.
//
// 🔑 POURQUOI UN TEST QUI LIT LE SOURCE plutot qu'un test du hook : le defaut
// n'est pas un comportement, c'est une OMISSION. Un test de comportement ne peut
// que verifier ce qu'on a pense a lui demander — or ici, c'est precisement la
// pensee qui a manque. Ce test compare deux listes : les champs du type et les
// colonnes demandees. Il echouera a la prochaine colonne ajoutee sans lecteur.
// ============================================================

const HOOK_SOURCE = readFileSync(join(__dirname, 'use-billing.ts'), 'utf8')
const TYPES_SOURCE = readFileSync(
  join(__dirname, '..', 'types', 'billing.types.ts'),
  'utf8'
)

/** Champs declares par le type `BillingSyncRow`, dans l'ordre du fichier. */
function billingSyncRowFields(): string[] {
  const block = TYPES_SOURCE.split('export type BillingSyncRow = {')[1]?.split('\n}')[0] ?? ''
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[a-z_]+\??:/.test(line))
    .map((line) => line.split(/\??:/)[0].trim())
}

/** Colonnes reellement demandees par le `select` de `useBillingSyncRows`. */
function selectedColumns(): string[] {
  const afterHook = HOOK_SOURCE.split('export function useBillingSyncRows')[1] ?? ''
  const match = afterHook.match(/\.select\(\s*'([^']+)'/)
  if (!match) return []
  return match[1].split(',').map((c) => c.trim())
}

/** Colonnes demandees par le `select` de `useBillingMetrics`. */
function metricsColumns(): string[] {
  const afterHook = HOOK_SOURCE.split('export function useBillingMetrics')[1] ?? ''
  const match = afterHook.match(/\.select\(\s*'([^']+)'/)
  if (!match) return []
  return match[1].split(',').map((c) => c.trim())
}

/** Champs lus par `computeBillingMetrics`, declares par `MetricsRow`. */
function metricsRowFields(): string[] {
  const source = readFileSync(join(__dirname, '..', 'utils', 'billing-metrics.ts'), 'utf8')
  const block = source.split('export type MetricsRow = {')[1]?.split('\n}')[0] ?? ''
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[a-z_]+\??:/.test(line))
    .map((line) => line.split(/\??:/)[0].trim())
}

describe('useBillingMetrics — colonnes demandées', () => {
  // T-045 — sans `pennylane_id`, le calcul ne peut pas savoir si la facture
  // qu'un avoir annule avait ete encaissee : aucun avoir ne serait jamais
  // deduit du CA, et l'erreur serait muette.
  it('demande pennylane_id — sans lui, aucun avoir ne peut etre rattache a sa facture', () => {
    expect(metricsColumns()).toContain('pennylane_id')
  })

  it('ne laisse AUCUN champ de MetricsRow hors du select', () => {
    const declared = metricsRowFields()
    const selected = metricsColumns()
    const missing = declared.filter((field) => !selected.includes(field))

    expect(
      missing,
      `Champs lus par computeBillingMetrics mais absents du select de useBillingMetrics : ${missing.join(', ')}. Ils arriveraient \`undefined\`, et le calcul serait faux SANS erreur.`
    ).toEqual([])
  })
})

describe('useBillingSyncRows — colonnes demandées', () => {
  it('demande bien last_sent_at — sans elle, la date d envoi n arrive jamais à l écran', () => {
    expect(selectedColumns()).toContain('last_sent_at')
  })

  it('ne laisse AUCUN champ de BillingSyncRow hors du select', () => {
    const declared = billingSyncRowFields()
    const selected = selectedColumns()

    expect(declared.length).toBeGreaterThan(5)
    const missing = declared.filter((field) => !selected.includes(field))

    // Message explicite : la prochaine personne doit comprendre en une ligne
    // qu'elle a ajoute une colonne sans brancher son lecteur.
    expect(
      missing,
      `Colonnes declarees dans BillingSyncRow mais absentes du select de useBillingSyncRows : ${missing.join(', ')}. Une colonne absente arrive \`undefined\` cote composant, SANS erreur.`
    ).toEqual([])
  })
})
