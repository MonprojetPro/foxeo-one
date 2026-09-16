import { describe, it, expect } from 'vitest'
import { decideWebhookAuth } from './webhook-auth'

const NAME = 'CALCOM_WEBHOOK_SECRET'

describe('decideWebhookAuth', () => {
  it('demande la verification de signature quand le secret est configure', () => {
    expect(decideWebhookAuth('s3cr3t', 'production', NAME)).toEqual({
      action: 'verify',
      secret: 's3cr3t',
    })
  })

  it('demande la verification meme hors production : un secret pose est un secret applique', () => {
    expect(decideWebhookAuth('s3cr3t', 'development', NAME)).toEqual({
      action: 'verify',
      secret: 's3cr3t',
    })
  })

  // Le coeur de l'incident du 16-09 : c'est ce cas-la qui rendait les
  // endpoints publics en production.
  it('REFUSE en production quand le secret est absent', () => {
    const decision = decideWebhookAuth(undefined, 'production', NAME)
    expect(decision.action).toBe('misconfigured')
    expect(decision).toMatchObject({ status: 500 })
  })

  it('REFUSE aussi quand la variable existe mais est vide', () => {
    // Cas le plus trompeur : la variable apparait dans le tableau de bord
    // Vercel, donc on la croit posee, et elle ne protege rien.
    expect(decideWebhookAuth('', 'production', NAME).action).toBe('misconfigured')
  })

  it('nomme la variable manquante dans le message, pour que le journal soit actionnable', () => {
    const decision = decideWebhookAuth(undefined, 'production', NAME)
    expect(decision.action === 'misconfigured' && decision.message).toContain(NAME)
  })

  it('laisse passer hors production, pour ne pas casser le dev local', () => {
    expect(decideWebhookAuth(undefined, 'development', NAME)).toEqual({ action: 'allow' })
    expect(decideWebhookAuth(undefined, 'test', NAME)).toEqual({ action: 'allow' })
  })

  it('laisse passer quand NODE_ENV est absent (script, outil local)', () => {
    expect(decideWebhookAuth(undefined, undefined, NAME)).toEqual({ action: 'allow' })
  })

  it("ne confond pas un NODE_ENV qui contient 'production' avec la production", () => {
    // Garde-fou contre une comparaison relachee (includes/startsWith) qui
    // laisserait 'not-production' passer pour de la production, ou l'inverse.
    expect(decideWebhookAuth(undefined, 'preproduction', NAME).action).toBe('allow')
  })
})
