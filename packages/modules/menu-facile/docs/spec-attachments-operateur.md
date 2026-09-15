# Spec — envoi de pièces jointes PAR L'OPÉRATEUR (guichet admin-api)

> **Destinataire : le projet MenuFacile** (item `F-030c` de son board).
> Rédigée côté Hub le 2026-09-15 après sonde réelle du guichet.
> Item Hub correspondant : `T-023a` (filiation de `T-023`).

## 1. Où on en est

Le sens **utilisateur → opérateur** est livré et fonctionne : depuis le 15/09, le Hub
affiche les pièces jointes envoyées par les foyers dans « Aide & contact ».

Le sens **opérateur → utilisateur** est absent. MiKL ne peut pas répondre avec une
capture d'écran, alors que c'est souvent la réponse la plus claire (« voilà où cliquer »).

**Constaté par sonde, pas supposé** — appel réel au guichet le 2026-09-15 :

| Vérification | Résultat |
|---|---|
| `GET /` (index des endpoints) | `menufacile-admin-api` version 3, **24 endpoints**, aucun d'upload |
| `GET /contact-messages/:id/attachments/upload-url` | HTTP 404 — route absente |
| `GET /contact-messages/:id/attachments` | HTTP 404 — route absente |
| Messages `sender: "admin"` portant des fichiers | **0** sur le fil le plus fourni (6 messages) |
| `POST /contact-messages/:id/reply` | existe, mais n'accepte que `{ body }` |

## 2. Contrat de LECTURE actuel (à ne pas casser)

Forme observée sur `GET /contact-messages/:id` — chaque entrée de `messages` porte :

```jsonc
{
  "sender": "user",              // ou "admin"
  "body": "…",
  "created_at": "2026-09-10T09:32:38.386347+00:00",
  "attachments": [
    {
      "id": "att_MGY5ZmEwNTAt…",           // base64url du chemin Storage, préfixé "att_"
      "file_name": "capture-d-ecran-liste-courses-2.webp",
      "mime_type": "image/webp",
      "size_bytes": 17880,
      "url": "https://….supabase.co/storage/v1/object/sign/contact-attachments/<user_id>/<message_id>/1-<nom>.webp?token=…"
    }
  ],
  "attachment_urls": {           // objet, clé = chemin Storage, valeur = URL signée
    "<user_id>/<message_id>/1-<nom>.webp": "https://…?token=…"
  }
}
```

La liste `GET /contact-messages` porte déjà `attachment_count` par fil.
Le renouvellement d'URL expirée existe et répond HTTP 200 :
`GET /contact-messages/:id/attachments/:attachmentId/url` → `{ data: { url } }`.

> ⚠️ Cette route de renouvellement **n'apparaît pas** dans l'index `GET /`. Elle
> fonctionne, mais l'index est incomplet — à corriger tant qu'on y est, sinon la
> prochaine personne qui lit l'index conclura qu'elle n'existe pas.

## 3. Ce qui est demandé — 2 ajouts

### 3.1 `POST /contact-messages/:id/attachments/upload-url`

Renvoie une URL signée permettant au **Hub** de déposer un fichier directement dans
Storage, sans le faire transiter par le guichet (même pattern que côté app).

**Requête**

```jsonc
{
  "file_name": "ou-cliquer.png",
  "mime_type": "image/png",
  "size_bytes": 148223
}
```

**Réponse**

```jsonc
{
  "data": {
    "attachment_id": "att_…",     // même forme que en lecture
    "upload_url": "https://….supabase.co/storage/v1/object/upload/sign/…",
    "path": "<dossier>/<message_id>/1-ou-cliquer.png",
    "expires_in": 600
  }
}
```

**Refus attendus** (erreur explicite, jamais un succès silencieux) :

- `mime_type` hors liste autorisée → HTTP 415
- `size_bytes` au-dessus de la limite → HTTP 413
- fil inexistant, clos ou supprimé → HTTP 404 / 409

### 3.2 `POST /contact-messages/:id/reply` — accepter `attachment_ids`

```jsonc
{
  "body": "Voilà où cliquer :",
  "attachment_ids": ["att_…", "att_…"]
}
```

- `attachment_ids` **optionnel** — l'appel actuel avec `{ body }` seul doit continuer
  de fonctionner à l'identique (le Hub l'utilise en production).
- Un `att_` cité mais jamais uploadé → rejet en erreur, pas une réponse amputée.
- `body` peut être vide **si** au moins une pièce jointe est présente (envoyer une
  capture seule est un cas normal). À confirmer côté MenuFacile.

## 4. Le piège à traiter AVANT de coder

**Les policies Storage de `contact-attachments` ne laissent lire que le dossier
`<auth.uid()>/…`.** Un fichier déposé par l'opérateur ailleurs que dans le dossier
du foyer serait donc **invisible côté utilisateur** — l'envoi paraîtrait réussi dans
le Hub et n'arriverait jamais.

Deux issues possibles, au choix de MenuFacile :

1. Déposer le fichier de l'opérateur **dans le dossier du foyer destinataire**
   (`<user_id>/<message_id>/…`), en autorisant cette écriture au seul service role ;
2. Créer un préfixe dédié (`admin/<message_id>/…`) **et** étendre la policy de lecture
   pour que le foyer concerné y accède.

Quelle que soit l'option, elle doit être **vérifiée depuis un vrai compte foyer**, pas
depuis le service role — le service role contourne les policies et ne prouve rien.

## 5. Contraintes proposées (alignées sur le reste du produit)

| Règle | Valeur | Pourquoi |
|---|---|---|
| Types acceptés | images (`png`, `jpeg`, `webp`) + `application/pdf` | même périmètre que la réception |
| Taille max | 5 Mo par fichier | aligné sur `T-017` côté Lab |
| Nombre max | 3 fichiers par réponse | aligné sur `T-017` |

Le Hub compressera les images avant l'upload (helper déjà en place), donc la limite
de 5 Mo ne devrait pratiquement jamais être atteinte.

## 6. Ce que fait le Hub dès que c'est livré

1. Sélecteur de fichiers dans la zone de réponse « Aide & contact » ;
2. Compression des images, puis upload direct navigateur → Storage via `upload_url` ;
3. `POST /reply` avec `body` + `attachment_ids` ;
4. Affichage des pièces envoyées dans le fil, côté `admin` (le composant
   `contact-attachments.tsx` sait déjà les rendre — il n'a jamais vu de message
   `admin` avec fichiers, mais ne fait aucune hypothèse sur l'expéditeur) ;
5. En cas d'échec d'un upload : **la réponse ne part pas**, erreur explicite à
   l'écran. Pas de message à moitié envoyé.

## 7. Comment on validera

Sonde réelle depuis le Hub (même méthode que pour la lecture le 15/09) :

- upload d'un fichier de test → `POST /reply` → relecture du fil → la pièce jointe
  apparaît bien sur le message `admin` ;
- **test négatif** : un `attachment_id` fabriqué ne doit donner accès à rien ;
- **vérification côté foyer** : le fichier est réellement visible dans l'app
  MenuFacile par le destinataire — c'est le seul test qui prouve que le piège du
  point 4 est traité.
