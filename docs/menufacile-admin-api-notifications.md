# Brief à coller dans la session MenuFacile — endpoint de notification à tous les utilisateurs

> Écrit le 2026-09-20 depuis le dépôt **Hub MonprojetPro** (`foxeo-one`), pour la session
> Claude Code qui travaille sur le dépôt **MenuFacile**. Item de board : **T-033**.
>
> **À lire d'abord par la session MenuFacile, à ne pas exécuter tête baissée** : la partie 1
> est un état des lieux que seule cette session peut faire. La partie 2 ne vaut qu'après.

---

## Le besoin, en une phrase

MiKL veut pouvoir **envoyer une notification à tous les utilisateurs de MenuFacile depuis le
Hub**, pour leur signaler une information (nouveauté, message important, incident).

C'est le **second canal de diffusion** après l'encart d'accueil, qui existe déjà
(`GET/PUT /home-banner`). La différence est le mode, pas le contenu :

| Canal | Comportement | Existe ? |
|---|---|---|
| Encart d'accueil (`/home-banner`) | **Passif** — visible quand l'utilisateur ouvre l'appli | ✅ oui |
| Notification | **Active** — va chercher l'utilisateur | ❌ c'est l'objet de ce brief |

---

## Pourquoi ce brief existe : le Hub ne peut rien faire seul

Le Hub n'a **aucun accès** à la base ni aux utilisateurs de MenuFacile. Il ne peut faire que ce
que le guichet `admin-api` expose. Inventaire réel des endpoints appelés aujourd'hui
(relevé par `grep` sur `packages/modules/menu-facile/actions/`) :

```
/home-banner                        GET, PUT
/metrics                            GET
/metrics/households-distribution    GET
/metrics/retention-cohorts          GET
/official-recipes                   GET, POST, PUT, DELETE
/contact-messages/resolve           POST
/moderation/ban                     POST
/moderation/hide                    POST
/moderation/resolve-report          POST
```

**Aucun ne concerne les notifications.** Tant que le guichet n'expose rien, il n'y a rien à
construire côté Hub — un écran d'envoi qui n'a personne à qui parler est une coquille vide.

⚠️ **Deux précédents sur ce même guichet, à ne pas rejouer** : `/official-recipes/:id` (détail
d'une recette) n'existe pas, ce qui a laissé un formulaire d'édition à 4 champs ; et `/metrics`
ne rend que des totaux, sans séries temporelles, ce qui a bloqué tous les graphiques d'évolution.
Dans les deux cas, la capacité a été supposée présente puis découverte absente **après** le
développement. D'où l'état des lieux ci-dessous, avant tout code.

---

## Partie 1 — État des lieux (à établir dans le dépôt MenuFacile, par la preuve)

Le Hub ne peut répondre à aucune de ces questions. Merci de les trancher **en regardant le code
et la base**, pas de mémoire, et de renvoyer les réponses telles quelles.

1. **Existe-t-il déjà un système de notification dans l'appli ?**
   - une table (`notifications`, `announcements`, `messages`… ) ? sa structure ?
   - un affichage côté appli (cloche, bandeau, badge) ? où ?
   - si oui : **le réutiliser**, ne pas en créer un second.

2. **Le push système est-il possible aujourd'hui ?**
   - des jetons d'appareil sont-ils collectés (FCM / APNs / Web Push) ? dans quelle table ?
   - l'appli est-elle native, PWA, ou web ? (détermine ce qui est faisable)
   - si aucun jeton n'est collecté, le push est **hors de portée à court terme** : il faut
     d'abord instrumenter l'appli, ce qui est un chantier à part.

3. **Combien d'utilisateurs sont concernés ?** Le chiffre change la conception : 50 destinataires
   se traitent en une requête, 50 000 demandent une file d'attente et un envoi par lots.

4. **Y a-t-il un historique d'envoi exploitable** (qui a envoyé quoi, quand, à combien de monde) ?

5. **Realtime** : l'appli écoute-t-elle déjà la base en temps réel (comme elle le fait pour
   `home-banner`) ? Si oui, une notification in-app peut apparaître instantanément sans push.

---

## Partie 2 — Contrat d'API proposé (à ajuster selon la partie 1)

Calqué **exactement** sur les conventions du guichet existant, pour que le Hub n'ait aucune
exception à gérer :

