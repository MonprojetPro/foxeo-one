'use client'

import { createContext, useContext } from 'react'

/**
 * Contexte d'accès du client connecté — porte l'état « espace figé ».
 *
 * POURQUOI UN CONTEXTE ET PAS DES PROPS
 * Les boutons d'action du parcours sont enfouis très profond (page → timeline → carte
 * d'étape → panneau Élio → bouton). Faire descendre l'information par props obligerait
 * à toucher une dizaine de composants intermédiaires, et le premier qu'on oublierait
 * laisserait un bouton actif — donc une coquille vide qui échoue au clic.
 *
 * Défaut `false` : les mêmes composants de parcours sont montés dans le Hub, où il
 * n'y a pas de provider. Sans provider, rien n'est jamais désactivé.
 */
const ClientAccessContext = createContext<{ readOnly: boolean }>({ readOnly: false })

export function ClientAccessProvider({
  readOnly,
  children,
}: {
  readOnly: boolean
  children: React.ReactNode
}) {
  return (
    <ClientAccessContext.Provider value={{ readOnly }}>
      {children}
    </ClientAccessContext.Provider>
  )
}

/** true quand l'abonnement du client est terminé : son espace est consultable, pas modifiable. */
export function useClientReadOnly(): boolean {
  return useContext(ClientAccessContext).readOnly
}
