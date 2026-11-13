// ============================================================
// T-082 — chaque action n'apparaît QUE là où elle peut aboutir
// ============================================================
// Un bouton qui ne peut que refuser est pire que pas de bouton : il fait
// cliquer, attendre, puis lire un échec. Ces tests verrouillent la
// correspondance entre l'état d'un compte et les gestes proposés.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CabinetGuardVeto, CompteGuardVeto, EtatCompte } from '../types'

const { etat } = vi.hoisted(() => ({
  etat: { comptes: [] as CompteGuardVeto[], comptesLisibles: true },
}))

vi.mock('../hooks/use-guard-veto', () => ({
  useGuardVetoComptes: () => ({
    data: { comptes: etat.comptes, comptesLisibles: etat.comptesLisibles },
    isLoading: false,
  }),
  useActionCompteGuardVeto: () => ({ mutate: vi.fn() }),
}))

vi.mock('@monprojetpro/ui', async () => {
  const reel = await vi.importActual<Record<string, unknown>>('@monprojetpro/ui')
  return { ...reel, showSuccess: vi.fn(), showError: vi.fn() }
})

import { UtilisateursTab } from './utilisateurs-tab'

const CABINET: CabinetGuardVeto = {
  id: '11111111-1111-4111-8111-111111111111',
  nom: 'Cabinet de test',
  ville: 'Vichy',
  actif: true,
  bacASable: false,
  modules: [],
  creeLe: null,
  equipe: null,
  derniereConnexion: null,
  periodes: { enCours: null, prochaine: null, derniereFin: null },
  support: { aTraiter: 0 },
  generations: { nb30j: 0, derniere: null },
}

function compte(etatCompte: EtatCompte, actif = true): CompteGuardVeto {
  return {
    genre: 'veterinaire',
    id: '22222222-2222-4222-8222-222222222222',
    cabinetId: CABINET.id,
    nom: 'Fanny',
    email: 'fanny@cabinet.fr',
    role: 'veto',
    actif,
    etat: etatCompte,
    derniereConnexion: null,
    inviteLe: null,
    invitationEnSourdine: false,
  }
}

function afficher() {
  return render(
    <UtilisateursTab cabinets={[CABINET]} cabinetChoisi={CABINET.id} onChoisirCabinet={vi.fn()} />,
  )
}

beforeEach(() => {
  etat.comptes = []
  etat.comptesLisibles = true
  vi.clearAllMocks()
})

describe('UtilisateursTab — les 2 actions, au bon moment', () => {
  it('une fiche SANS COMPTE se voit proposer l’invitation, pas la réinitialisation', () => {
    etat.comptes = [compte('sans_compte')]
    afficher()
    expect(screen.getByRole('button', { name: /Renvoyer l'invitation/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Réinitialiser/ })).toBeNull()
  })

  it('un compte ACTIF se voit proposer la réinitialisation, pas l’invitation', () => {
    etat.comptes = [compte('actif')]
    afficher()
    expect(screen.getByRole('button', { name: /Réinitialiser/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Renvoyer l'invitation/ })).toBeNull()
  })

  it('MOT DE PASSE À CHOISIR mène à la réinitialisation — sinon le compte reste bloqué', () => {
    // Le trou trouvé pendant le lot 1 : un secrétariat qui a ouvert son lien
    // sans choisir de mot de passe n'était ni en attente, ni vraiment actif.
    etat.comptes = [compte('mot_de_passe_a_choisir')]
    afficher()
    expect(screen.getByRole('button', { name: /Réinitialiser/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Renvoyer l'invitation/ })).toBeNull()
  })

  it('une fiche DÉSACTIVÉE ne propose aucune des deux actions', () => {
    etat.comptes = [compte('actif', false)]
    afficher()
    expect(screen.queryByRole('button', { name: /Réinitialiser/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Renvoyer l'invitation/ })).toBeNull()
  })

  it('quand l’état des comptes est illisible, l’écran le DIT', () => {
    etat.comptes = [compte('actif')]
    etat.comptesLisibles = false
    afficher()
    expect(screen.getByText(/n'a pas pu être lu/)).toBeTruthy()
  })

  it('sans cabinet choisi, il n’affiche pas une liste vide mais une consigne', () => {
    render(<UtilisateursTab cabinets={[CABINET]} cabinetChoisi={null} onChoisirCabinet={vi.fn()} />)
    expect(screen.getByText(/Choisis un cabinet/)).toBeTruthy()
  })
})
