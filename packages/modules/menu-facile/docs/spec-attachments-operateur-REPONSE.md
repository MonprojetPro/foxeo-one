# Réponse MenuFacile — pièces jointes de l'opérateur (F-030c)

> Écrite côté MenuFacile le 2026-09-15, en réponse à `spec-attachments-operateur.md`.
> **C'est livré, déployé et sondé.** Guichet `admin-api` **v16 ACTIVE**.
> Votre item : `T-023a`. Le nôtre : `F-030c`.

## 1. Les deux ajouts sont en place

### `POST /contact-messages/:id/attachments/upload-url`

Conforme à votre spec, avec une différence de forme à connaître :

```jsonc
// Requête
{ "file_name": "ou-cliquer.png", "mime_type": "image/png", "size_bytes": 148223 }

// Réponse
{
  "data": {
    "attachment_id": "att_NTc1MzFiNDEt…",
    "upload_url": "https://….supabase.co/storage/v1/object/upload/sign/contact-attachments/…?token=…",
    "token": "eyJ…",
    "path": "<user_id>/<message_id>/1-ou-cliquer.png",
    "expires_in": 7200
  }
}
```

- **`token` en plus** : c'est celui rendu par `createSignedUploadUrl`. Si vous utilisez
  `supabase-js` côté navigateur, `uploadToSignedUrl(path, token, file)` l'attend. Si vous
  faites un `PUT` direct sur `upload_url`, ignorez-le — c'est ce que fait notre sonde, et
  ça marche.
- **`expires_in: 7200`** et non 600 : c'est la durée réelle accordée par Supabase pour une
  URL d'upload signée. Annoncer 600 aurait été un chiffre inventé.
- **L'extension est imposée par le `mime_type`**, pas par le nom que vous envoyez. Un
  `capture.txt` déclaré `image/png` devient `…-capture.png`. Raison : à la relecture, le
  type MIME est déduit de l'extension ; sans cette règle, votre vignette serait cassée.
- **Le nom est assaini.** Testé avec `../../evasion tentee!.png` → le fichier atterrit à
  `<user_id>/<message_id>/1-evasion-tentee-.png`. Aucune sortie de dossier possible.

**Refus, tous vérifiés par appel réel :**

| Cas | Code | Message |
|---|---|---|
| Type non autorisé | **415** | liste des types acceptés |
| `size_bytes` au-dessus de la limite | **413** | limite en octets |
| Fil inexistant | **404** | « Fil introuvable. » |
| **Fil sans destinataire** | **409** | « Ce fil n'a pas de destinataire… » |

Ce dernier cas n'était pas dans votre spec, nous l'avons trouvé en instruisant : **un fil
de votre boîte (celui du 20/06) a `user_id` NULL**, d'avant que le compte soit exigé. Il
n'a aucun propriétaire, donc aucun dossier lisible : vous auriez reçu un « fil introuvable »
pour un fil que vous voyez à l'écran. Le 409 vous dit la vraie raison.

### `POST /contact-messages/:id/reply`

```jsonc
{ "body": "Voilà où cliquer :", "attachment_ids": ["att_…"] }
```

- **`{ body }` seul continue de fonctionner à l'identique** — vérifié par appel réel, HTTP 200.
- **`body` peut être vide si au moins une pièce jointe** : vous posiez la question, la
  réponse était non. La contrainte en base imposait `length(trim(body)) >= 1` — envoyer
  une capture seule était littéralement impossible. **Contrainte assouplie** (migration 75).
  Body vide **et** aucun fichier reste un refus 400.
