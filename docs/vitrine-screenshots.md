# Client vitrine — scénario, accès et plan de screenshots

> **À quoi sert ce fichier.** Il contient tout ce qu'il faut pour (1) prendre les captures d'écran des trois dashboards MonprojetPro et (2) écrire les pages du nouveau site en s'appuyant sur une histoire client cohérente.
> **Ce fichier est transférable tel quel à la fenêtre Claude Code qui gère le site internet.**
>
> Créé le 31 juillet 2026. Les données décrites ci-dessous existent réellement en base de production.

---

## ⚠️ À lire avant toute chose

- Ces clients sont **fictifs** mais **indiscernables de vrais clients** dans l'application. Personne d'autre que MiKL ne le sait.
- Ils sont destinés à être **supprimés** une fois les captures faites.
- **Ne jamais présenter Léa Vasseur ou Thomas Reynaud comme de vrais clients ou de vrais témoignages sur le site.** Les captures illustrent le produit, elles ne prouvent pas un résultat client. Si le site affiche du texte à côté d'une capture, il doit rester au registre « voici l'interface », jamais « voici ce que Madame X a obtenu ». Un faux témoignage attribué à une personne inventée est un dark pattern (et juridiquement une pratique commerciale trompeuse).
- Formulation sûre : *« Exemple d'un parcours Lab en cours »*, *« Aperçu de l'espace One »*. Mention discrète possible : *« interface réelle, données d'illustration »*.

### Ce qui est authentique, et ce qui ne l'est pas

Distinction importante si le site cite du texte visible sur les captures.

| Contenu | Origine | Fidèle au produit ? |
|---|---|---|
| **Bandeaux d'état** (abonnement terminé, parcours en pause…) | Textes en dur dans le code | ✅ **Identiques au caractère près** |
| **Conversation d'Élio Positionnement** (capture L3) | **Générée par le vrai Élio**, via l'edge function `elio-chat`, avec le prompt de l'agent, les garde-fous coach et le dossier des 3 étapes validées | ✅ **Authentique — c'est le produit qui parle** |
| **Document de synthèse de l'étape 4** (capture L5 / H3) | **Généré par le vrai Élio** à partir de cette conversation, avec le prompt de génération de l'app | ✅ **Authentique** |
| **Mots d'Élio des bandeaux** (Lab et One) | **Générés par le vrai Élio** (Haiku), avec les prompts d'événement de l'app | ✅ **Authentique** |
| Documents des étapes 1, 2, 3 de Léa et des 10 étapes de Thomas | Rédigés à la main pour le scénario | ⚠️ Plausibles, mais pas produits par Élio |
| Messages du chat avec MiKL, posts de suivi, tickets, notes | Rédigés à la main | ⚠️ Ce sont des textes humains — normal qu'ils soient écrits |

**En clair :** tout ce qu'Élio dit à l'écran a réellement été produit par Élio. Les captures L3, L5, H3 et les bandeaux peuvent être citées telles quelles.

**Un défaut réel repéré au passage** (à ne pas mettre en avant, mais bon à savoir) : dans un mot généré, Élio a écrit « MiKL a bien épluché ta cible et **elle** te propose… ». Le modèle a mis MiKL au féminin. Corrigé à la main sur cette capture, mais le prompt du Concierge Lab gagnerait à préciser le genre.

---

## 🔑 Les accès

**Mot de passe identique pour les trois comptes : `VitrineMPP2026!`**

| Espace | URL | Identifiant |
|---|---|---|
| **Hub** (cockpit MiKL) | https://monprojetpro-hub.vercel.app | `contact@monprojet-pro.com` *(ton compte habituel)* |
| **Lab** — Léa Vasseur | https://monprojetpro-client.vercel.app | `lea.vasseur@maison-vasseur.fr` |
| **One** — Thomas Reynaud | https://monprojetpro-client.vercel.app | `thomas.reynaud@atelier-reynaud.fr` |
| *(bonus)* Espace résilié — Camille Fournier | https://monprojetpro-client.vercel.app | `camille.fournier@comptoir-camille.fr` |

> Les sous-domaines `app.monprojet-pro.com` et `hub.monprojet-pro.com` **ne sont pas branchés en DNS** — utiliser les URLs Vercel ci-dessus.

**Conseil pratique :** ouvre le Hub dans une fenêtre normale et les espaces clients dans une **fenêtre de navigation privée** (sinon la session de l'un écrase l'autre). Ou trois profils Chrome différents.

---

## 🎬 Le scénario

