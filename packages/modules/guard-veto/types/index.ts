/**
 * Ce que le guichet GuardVeto rend au Hub (item B-212 côté GuardVeto).
 *
 * 🔑 `equipe: null` et `comptesLisibles: false` ne sont PAS des détails : si
 * l'API Auth de GuardVeto est illisible, le guichet renvoie `null` plutôt que
 * des zéros. L'écran doit donc savoir dire « je ne sais pas » au lieu
 * d'afficher « 0 compte actif » — un chiffre faux est pire qu'une case vide,
 * parce qu'on le croit.
 */

export type EtatCompte =
  | 'sans_compte'
  | 'invitation_en_attente'
  | 'mot_de_passe_a_choisir'
  | 'actif'

export interface EquipeCabinet {
  vetosActifs: number
  secretariatActif: number
  comptesActifs: number
  invitationsEnAttente: number
  sansCompte: number
}

export interface PeriodeGarde {
  id: string
  debut: string
  fin: string
  statut: string | null
}

export interface PeriodesCabinet {
  enCours: PeriodeGarde | null
  prochaine: PeriodeGarde | null
  derniereFin: string | null
}

export interface CabinetGuardVeto {
  id: string
  nom: string
  ville: string | null
  actif: boolean
  bacASable: boolean
  modules: string[]
  creeLe: string | null
  /** `null` quand l'API Auth de GuardVeto n'a pas pu être lue. */
  equipe: EquipeCabinet | null
  derniereConnexion: string | null
  periodes: PeriodesCabinet
  support: { aTraiter: number }
  generations: { nb30j: number; derniere: string | null }
}

export interface CabinetsReponse {
  cabinets: CabinetGuardVeto[]
  jour: string
  comptesLisibles: boolean
}

export interface CompteGuardVeto {
  genre: 'veterinaire' | 'secretaire'
  id: string
  cabinetId: string
  nom: string | null
  email: string | null
  role: string | null
  actif: boolean
  etat: EtatCompte
  derniereConnexion: string | null
  inviteLe: string | null
  invitationEnSourdine: boolean
}

export interface ComptesReponse {
  comptes: CompteGuardVeto[]
  comptesLisibles: boolean
}

/** Les 2 seules actions ouvertes au Hub — choix de MiKL du 11/11. */
export type ActionCompte = 'inviter' | 'reinitialiser'

/**
 * Rappel d'abonnement — lecture seule, calculé CÔTÉ HUB.
 *
 * 🔑 Il ne vient pas du guichet : GuardVeto ne sait rien de la facturation.
 * Les chiffres sortent de la Comptabilité du Hub, via la formule unique de
 * `facturation/server`. Un module ne pouvant pas en importer un autre, c'est
 * la page `apps/hub` qui calcule et injecte — jamais ce module.
 */
export interface RappelAbonnement {
  clientId: string | null
  clientNom: string | null
  offre: string | null
  montantEnAttenteCents: number
  facturesEnAttente: number
  derniereFactureLe: string | null
  /** Vrai quand aucun abonnement récurrent n'est enregistré pour ce client. */
  sansAbonnement: boolean
}