- **Une pièce citée mais jamais uploadée → 409**, jamais une réponse amputée.
- **Un `att_` fabriqué → 400** (« Cette pièce jointe n'appartient pas à ce fil »). L'appartenance
  est vérifiée contre le dossier réel du fil, pas seulement décodée.
- Maximum **3 pièces jointes** par réponse (contrainte SQL, pas seulement applicative).

## 2. Le piège : traité, et sans élargir aucune policy

Votre alerte était juste — les 3 policies de `contact-attachments` (insert, select, delete)
exigent bien `(storage.foldername(name))[1] = auth.uid()`. Nous les avons relues en base
avant de décider.

**Mais un troisième fait tranche, que ni votre spec ni notre board ne mentionnaient :**

```sql
-- get_my_contact_thread, RPC de lecture côté utilisateur
where c.id = p_id and c.user_id = auth.uid()
```

**Un fil n'est lisible que par son auteur.** Pas par son foyer : par la personne qui l'a
ouvert. Le destinataire d'une réponse est donc exactement le propriétaire du dossier
Storage. Déposer dans `<user_id du fil>/<message_id>/…` fait atterrir le fichier pile où
la lecture est déjà prouvée.

C'est votre **option 1**. Nous avons écarté l'option 2 (préfixe `admin/` + policy élargie)
parce qu'elle aurait ajouté de la surface de sécurité pour un besoin que le modèle couvre
déjà.

**Preuve, puisque vous demandiez mieux qu'une déduction** : la condition littérale de la
policy a été évaluée par Postgres sur le chemin réellement produit par l'endpoint.

```sql
select (storage.foldername('<user_id>/<message_id>/1-….png'))[1] = '<user_id>';  -- true
```

**Limite honnête** : nous n'avons pas ouvert de session avec un vrai compte foyer — nous
n'avons pas ses identifiants. Ce qui précède est une preuve structurelle (la condition
exacte de la policy, satisfaite), pas un test de bout en bout depuis l'app. Votre point du
§7 reste donc à faire de votre côté, ou par MiKL depuis son compte.

## 3. Conséquence à connaître

**L'utilisateur peut supprimer un fichier que vous lui avez envoyé.** La policy « delete own »
porte sur tout son dossier. C'est son espace, il peut déjà supprimer les siens, et le fil
garde la trace du message. Nous l'assumons plutôt que de cloisonner davantage.

## 4. Limites réelles, pas celles annoncées

| Règle | Valeur appliquée | Écart avec votre proposition |
|---|---|---|
| Types | png, jpeg, webp, **gif, heic, heif**, pdf | plus large : c'est la liste du bucket |
| Taille | **10 Mo** | vous proposiez 5 Mo |
| Nombre | 3 par réponse | conforme |

Sur la taille : nous validons `size_bytes` à l'émission de l'URL, mais cette valeur est
**déclarative** — l'upload se fait ensuite en direct vers Storage. Le seul plafond qui
s'applique vraiment est celui du bucket, **10 Mo**. Annoncer 5 Mo côté guichet aurait
donné une limite que rien n'aurait fait respecter. Si vous voulez 5 Mo, appliquez-le côté
Hub avant l'upload (votre compression y suffit largement).

## 5. Détail annexe : index complété

`GET /` renvoie désormais **26 endpoints** au lieu de 24. Vous aviez raison de le signaler :
`GET /contact-messages/:id/attachments/:attachmentId/url` répondait sans y figurer depuis
le volet b. Elle y est, ainsi que la nouvelle route d'upload.

## 6. Ce que nous avons vérifié

Sonde réelle du 15/09 — **21 vérifications, 0 échec** — sur un fil de test créé sur le
compte admin de MiKL (jamais sur celui d'une utilisatrice), supprimé ensuite avec ses
fichiers :

- upload réel → `POST /reply` → relecture du fil : la pièce apparaît sur le message
  `sender: "admin"`, nom lisible, `image/png`, et **le fichier se télécharge (HTTP 200)** ;
- les 4 refus (415, 413, 404, 409) renvoient bien leur code ;
- identifiant fabriqué → 400 ; pièce citée non uploadée → 409 ;
- `{ body }` seul → 200 ; body vide sans fichier → 400.

⚠️ **Un point pour votre ménage** : `DELETE /contact-messages/:id` **masque le fil de votre
boîte, il ne le supprime pas** de la base — c'est le comportement voulu (« l'utilisateur
garde sa copie »), et votre libellé « Retirer de ma boîte » est juste. Nous le signalons
parce que notre propre sonde s'y est laissé prendre : le 200 ne veut pas dire « effacé ».

## 7. À vous

Le point 6 de votre spec (sélecteur de fichiers, compression, upload, affichage côté
`admin`) est entièrement de votre côté. Votre composant `contact-attachments.tsx` rend déjà
les pièces sans hypothèse sur l'expéditeur : il devrait afficher les vôtres sans
modification.

Si quelque chose ne se comporte pas comme décrit ici, dites-le avec la requête exacte et
le code reçu — la sonde est conservée et rejouable.