### Léa Vasseur — Maison Vasseur *(le Lab en cours)*

Fleuriste-créatrice à Angers, boutique rue Saint-Laud depuis 2020. Elle travaille seule avec une apprentie.

**Son déclic :** en six mois, trois professionnels (un restaurant, un cabinet d'architectes, un hôtel) lui ont demandé spontanément des fleurs fraîches renouvelées chaque semaine. Elle a dit oui aux trois, en improvisant. C'est rentable, et c'est ingérable.

**Ce qu'elle vient chercher :** structurer une offre d'abonnement floral pour les professionnels — quoi vendre, à qui, à quel prix, et comment le livrer sans y passer ses nuits.

**Où elle en est :** Lab payé le 27 juin, parcours lancé le 30 juin. **Étape 4 sur 9.** Trois étapes validées, une refusée puis reprise, et son document de Positionnement est en ce moment même **en attente de validation chez MiKL**.

**Le moment fort de son histoire :** MiKL a refusé son étape « Cible » parce qu'elle visait « les professionnels du centre-ville » — trop large pour être vendable. Elle a repris en quatre jours et livré une v2 centrée sur un seul segment (les restaurants) avec une personne réelle, Marion, et ses phrases à elle. **C'est l'illustration parfaite du modèle : l'IA structure, l'humain tranche.**

**Sa découverte de positionnement (belle histoire pour le site) :** elle cherchait depuis trois semaines ce qui la rendait différente. Réponse : elle livre le **vendredi matin** quand tous ses confrères livrent le lundi — parce que c'était le seul créneau libre dans son planning. Ses fleurs sont donc fraîches au moment où la salle est pleine. Une contrainte subie devenue son argument de vente n°1.

### Thomas Reynaud — Atelier Reynaud *(le One, outil livré)*

Ébéniste à Nantes (quartier de Chantenay), installé à son compte depuis 2021. Mobilier sur-mesure : bibliothèques, dressings, agencement de commerce.

**Son problème chiffré :** en 2025 il a répondu à **61 demandes de devis et en a signé 19**. Sur les 42 perdues, une dizaine sont parties parce qu'il mettait jusqu'à trois semaines à répondre — les devis se font le soir, après l'atelier.

**Son parcours :** Lab de février à mai 2026, **10 étapes validées**, gradué le 12 mai. Son dernier document (Élio Dev) est le **PRD de son outil** — c'est lui qui est devenu le cahier des charges du développement.

**Aujourd'hui :** abonné **One+**, outil livré le 20 juin, coaching mensuel avec MiKL.

**Ses résultats à trois indicateurs** *(tels qu'affichés dans son suivi d'outil)* :

| Indicateur | Avant | Objectif | Aujourd'hui |
|---|---|---|---|
| Délai de réponse à une demande | 11 jours | ≤ 48 h | **31 h** ✅ |
| Temps de production d'un devis | ~3 h | ≤ 30 min | **28 min** ✅ |
| Taux de transformation | 31 % | ≥ 45 % | 38 % — en progression |
| Demandes entrantes / mois | 5 | > 5 | **9** ✅ |

**Sa phrase (dans le chat, le 8 juillet) :** *« Je viens de faire un devis complet en 25 minutes, chez le client, sur le téléphone. Vingt-cinq minutes. Avant j'y passais ma soirée. »*

### Camille Fournier — Le Comptoir de Camille *(bonus : l'espace après résiliation)*

Épicerie fine à Rennes. Parcours Lab interrompu, abonnement arrêté en juillet à sa demande — elle décale son projet à l'an prochain. **Son espace reste ouvert en consultation.**

Utile si le site veut montrer qu'on ne ferme la porte à personne. Sinon, ignore-la.

---

## 📸 Le plan de screenshots

Ordre conseillé : Hub → Lab → One. Coche au fur et à mesure.

### 🔵 HUB — le cockpit de MiKL (`monprojetpro-hub.vercel.app`)

| # | Page | Ce qu'on y voit | À quoi ça sert sur le site |
|---|---|---|---|
| H1 | `/` (accueil) | Vue d'ensemble : clients actifs, validations en attente, rappels du jour | Section « Vous gardez la main sur tout » |
| H2 | `/modules/validation-hub` | **1 validation en attente** — le Positionnement de Léa | Le cœur du modèle : rien ne part sans validation humaine |
| H3 | `/modules/validation-hub/[id]` *(cliquer sur la ligne de Léa)* | Le document complet + les boutons valider / demander une reprise | Montrer la qualité réelle des livrables Élio |
| H4 | `/modules/crm` | Liste des 3 clients avec leurs statuts | « Votre portefeuille client, lisible » |
| H5 | `/modules/crm/clients/[id]` *(fiche de Léa)* | Fiche complète : coordonnées, parcours, notes internes, actions | La relation client centralisée |
| H6 | `/modules/crm/clients/[id]` *(fiche de Thomas)* | Client gradué One+ : facturation, coaching, outil livré | Le suivi d'un client en régime de croisière |
| H7 | `/modules/chat` puis un client | Conversations avec Léa et Thomas | Le lien direct, sans email perdu |
| H8 | `/modules/documents` | Les documents des clients, classés par dossier | La bibliothèque partagée |
| H9 | `/modules/facturation` | Les 6 factures (Lab, setup One, abonnements One+) | Facturation synchronisée |
| H10 | `/modules/agenda` | Les visios passées et à venir | Le planning |
| H11 | `/modules/crm/reminders` | 3 rappels en cours | « Rien ne se perd » |
| H12 | `/elio/hub` | L'agent Élio côté opérateur | L'IA au service de MiKL aussi |

### 🟣 LAB — l'espace de Léa (`monprojetpro-client.vercel.app`)

| # | Page | Ce qu'on y voit | À quoi ça sert sur le site |
|---|---|---|---|
| L1 | `/modules/parcours` | **LE screenshot principal du Lab.** Bandeau Élio le Concierge, barre de progression 3/9 (33 %), les 9 cartes d'étapes avec leurs états | La page héro de la section Lab |
| L2 | `/modules/parcours/steps/4` | L'étape en cours avec l'agent Élio Positionnement | « Un expert par étape » |
| L3 | `/modules/parcours/steps/4` *(dérouler le chat)* | **La conversation complète** où Élio fait découvrir à Léa son positionnement du vendredi matin | Le meilleur screenshot pour montrer ce qu'est vraiment Élio |
| L4 | `/modules/parcours/steps/3` | Étape Cible : l'historique avec **la v1 refusée et le feedback de MiKL**, puis la v2 validée | La preuve du modèle « IA + humain » |
| L5 | `/modules/parcours/steps/4/submission` | Le document de synthèse produit par Élio | La qualité du livrable |
| L6 | `/modules/documents` | Ses 6 documents (parcours validés, facture, ses propres fichiers) | « Tout ce qu'on construit vous appartient » |
| L7 | `/modules/chat` | Ses échanges avec MiKL | L'accompagnement humain |
| L8 | `/modules/visio` | Ses visios passées + celle du 5 août | Le rendez-vous quand il faut |
| L9 | `/settings` | Ses réglages, consentements, préférences | Sérieux et RGPD |

### 🟢 ONE — l'espace de Thomas (`monprojetpro-client.vercel.app`)

| # | Page | Ce qu'on y voit | À quoi ça sert sur le site |
|---|---|---|---|
| O1 | `/` (accueil) | **LE screenshot principal du One.** Bandeau Élio One vert + le cockpit d'activité (évolutions, support, suivi d'outil, documents, visio, coaching, offre) | La page héro de la section One |
| O2 | `/modules/suivi-outil` | Les 3 publications de MiKL + les échanges — dont le tableau des indicateurs | **Le meilleur argument de vente du One** : on ne vous livre pas un outil, on l'entretient avec vous |
| O3 | `/modules/suivi-outil` *(ouvrir « Vos indicateurs »)* | Le tableau avant/après avec les chiffres de Thomas | Section résultats |
| O4 | `/modules/documents` | Ses 15 documents en 3 dossiers (parcours, outil, contrats) | « Votre mémoire de projet » |
| O5 | `/modules/documents` *(ouvrir le PRD)* | Le PRD de son outil, issu du Lab | Le lien Lab → One rendu visible |
| O6 | `/modules/chat` | Ses échanges avec MiKL | Le lien direct maintenu après livraison |
| O7 | `/modules/elio` | Le chat Élio One (pop-up verte) | L'assistant au quotidien |
| O8 | `/modules/support` | Ses tickets (une suggestion en cours, une question résolue) | Support réel |
| O9 | `/modules/visio` | Coaching de juillet fait, celui d'août planifié | Le coaching One+ |
| O10 | `/settings/billing` | Ses factures : Lab, setup, abonnements One+ | Transparence tarifaire |
| O11 | **Le toggle Lab ↔ One** *(dans le bandeau du haut)* | Basculer en mode Lab : son parcours **100 % terminé (10/10)** en consultation | « Votre parcours ne disparaît jamais » — argument fort |

