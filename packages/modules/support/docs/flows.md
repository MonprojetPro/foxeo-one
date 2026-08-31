# Module Support — Flows

## Flow 1 : Signalement client

1. Client clique "Signaler" (header Lab, FAQ, ou "+" de "Mes signalements") → Dialog s'ouvre
2. Client remplit : type, sujet, description, jusqu'à 3 pièces jointes (optionnel)
3. À l'envoi : compression des images côté navigateur, puis upload direct navigateur → Supabase Storage (pas de passage par le serveur Next.js — voir `lib/upload-attachments.ts`)
4. Server Action `createSupportTicket()` crée le ticket avec les URLs déjà uploadées (`screenshotUrls`)
5. Notification `alert` insérée pour l'opérateur (MiKL)
6. Toast confirmation côté client
7. Liste "Mes signalements" mise à jour via invalidation TanStack Query

## Flow 2 : Traitement ticket (MiKL)

1. MiKL reçoit notification → accède au CRM
2. Voit le ticket dans l'onglet Support du client
3. Change statut : open → in_progress → resolved → closed
4. Server Action `updateTicketStatus()` met à jour la DB

## Flow 3 : FAQ / Aide

1. Client clique "Aide" → Page FAQ s'affiche
2. Catégories collapsibles : Premiers pas, Parcours Lab, Espace One, Compte, Contact
3. Barre de recherche filtre les questions en temps réel
4. Liens en bas : "Contacter MiKL" (vers chat) et "Signaler un problème" (vers dialog)
