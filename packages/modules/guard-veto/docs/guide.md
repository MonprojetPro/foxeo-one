# GuardVeto — guide

Cockpit d'administration du produit **GuardVeto** depuis le Hub, sur le modèle de MenuFacile.

## Ce que c'est

GuardVeto est un logiciel de gardes vétérinaires, avec sa propre base et son propre déploiement.
Ce module permet de le piloter depuis le Hub **sans jamais toucher à sa base** : tout passe par
son guichet HTTP `/api/hub/*`, protégé par un secret partagé.

## Les trois onglets

| Onglet | Ce qu'on y voit | Ce qu'on peut y faire |
|---|---|---|
| **Tableau de bord** | Cabinets clients, comptes actifs, gardes en cours, support à traiter | Rien — lecture seule |
| **Cabinets** | Une carte par cabinet : équipe, périodes de garde, dernière connexion, rappel d'abonnement | Ouvrir les comptes du cabinet, aller à la Comptabilité |
| **Utilisateurs** | Les comptes d'un cabinet et leur état | Renvoyer l'invitation · Réinitialiser l'accès |

## Les quatre états d'un compte

- **Sans compte** — la fiche existe, aucun compte n'a été créé. → *Renvoyer l'invitation*
- **Invitation en attente** — l'invitation est partie, le lien n'a pas été ouvert. → *Renvoyer l'invitation*
- **Mot de passe à choisir** — le lien a été ouvert, mais aucun mot de passe défini. → *Réinitialiser l'accès*
- **Actif** — le compte est ouvert et utilisé. → *Réinitialiser l'accès*

Chaque action n'apparaît que là où elle a un sens : un bouton qui ne peut que refuser est pire
que pas de bouton.

## Le rappel d'abonnement

En **lecture seule**. Il affiche l'offre du client, le montant en attente de paiement et la date
de la dernière facture, avec un raccourci vers la Comptabilité. Rien ne s'édite ici : la
facturation se pilote à un seul endroit.

Le rattachement cabinet ↔ client du Hub vit dans la configuration (`system_config`, clé
`guardveto_cabinet_clients`), jamais dans le code. Tant qu'il n'est pas renseigné, l'écran le dit.

## Branchement

Deux variables d'environnement côté Hub, jamais préfixées `NEXT_PUBLIC_` :

- `GUARDVETO_ADMIN_API_URL` — l'URL du guichet, par exemple `https://guardveto.vercel.app/api/hub`
- `GUARDVETO_ADMIN_API_SECRET` — le secret partagé, au moins 32 caractères

Le même secret doit être posé côté GuardVeto sous le nom `HUB_GUICHET_SECRET`. Sans lui, le
guichet répond volontairement 503 : un guichet sans secret refuse, il n'ouvre pas.
