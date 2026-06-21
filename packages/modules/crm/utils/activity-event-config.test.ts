import { describe, it, expect } from 'vitest'
import {
  resolveEventConfig,
  resolveByPrefix,
  deriveActivityDescription,
  resolveActorLabel,
  ACTIVITY_EVENT_CONFIG,
  FALLBACK_EVENT_CONFIG,
} from './activity-event-config'

describe('resolveEventConfig', () => {
  it('retourne la config statique pour une action connue', () => {
    const config = resolveEventConfig('client_created')
    expect(config.label).toBe('Client créé')
    expect(config.tab).toBe('pilote')
    expect(config.actionLabel).toBe('Voir le cockpit')
  })

  it('retourne la config statique pour submission_approved', () => {
    const config = resolveEventConfig('submission_approved')
    expect(config.label).toBe('Soumission approuvée')
    expect(config.tab).toBe('submissions')
  })

  it('retourne la config statique pour parcours_abandoned', () => {
    const config = resolveEventConfig('parcours_abandoned')
    expect(config.label).toBe('Abandon de parcours demandé')
    expect(config.tab).toBe('submissions')
  })

  it('résout les actions dynamiques parcours_mode_set_libre par préfixe', () => {
    const config = resolveEventConfig('parcours_mode_set_libre')
    expect(config.label).toBe('Mode de parcours → Libre')
    expect(config.tab).toBe('pilote')
  })

  it('résout les actions dynamiques parcours_mode_set_tracee par préfixe', () => {
    const config = resolveEventConfig('parcours_mode_set_tracee')
    expect(config.label).toBe('Mode de parcours → Tracé')
    expect(config.tab).toBe('pilote')
  })

  it('résout access_lab_enabled par préfixe', () => {
    const config = resolveEventConfig('access_lab_enabled')
    expect(config.label).toBe('Accès Lab (agents Élio) activé')
    expect(config.tab).toBe('pilote')
  })

  it('résout access_one_disabled par préfixe', () => {
    const config = resolveEventConfig('access_one_disabled')
    expect(config.label).toBe('Accès One coupé')
    expect(config.tab).toBe('pilote')
  })

  it('retourne le fallback pour une action inconnue', () => {
    const config = resolveEventConfig('unknown_action_xyz')
    expect(config).toEqual(FALLBACK_EVENT_CONFIG)
    expect(config.label).toBe('Activité')
    expect(config.tab).toBeNull()
  })
})

describe('resolveByPrefix', () => {
  it('retourne null pour une action sans préfixe connu', () => {
    expect(resolveByPrefix('client_created')).toBeNull()
    expect(resolveByPrefix('unknown')).toBeNull()
  })

  it('retourne une config pour parcours_mode_set_*', () => {
    const config = resolveByPrefix('parcours_mode_set_libre')
    expect(config).not.toBeNull()
    expect(config?.label).toContain('Libre')
  })

  it('retourne une config pour access_*', () => {
    const config = resolveByPrefix('access_lab_disabled')
    expect(config).not.toBeNull()
    expect(config?.label).toContain('coupé')
  })
})

describe('deriveActivityDescription', () => {
  it('utilise metadata.description si présent', () => {
    const desc = deriveActivityDescription('client_created', { description: 'Custom description' })
    expect(desc).toBe('Custom description')
  })

  it('utilise la fonction describe() de la config si disponible', () => {
    const desc = deriveActivityDescription('parcours_mode_set_libre', { mode: 'libre', resynced: 3 })
    expect(desc).toContain('3 étape(s) resynchronisée(s)')
  })

  it('utilise le label par défaut quand pas de describe et pas de metadata.description', () => {
    const desc = deriveActivityDescription('client_created', null)
    expect(desc).toBe('Client créé')
  })

  it('enrichit la description de parcours_abandoned avec progression', () => {
    const desc = deriveActivityDescription('parcours_abandoned', {
      progression: '3/5',
      reason: 'Projet abandonné',
    })
    expect(desc).toContain('3/5')
    expect(desc).toContain('Projet abandonné')
  })

  it('enrichit la description de parcours_mode_set_tracee sans resynced', () => {
    const desc = deriveActivityDescription('parcours_mode_set_tracee', { mode: 'tracee', resynced: 0 })
    expect(desc).toContain('tracé')
    expect(desc).not.toContain('resynchronisée')
  })

  it('utilise le fallback pour une action inconnue', () => {
    const desc = deriveActivityDescription('xyz_unknown', null)
    expect(desc).toBe('Activité')
  })
})

describe('resolveActorLabel', () => {
  it('retourne "par toi" pour operator', () => {
    expect(resolveActorLabel('operator')).toBe('par toi')
  })

  it('retourne "par le client" pour client', () => {
    expect(resolveActorLabel('client')).toBe('par le client')
  })

  it('retourne "par Élio" pour elio', () => {
    expect(resolveActorLabel('elio')).toBe('par Élio')
  })

  it('retourne "automatique" pour system', () => {
    expect(resolveActorLabel('system')).toBe('automatique')
  })

  it('retourne une chaîne vide pour un type inconnu', () => {
    expect(resolveActorLabel('unknown')).toBe('')
  })
})

describe('ACTIVITY_EVENT_CONFIG — exhaustivité', () => {
  it('toutes les entrées ont tab null ou une valeur d\'onglet existante', () => {
    const validTabs = new Set([
      'pilote', 'emails', 'echanges', 'documents', 'lab-billing',
      'submissions', 'modules', 'historique', 'branding', 'support',
      'elio-config', 'administration', null,
    ])
    for (const [action, config] of Object.entries(ACTIVITY_EVENT_CONFIG)) {
      expect(
        validTabs.has(config.tab),
        `Action "${action}" pointe vers tab "${config.tab}" qui n'existe pas`
      ).toBe(true)
    }
  })

  it('toutes les entrées ont un label non vide', () => {
    for (const [action, config] of Object.entries(ACTIVITY_EVENT_CONFIG)) {
      expect(config.label, `Action "${action}" a un label vide`).toBeTruthy()
    }
  })

  it('mapping actions critiques → onglets corrects', () => {
    expect(ACTIVITY_EVENT_CONFIG['submission_approved']?.tab).toBe('submissions')
    expect(ACTIVITY_EVENT_CONFIG['submission_rejected']?.tab).toBe('submissions')
    expect(ACTIVITY_EVENT_CONFIG['submission_sent']?.tab).toBe('submissions')
    expect(ACTIVITY_EVENT_CONFIG['quote_created']?.tab).toBe('lab-billing')
    expect(ACTIVITY_EVENT_CONFIG['module_toggled']?.tab).toBe('modules')
    expect(ACTIVITY_EVENT_CONFIG['branding_updated']?.tab).toBe('branding')
    expect(ACTIVITY_EVENT_CONFIG['elio_doc_injected']?.tab).toBe('elio-config')
  })

  it('les actions cycle de vie client pointent vers pilote (plus informations)', () => {
    const lifecycleActions = [
      'client_created', 'client_graduated', 'client_archived',
      'client_suspended', 'client_reactivated', 'client_closed', 'client_upgraded',
    ]
    for (const action of lifecycleActions) {
      expect(
        ACTIVITY_EVENT_CONFIG[action]?.tab,
        `Action "${action}" devrait pointer vers pilote`
      ).toBe('pilote')
    }
  })
})
