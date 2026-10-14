import { describe, it, expect } from 'vitest'
import { describeGoogleMeetFailure } from './google-meet-error'
import { GoogleMeetConfigError } from './google-meet-client'

describe('describeGoogleMeetFailure', () => {
  it('distingue une CONFIGURATION absente et nomme la variable manquante', () => {
    const f = describeGoogleMeetFailure(new GoogleMeetConfigError(['GOOGLE_MEET_REFRESH_TOKEN']))

    expect(f.kind).toBe('config')
    expect(f.message).toContain('GOOGLE_MEET_REFRESH_TOKEN')
    expect(f.message).toContain('Vercel')
  })

  it('accorde le message au nombre de variables manquantes', () => {
    expect(describeGoogleMeetFailure(new GoogleMeetConfigError(['A'])).message).toContain(
      'est absente'
    )
    expect(describeGoogleMeetFailure(new GoogleMeetConfigError(['A', 'B'])).message).toContain(
      'sont absentes'
    )
  })

  it('reconnait un jeton REVOQUE (invalid_grant) et dit de le regenerer', () => {
    const f = describeGoogleMeetFailure(new Error('invalid_grant'))

    expect(f.kind).toBe('revoked')
    expect(f.message).toMatch(/régénérer/i)
  })

  it('reconnait une API non activee cote Google Cloud', () => {
    const f = describeGoogleMeetFailure({
      status: 403,
      message: 'Google Meet API has not been used in project 123 before or it is disabled',
    })

    expect(f.kind).toBe('permission')
    expect(f.message).toMatch(/API Google Meet n'est pas activée|meetings\.space\.created/)
  })

  it('reconnait un SCOPE insuffisant', () => {
    const f = describeGoogleMeetFailure({
      code: 403,
      errors: [{ reason: 'insufficientPermissions', message: 'Insufficient Permission' }],
    })

    expect(f.kind).toBe('permission')
  })

  it('remonte le motif BRUT quand la cause est inconnue, au lieu d’un message creux', () => {
    const f = describeGoogleMeetFailure({ status: 500, message: 'Backend Error' })

    expect(f.kind).toBe('unknown')
    expect(f.message).toContain('Backend Error')
    expect(f.message).toContain('500')
  })

  it('tient debout quand Google ne renvoie aucun motif exploitable', () => {
    const f = describeGoogleMeetFailure(null)

    expect(f.kind).toBe('unknown')
    expect(f.message).toContain('aucun motif renvoyé par Google')
    expect(f.message).not.toContain('undefined')
  })

  it('tronque un motif tres long pour ne pas noyer le toast', () => {
    const f = describeGoogleMeetFailure(new Error('x'.repeat(2000)))

    expect(f.detail.length).toBeLessThanOrEqual(300)
  })

  it('dit TOUJOURS qu’aucun rendez-vous n’a ete cree ni envoye', () => {
    const cases: unknown[] = [
      new GoogleMeetConfigError(['GOOGLE_CLIENT_ID']),
      new Error('invalid_grant'),
      { status: 403, message: 'PERMISSION_DENIED' },
      { status: 500, message: 'Backend Error' },
    ]

    for (const c of cases) {
      expect(describeGoogleMeetFailure(c).message).toContain("Aucun rendez-vous n'a été créé")
    }
  })
})