- authentification : `Authorization: Bearer <MENUFACILE_ADMIN_API_SECRET>`
- réponses : `{ data: … }` en succès, `{ error: "message" }` en échec, **toujours en JSON**
- `{ ok: true }` accepté pour les écritures sans contenu de retour

### `POST /notifications` — créer et diffuser

```jsonc
// Corps de la requête
{
  "title": "string, obligatoire, max 120",
  "body": "string, obligatoire, max 2000",
  "link_url": "string, optionnel — vers quoi la notification renvoie dans l'appli",
  "audience": "all",          // seule valeur nécessaire aujourd'hui ; laisser la porte
                              // ouverte à 'active' / 'inactive' plus tard
  "channel": "in_app"         // 'in_app' | 'push' | 'both' — selon ce que la partie 1 permet
}
```

```jsonc
// Réponse attendue
{
  "data": {
    "id": "uuid",
    "recipients": 1234,        // ← NOMBRE RÉEL de destinataires touchés
    "sent_at": "2026-09-20T21:30:00Z",
    "channel": "in_app"
  }
}
```

🔑 **`recipients` n'est pas un confort d'affichage, c'est le garde-fou principal.** Le Hub
affichera ce nombre en confirmation **avant** l'envoi (via le point suivant) et **après**.
Une notification partie à toute la base ne se rattrape pas.

### `GET /notifications` — historique

Les 50 derniers envois, du plus récent au plus ancien :

```jsonc
{ "data": [ { "id", "title", "body", "link_url", "audience", "channel",
              "recipients", "sent_at" } ] }
```

Sans cet endpoint, MiKL ne saura jamais ce qu'il a déjà envoyé ni à quand remonte le dernier
message — et il enverra deux fois la même chose.

### `GET /notifications/audience-count?audience=all` — compter AVANT d'envoyer

```jsonc
{ "data": { "count": 1234 } }
```

Permet d'afficher « Cette notification partira à **1 234 utilisateurs** » dans la confirmation.
**Un envoi de masse sans compteur préalable est un envoi à l'aveugle.**

### `DELETE /notifications/:id` — retirer (optionnel, mais recommandé)

Pour une notification in-app, permet de la retirer en cas d'erreur (faute, mauvais lien). Un push
déjà parti ne se rappelle pas — mais l'in-app, si. À implémenter seulement si le canal est in-app.

---

## Zones d'ombre — hypothèses par défaut du Hub

MiKL n'a pas tranché ces points ; voici ce que le Hub suppose. **À corriger si la partie 1
montre autre chose.**

| # | Question | Hypothèse par défaut |
|---|---|---|
| 1 | Push système ou in-app ? | **in_app** — le push suppose des jetons d'appareil, à vérifier en partie 1 |
| 2 | À tous, ou ciblé ? | **tous** (`audience: "all"`), le ciblage viendra après |
| 3 | Immédiat ou programmable ? | **immédiat** — pas de date d'envoi différée dans cette version |
| 4 | Historique côté Hub ? | **oui**, d'où `GET /notifications` |
| 5 | Garde-fou anti-envoi accidentel ? | **oui** — confirmation explicite avec le nombre de destinataires affiché |

---

## Ce que fera le Hub une fois l'endpoint disponible

Pour information, afin que les deux côtés ne se marchent pas dessus. **Rien de tout ceci n'est
codé aujourd'hui** — le Hub attend le contrat :

1. Un onglet « Notifications » dans le module MenuFacile du Hub (à côté de l'encart d'accueil).
2. Formulaire titre + texte + lien, avec les mêmes limites que le contrat (120 / 2000).
3. Appel de `audience-count` **avant** l'envoi → confirmation nommant le nombre réel.
4. Appel de `POST /notifications`, puis rafraîchissement de l'historique.
5. Historique des envois affiché sous le formulaire.

Côté Hub, tout passera par `callMenuFacileAdmin()`
(`packages/modules/menu-facile/actions/admin-client.ts`), comme les 10 endpoints existants :
le secret reste serveur, jamais exposé au navigateur.

---

## Ce qu'on demande en retour

1. Les réponses aux **5 questions de la partie 1**.
2. Le **contrat finalement retenu** (les chemins et les champs réellement implémentés, s'ils
   diffèrent de la proposition ci-dessus).
3. Une confirmation que le guichet renvoie bien `{ data }` / `{ error }` sur ces nouveaux
   chemins — le Hub décode uniformément et n'a aucune exception prévue.
