# Module Email — Guide

Permet d'envoyer et recevoir des emails depuis la fiche CRM client avec transformation Élio.

## Prérequis

Variables d'environnement dans `.env.local` :
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_HUB_URL=http://localhost:3002
```

## Connexion Gmail

1. Aller sur une fiche client → onglet "Emails"
2. Cliquer "Connecter Gmail"
3. Autoriser l'accès à contact@monprojet-pro.com
4. Retour automatique sur la fiche client

## URIs de redirection à configurer dans Google Cloud Console

- Dev : `http://localhost:3002/api/gmail/callback`
- Prod : `https://hub.monprojet-pro.com/api/gmail/callback`

## Envoi avec Élio

1. Écrire le message brut
2. Cliquer "Transformer avec Élio"
3. Élio reformule selon le profil de communication du client
4. Modifier si nécessaire → Envoyer
