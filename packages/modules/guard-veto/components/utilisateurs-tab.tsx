'use client'

import { useState } from 'react'
import { KeyRound, Mail, Users } from 'lucide-react'
import { CockpitPanel, EmptyRow, RowSkeleton, showError, showSuccess } from '@monprojetpro/ui'
import { useActionCompteGuardVeto, useGuardVetoComptes } from '../hooks/use-guard-veto'
import type { ActionCompte, CabinetGuardVeto, CompteGuardVeto } from '../types'
import { ETATS, formatJour } from '../utils/format'

export interface UtilisateursTabProps {
  cabinets: CabinetGuardVeto[]
  cabinetChoisi: string | null
  onChoisirCabinet: (id: string) => void
}

const ACTION_CLASS =
  'inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50'

/**
 * Onglet 3 — les comptes d'un cabinet, et les DEUX seules actions voulues par
 * MiKL le 11/11 : renvoyer l'invitation, réinitialiser l'accès.
 *
 * 🔑 CHAQUE ACTION N'APPARAÎT QUE LÀ OÙ ELLE A UN SENS. « Renvoyer
 * l'invitation » sur un compte déjà actif, ou « Réinitialiser » sur une fiche
 * sans compte, enverraient MiKL buter sur un refus du guichet. Un bouton qui
 * ne peut que refuser est pire que pas de bouton.
 */
export function UtilisateursTab({ cabinets, cabinetChoisi, onChoisirCabinet }: UtilisateursTabProps) {
  const [enCours, setEnCours] = useState<string | null>(null)
  const { data, isLoading } = useGuardVetoComptes(cabinetChoisi)
  const action = useActionCompteGuardVeto()

  function lancer(compte: CompteGuardVeto, quoi: ActionCompte) {
    setEnCours(`${compte.id}:${quoi}`)
    action.mutate(
      { action: quoi, genre: compte.genre, id: compte.id },
      {
        onSuccess: (res) => {
          // Le destinataire est RENDU : « envoyé » sans dire à qui, c'est ce
          // qui a déjà fait renvoyer deux fois le même lien sur les factures.
          showSuccess(
            res?.envoyeA
              ? `Message envoyé à ${res.envoyeA}`
              : quoi === 'inviter'
                ? 'Invitation envoyée'
                : 'Lien de réinitialisation envoyé',
          )
          setEnCours(null)
        },
        onError: (e: Error) => {
          showError(e.message)
          setEnCours(null)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="gv-cabinet" className="text-xs font-medium text-gray-400">
          Cabinet
        </label>
        <select
          id="gv-cabinet"
          value={cabinetChoisi ?? ''}
          onChange={(e) => onChoisirCabinet(e.target.value)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
        >
          <option value="">Choisir un cabinet…</option>
          {cabinets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
              {c.bacASable ? ' (bac à sable)' : ''}
            </option>
          ))}
        </select>
      </div>

      {!cabinetChoisi ? (
        <EmptyRow icon={Users}>Choisis un cabinet pour voir ses comptes</EmptyRow>
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : !data || data.comptes.length === 0 ? (
        <EmptyRow icon={Users}>Aucun compte dans ce cabinet</EmptyRow>
      ) : (
        <CockpitPanel title="Comptes" badge={data.comptes.length}>
          {!data.comptesLisibles && (
            <p className="mb-3 rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
              L&apos;état des comptes n&apos;a pas pu être lu chez GuardVeto. Les fiches sont
              affichées, leur état ne l&apos;est pas.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {data.comptes.map((compte) => {
              const etat = ETATS[compte.etat]
              const peutInviter =
                compte.actif &&
                (compte.etat === 'sans_compte' || compte.etat === 'invitation_en_attente')
              const peutReinitialiser =
                compte.actif &&
                (compte.etat === 'actif' || compte.etat === 'mot_de_passe_a_choisir')

              return (
                <div
                  key={`${compte.genre}-${compte.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {compte.nom ?? 'Sans nom'}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {compte.genre === 'veterinaire' ? 'vétérinaire' : 'secrétariat'}
                        {compte.role ? ` · ${compte.role}` : ''}
                        {!compte.actif ? ' · désactivé' : ''}
                      </span>
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {compte.email ?? 'Pas d’adresse e-mail'} · {etat.aide}
                    </p>
                    <p className="text-xs text-gray-600">
                      Dernière connexion {formatJour(compte.derniereConnexion)}
                      {compte.inviteLe ? ` · invité le ${formatJour(compte.inviteLe)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-gray-300">
                      {etat.label}
                    </span>

                    {peutInviter && (
                      <button
                        type="button"
                        onClick={() => lancer(compte, 'inviter')}
                        disabled={enCours !== null}
                        className={ACTION_CLASS}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {enCours === `${compte.id}:inviter` ? 'Envoi…' : "Renvoyer l'invitation"}
                      </button>
                    )}

                    {peutReinitialiser && (
                      <button
                        type="button"
                        onClick={() => lancer(compte, 'reinitialiser')}
                        disabled={enCours !== null}
                        className={ACTION_CLASS}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {enCours === `${compte.id}:reinitialiser` ? 'Envoi…' : "Réinitialiser l'accès"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CockpitPanel>
      )}
    </div>
  )
}
