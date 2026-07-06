'use client'

import { useEffect, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Separator,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { HeartHandshake, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  getCoachingCreditsInfo,
  setCoachingMonthlyCredits,
  addCoachingCredits,
  type CoachingLedgerEntry,
} from '../actions/coaching-credits'

const REASON_LABELS: Record<CoachingLedgerEntry['reason'], string> = {
  monthly_accrual: 'Crédit mensuel',
  session_booked: 'Séance réservée',
  manual_adjust: 'Ajustement manuel',
  session_cancelled: 'Séance annulée',
  initial_grant: 'Crédit initial',
}

export const coachingCreditsKey = (clientId: string) => ['coaching-credits', clientId] as const

interface CoachingCreditsPanelProps {
  clientId: string
}

/**
 * Panneau « Coaching One+ » de la fiche client (onglet Paramètres, à côté de l'abonnement).
 * Visible UNIQUEMENT pour les clients One+ (elio_tier='one_plus') — le panneau se masque
 * tout seul sinon. Affiche : solde, crédits/mois (éditable), recharge manuelle, historique.
 */
export function CoachingCreditsPanel({ clientId }: CoachingCreditsPanelProps) {
  const queryClient = useQueryClient()
  const [isPendingAction, startTransition] = useTransition()
  const [monthlyInput, setMonthlyInput] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addAmount, setAddAmount] = useState('1')
  const [addNote, setAddNote] = useState('')

  const { data, isPending } = useQuery({
    queryKey: coachingCreditsKey(clientId),
    queryFn: async () => {
      const result = await getCoachingCreditsInfo(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!clientId,
    staleTime: 30_000,
  })

  // Realtime : un débit/recrédit posé par le webhook Cal.com (réservation/annulation client)
  // rafraîchit le solde sans reload — coaching_credit_ledger est dans la publication.
  useEffect(() => {
    if (!clientId) return
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel(`hub-coaching-credits:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coaching_credit_ledger',
          filter: `client_id=eq.${clientId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: coachingCreditsKey(clientId) })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, queryClient])

  if (isPending) {
    return <div className="h-40 rounded-xl bg-muted animate-pulse" data-testid="coaching-credits-skeleton" />
  }

  // Panneau réservé aux clients One+ (offre coaching)
  if (!data || data.elioTier !== 'one_plus') return null

  const monthlyValue = monthlyInput ?? String(data.monthlyCredits)
  const monthlyChanged = Number(monthlyValue) !== data.monthlyCredits

  const invalidate = () => queryClient.invalidateQueries({ queryKey: coachingCreditsKey(clientId) })

  const handleSaveMonthly = () => {
    const n = Number(monthlyValue)
    if (!Number.isInteger(n) || n < 0 || n > 30) {
      showError('Crédits/mois : entier entre 0 et 30')
      return
    }
    startTransition(async () => {
      const result = await setCoachingMonthlyCredits(clientId, n)
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess(`Crédits mensuels mis à jour : ${n}/mois`)
      setMonthlyInput(null)
      await invalidate()
    })
  }

  const handleAddCredits = () => {
    const n = Number(addAmount)
    if (!Number.isInteger(n) || n === 0 || n < -50 || n > 50) {
      showError('Nombre de crédits invalide (entier non nul, -50 à 50)')
      return
    }
    startTransition(async () => {
      const result = await addCoachingCredits(clientId, n, addNote.trim() || undefined)
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess(
        n > 0
          ? `${n} crédit(s) ajouté(s) — nouveau solde : ${result.data?.balance ?? '—'}`
          : `${Math.abs(n)} crédit(s) retiré(s) — nouveau solde : ${result.data?.balance ?? '—'}`
      )
      setAddOpen(false)
      setAddAmount('1')
      setAddNote('')
      await invalidate()
    })
  }

  return (
    <Card data-testid="coaching-credits-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="h-4 w-4 text-violet-400" />
          Coaching One+
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddOpen((v) => !v)}
          data-testid="coaching-add-credits-button"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Ajouter des crédits
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Solde actuel */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Solde actuel</span>
            <span className="text-lg font-bold" data-testid="coaching-balance">
              {data.balance} séance{Math.abs(data.balance) > 1 ? 's' : ''}
            </span>
          </div>

          <Separator />

          {/* Crédits par mois (éditable) */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Crédits par mois</p>
              <p className="text-xs text-muted-foreground">
                Séances incluses ajoutées le 1ᵉʳ de chaque mois (cumulables)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={30}
                value={monthlyValue}
                onChange={(e) => setMonthlyInput(e.target.value)}
                className="w-20 text-right"
                aria-label="Crédits coaching par mois"
                data-testid="coaching-monthly-input"
              />
              {monthlyChanged && (
                <Button size="sm" onClick={handleSaveMonthly} disabled={isPendingAction}>
                  {isPendingAction ? '…' : 'Enregistrer'}
                </Button>
              )}
            </div>
          </div>

          {/* Formulaire de recharge manuelle */}
          {addOpen && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={-50}
                  max={50}
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-20 text-right"
                  aria-label="Nombre de crédits à ajouter"
                  data-testid="coaching-add-amount-input"
                />
                <Input
                  type="text"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="Note (optionnel) — ex : geste commercial"
                  maxLength={500}
                  aria-label="Note du mouvement"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={isPendingAction}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleAddCredits} disabled={isPendingAction} data-testid="coaching-add-confirm">
                  {isPendingAction ? 'Ajout…' : 'Confirmer'}
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Historique des 10 derniers mouvements */}
          <div>
            <p className="text-sm font-medium mb-2">Derniers mouvements</p>
            {data.recentLedger.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun mouvement pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-1.5" data-testid="coaching-ledger-list">
                {data.recentLedger.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <span>{REASON_LABELS[entry.reason]}</span>
                      {entry.note && (
                        <span className="block truncate text-xs text-muted-foreground">{entry.note}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.createdAt), 'd MMM yyyy', { locale: fr })}
                      </span>
                      <span
                        className={
                          entry.delta > 0
                            ? 'font-semibold text-emerald-500'
                            : 'font-semibold text-red-400'
                        }
                      >
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

CoachingCreditsPanel.displayName = 'CoachingCreditsPanel'
