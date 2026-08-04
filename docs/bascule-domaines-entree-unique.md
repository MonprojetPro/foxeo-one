# Bascule des domaines + entrée de connexion unique

> Décidé par MiKL le 2026-08-03. Ce document est la référence unique pour la bascule :
> il sert de guide d'actions (MiKL), de consigne pour la fenêtre qui tient le site
> vitrine, et de trace des choix d'architecture.

## 1. La cible

```
                    www.monprojet-pro.com          (site vitrine — déjà en ligne)
                              │
                        [ Connexion ]
                              │  redirection simple, aucun formulaire ici
                              ▼
                 app.monprojet-pro.com/login        ← ENTRÉE UNIQUE
                              │
              ┌───────────────┴───────────────┐
        compte client                   compte opérateur
              │                                │
              ▼                                ▼
   Lab ou One, sur place        hub.monprojet-pro.com  (+ code 2FA)
   (même déploiement)            via jeton de bascule à usage unique
```

**Trois principes tenus :**

1. **Le site vitrine ne voit jamais un mot de passe.** Son bouton « Connexion » est un
   simple lien. Aucune session, aucun cookie, aucune clé côté site public.
2. **L'utilisateur ne choisit pas son dashboard.** Il se connecte, le système sait où
   l'envoyer. Une seule adresse à retenir et à communiquer.
3. **Aucun raccourci de sécurité.** Un opérateur arrive au Hub avec une session AAL1 :
   le code 2FA lui est réclamé exactement comme lors d'une connexion directe.

## 2. Comment un opérateur passe d'un sous-domaine à l'autre

Le Hub et l'app client sont deux domaines distincts : **ils ne partagent aucun cookie**,
et c'est voulu — une session opérateur n'a rien à faire sur le domaine des clients.

La page de login, après avoir vérifié le mot de passe, émet un **jeton de connexion à
usage unique** (`generateLink` admin) que le Hub consomme sur `/auth/handoff` pour y
poser sa propre session. C'est exactement le mécanisme de l'impersonation, en production
depuis juillet 2026.

| Fichier | Rôle |
|---|---|
| `packages/supabase/src/hub-handoff.ts` | Émet le jeton (service-role, serveur uniquement) |
| `apps/hub/app/(auth)/auth/handoff/route.ts` | Consomme le jeton, revérifie que le compte est opérateur, pose la session |
| `apps/client/app/(auth)/actions/auth.ts` | Détecte l'opérateur au login et déclenche la bascule |
| `packages/utils/src/app-urls.ts` | Source unique des URLs — `getLoginEntryUrl()` |

**Verrou d'accès au Hub** : la table `operators` n'a **aucune policy INSERT** — personne
ne peut s'y ajouter via l'API, seule une intervention service-role le peut. Un compte
absent de cette table est refusé au login Hub, refusé par le middleware, et refusé une
troisième fois par la passerelle. Une seule ligne y existe : `contact@monprojet-pro.com`.

## 3. À faire par MiKL — dans cet ordre

### ⓵ DNS (chez le registrar de `monprojet-pro.com`)

Deux enregistrements à créer (`www` existe déjà) :

| Nom | Type | Valeur |
|---|---|---|
| `app` | CNAME | `cname.vercel-dns.com` |
| `hub` | CNAME | `cname.vercel-dns.com` |

> Vercel affiche la valeur exacte à utiliser au moment où on ajoute le domaine (étape ⓶) —
> prendre celle qu'il indique plutôt que celle-ci si elle diffère.

### ⓶ Vercel — un domaine par projet

- Projet **client** → Settings › Domains → ajouter `app.monprojet-pro.com`
- Projet **hub** → Settings › Domains → ajouter `hub.monprojet-pro.com`

### ⓷ Vercel — variables d'environnement

Sur **les deux** projets (Production) :

```
NEXT_PUBLIC_CLIENT_URL = https://app.monprojet-pro.com
NEXT_PUBLIC_HUB_URL    = https://hub.monprojet-pro.com
NEXT_PUBLIC_SITE_URL   = https://www.monprojet-pro.com
```

Sur le projet **hub** uniquement, ajouter en plus :

```
NEXT_PUBLIC_AUTH_SESSION_COOKIES = true
```

C'est elle qui rend la session du cockpit éphémère : fermer le navigateur déconnecte.
Surtout **ne pas la poser sur le projet client** — les clients seraient déconnectés à
chaque fermeture de navigateur, une friction quotidienne qu'ils te signaleraient vite.
La coupure de 2 h du matin, elle, est active sans aucune variable.

**À vérifier sur le projet client** : `SUPABASE_SERVICE_ROLE_KEY` doit y être présente —
c'est elle qui permet d'émettre le jeton de bascule vers le Hub. Si elle manque, le login
d'un opérateur affiche « Connexion au cockpit indisponible » (le login Hub direct reste
utilisable : aucun risque de rester dehors).

Puis **redéployer les deux projets** — les variables `NEXT_PUBLIC_*` sont figées au build.

### ⓸ Supabase — Authentication › URL Configuration

