# Module Email — Flows

## Flow 1 : Connexion Gmail
1. MiKL clique "Connecter Gmail" → `/api/gmail/auth?returnTo=/modules/crm/clients/{id}`
2. Redirect vers Google OAuth (scopes: gmail.readonly, gmail.send)
3. Callback → `/api/gmail/callback` → échange code → stocke tokens dans `gmail_integrations`
4. Redirect vers la fiche client avec `?gmail_connected=1`

## Flow 2 : Lecture emails
1. Ouverture onglet Emails → `getClientThreads(clientId)` → Gmail API search by email
2. Clic thread → `getThreadMessages(threadId)` → affichage messages
3. Token expiré → refresh automatique via `getValidAccessToken()`

## Flow 3 : Envoi avec Élio
1. Bouton "Nouveau mail" ou "Répondre" → EmailComposer
2. MiKL écrit message brut
3. Clic "Transformer avec Élio" → `transformMessageForClient({ clientId, rawMessage })`
4. Élio reformule selon le profil de communication
5. MiKL valide/modifie → clic "Envoyer le message reformulé"
6. `sendEmail()` → Gmail API → `messages/send`