---

## 🎨 Conseils de prise de vue

- **Thème sombre** partout (c'est le défaut, et c'est la signature visuelle MPP).
- **Fenêtre en 1440 × 900 minimum**, zoom navigateur à 100 %. Pour les captures pleine largeur, 1920 × 1080.
- **Masquer la barre de favoris** du navigateur (Ctrl+Maj+B) — ça fait plus propre.
- Pour les pages longues : capture pleine page via les DevTools (`Ctrl+Maj+P` → taper « screenshot » → *Capture full size screenshot*).
- **Prévoir aussi des captures mobiles** : DevTools → mode responsive → iPhone 15 Pro. Le site en aura besoin pour la section « ça marche aussi sur le téléphone ».
- Les vignettes les plus utiles pour un site : **L1, L3, O1, O2, H2**. Si tu ne fais que cinq captures, fais celles-là.

---

## ⚠️ Limites connues (à ne pas prendre pour des bugs)

1. **Les fichiers ne se téléchargent pas.** Les documents apparaissent bien dans les listes, avec leurs noms, dossiers, tailles et dates — mais les fichiers eux-mêmes n'ont pas été déposés dans le stockage. **Les captures de listes sont parfaites ; ne clique pas sur « Télécharger ».** Si tu veux une capture d'un document ouvert, utilise plutôt L5 (le document de synthèse, qui est en base) ou H3.