- **Site URL** → `https://app.monprojet-pro.com`
- **Redirect URLs** → ajouter, en gardant les anciennes le temps de la transition :
  ```
  https://app.monprojet-pro.com/**
  https://hub.monprojet-pro.com/**
  ```

> C'est ce **Site URL** qui explique le libellé `localhost:3000` dans Google
> Authenticator : l'application d'authentification affiche le nom qui était configuré
> **le jour de l'enrôlement**. Le corriger ici ne renomme pas l'entrée existante — seul
> un ré-enrôlement le fera (mis de côté, à traiter plus tard).

### ⓹ Supabase — Edge Functions › Secrets

```
CLIENT_APP_URL     = https://app.monprojet-pro.com
HUB_URL            = https://hub.monprojet-pro.com
MONITOR_CLIENT_URL = https://app.monprojet-pro.com
MONITOR_HUB_URL    = https://hub.monprojet-pro.com
```

Sans ça, les liens des emails transactionnels (invitation Lab, activation après paiement)
continueraient de pointer vers les adresses Vercel, et la surveillance de santé
mesurerait les anciennes URLs.

### ⓺ Google Cloud Console — OAuth

Les callbacks se construisent depuis l'adresse réellement utilisée : dès que le Hub
répond sur son nouveau domaine, Google doit le connaître, sinon `redirect_uri_mismatch`.

Dans les identifiants OAuth, **ajouter** (sans retirer les anciennes tout de suite) :

```
https://hub.monprojet-pro.com/api/gmail/callback
https://hub.monprojet-pro.com/api/auth/google-calendar/callback
```

### ⓻ Webhooks tiers — après vérification

Cal.com, Pennylane, MenuFacile et le formulaire de contact appellent le Hub. Tant que
l'adresse Vercel reste active, **rien ne casse** : à migrer une fois le nouveau domaine
confirmé, puis à revérifier un par un.

## 4. Consigne pour la fenêtre qui tient le site vitrine

> À transmettre telle quelle.

**Ce qu'il faut ajouter au site `www.monprojet-pro.com` :**

1. Un bouton **« Connexion »** dans l'en-tête (et au pied de page si la charte s'y prête),
   visible sur toutes les pages.
2. Ce bouton est **un simple lien** vers l'entrée unique :
   - aujourd'hui : `https://monprojetpro-client.vercel.app/login`
   - après la bascule DNS : `https://app.monprojet-pro.com/login`

   Prévoir cette URL **dans une variable d'environnement** (par ex. `PUBLIC_APP_LOGIN_URL`)
   plutôt qu'écrite en dur dans le JSX : la bascule se fera alors sans toucher au code.

**Ce qu'il ne faut surtout PAS faire :**

- ❌ Aucun formulaire email/mot de passe sur le site vitrine — décision explicite de MiKL.
  Le site ne doit jamais manipuler d'identifiants ni de session.
- ❌ Aucun appel au client Supabase depuis le site, aucune clé Supabase dans ses variables.
- ❌ Pas de lien séparé « Espace Hub » / « Espace Lab » / « Espace One » : **une seule
  entrée**, l'aiguillage se fait après connexion. Un lien direct vers le Hub trahirait
  publiquement l'adresse du cockpit sans rien apporter.
- ❌ Ne pas ouvrir dans un nouvel onglet avec `target="_blank"` sans `rel="noopener"`.

**Copy suggérée** : `Connexion` (et non « Espace client » — l'entrée sert aussi à
l'opérateur). Un `Se connecter à mon espace` fonctionne aussi en bouton d'appel à l'action.

## 5. Vérification après bascule — par la preuve, jamais de mémoire

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://app.monprojet-pro.com/login   # attendu 200
curl -s -o /dev/null -w "%{http_code}\n" https://hub.monprojet-pro.com         # attendu 307
```

Puis, à la main :

1. Sur le site → bouton **Connexion** → on arrive bien sur la page de login unique.
2. Login avec un **compte client de test** → on reste sur l'app, dans le bon mode.
3. Login avec **contact@monprojet-pro.com** → propulsion vers le Hub, **le code 2FA est
   demandé**, puis le cockpit s'ouvre.
4. Login avec un compte client sur l'entrée unique → **aucune trace** indiquant qu'un
   cockpit existe (pas de message d'erreur différent, pas de redirection).
5. Un email transactionnel (invitation Lab) → le lien pointe vers le **nouveau** domaine.

## 6. Ce qui reste ouvert

- **Ré-enrôlement 2FA** (efface le libellé `localhost:3000`) — reporté par MiKL, nécessite
  d'abord un bouton « Désactiver / Régénérer » sur la page profil du Hub.
- **CORS de `elio-chat`** encore en `*` (point 1 de l'audit du 2026-07-03) — à restreindre
  aux domaines définitifs une fois la bascule faite, pas avant : les origines changeraient
  deux fois.
- **Retrait des adresses Vercel** des autorisations (Google, Supabase, webhooks) — une fois
  le nouveau domaine confirmé stable, pas le jour même.