2. **Les modules « cockpit » sur-mesure n'existent pas encore** dans le catalogue (seul « Comptabilité » y figure). L'espace One de Thomas est donc riche sur tout le socle relation, mais tu ne verras pas de « Cockpit Devis » ou « Cockpit Chantiers » — ils ne sont pas développés. L'histoire du site peut les évoquer comme la promesse du sur-mesure, sans capture à l'appui.

3. **Pas d'historique de chat Élio côté One.** C'est voulu par conception : le chat One est éphémère, rien n'est persisté. La pop-up s'ouvrira vide. Ne cherche pas une conversation One à screenshotter — utilise celle du Lab (L3).

4. **Les visios ne sont pas rejouables** (pas d'enregistrement réel). Les listes et les statuts s'affichent, la salle ne s'ouvrira pas.

---

## 🧹 Comment supprimer le client vitrine après les captures

Une seule requête SQL suffit — les suppressions en cascade font le reste :

```sql
delete from billing_sync where client_id in (
  'a1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000002');

delete from clients where id in (
  'a1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000002');

delete from auth.users where id in (
  'a1000000-0000-4000-8000-0000000000a1',
  'b2000000-0000-4000-8000-0000000000b2');
```

*(Camille Fournier — anciennement « Dev Test » — est ton client de test historique : ne la supprime pas, c'est le seul compte qui te reste pour tester.)*

---

## 📦 Matière brute pour le site

Éléments réutilisables directement dans les textes du site, tirés du scénario ci-dessus.

**Le problème que MonprojetPro résout, en une phrase par cible :**
- *Léa :* « J'ai une demande qui existe, et aucune idée de comment la transformer en offre vendable. »
- *Thomas :* « Je perds des chantiers parce que je réponds trop tard, et je passe mes soirées sur de l'administratif. »

**Les trois temps du parcours, dans le vocabulaire client :**
1. **Le Lab** — « on met votre projet au clair, étape par étape, avec un expert à chaque étape et un humain qui valide »
2. **La graduation** — « ce que vous avez construit devient le cahier des charges de votre outil »
3. **Le One** — « votre outil vit, et vous n'êtes jamais seul avec »

**L'argument différenciant à marteler :** MonprojetPro n'est pas un chatbot qui produit des documents. **Chaque livrable passe par un humain qui peut le refuser.** L'étape Cible de Léa en est la démonstration : refusée, argumentée, reprise, validée.

**Le format des offres tel qu'il apparaît en base :**
- **Lab** — 199 € (déduits du développement si le projet se poursuit)
- **One** — 49 €/mois
- **One+** — 99 €/mois, avec une séance de coaching mensuelle incluse (cumulable)
- **Développement de l'outil** — sur devis (celui de Thomas : 3 800 € HT, en deux fois)

> ⚠️ Vérifier ces montants auprès de MiKL avant publication : ce sont ceux du scénario, pas nécessairement la grille tarifaire officielle du jour.

---

*Fichier généré le 31 juillet 2026. Données présentes en base de production `mpgpwcpeqfwknohhqdmd`.*
