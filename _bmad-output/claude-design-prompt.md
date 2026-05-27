# MonprojetPro — Prompt Claude Design
## Dashboard Client complet (Lab + One)

> **Colle ce fichier entier dans Claude Design.**
> Demande-lui de générer toutes les pages décrites ci-dessous en un seul projet.

> 🚫 **NE PAS GÉNÉRER — déjà en production :**
> - Le Shell (header + sidebar + FAB Élio) → déjà codé, ne pas recréer
> - La page "Lab Accueil" (`/modules/parcours`) → déjà codée, ne pas recréer
>
> ⚠️ Si tu as l'intention de générer "Lab Accueil" ou le Shell, **arrête et ignore-les**. Ces pages existent déjà.
>
> **Ta mission : générer UNIQUEMENT les 6 pages listées ci-dessous**, en t'alignant sur le design system existant.

---

## CONTEXTE PRODUIT

**MonprojetPro** est un SaaS B2B pour entrepreneurs. Le dashboard client est une **application unique multi-tenant** hébergée sur `app.monprojet-pro.com`. Il a **2 modes** pour le même client :

- **Mode Lab** (violet) — parcours d'incubation guidé par MiKL + l'IA Élio
- **Mode One** (vert/orange) — outil métier quotidien post-graduation

Le toggle Lab / One est toujours visible dans le header. Un même client peut basculer entre les deux modes.

---

## DESIGN SYSTEM — À RESPECTER PARTOUT

### Couleurs

```
Fond global        : #0c0c0c
Card bg            : #141414
Border             : #2d2d2d
Border active      : #3d3d3d
Texte principal    : #f9fafb
Texte secondaire   : #9ca3af
Texte désactivé    : #6b7280

— Mode Lab (violet) —
Accent primaire    : #7c3aed
Accent clair       : #a78bfa
Fond accent        : #1e1557
Border accent      : #3d2d6d

— Mode One (vert + orange) —
Accent primaire    : #4ade80
Accent vert dark   : #16a34a
Fond vert          : #052e16
Accent orange      : #fb923c

— Statuts universels —
Succès / Validé    : #22c55e + fond #0f1f0f
En attente / Warn  : #f59e0b + fond #1c1404
Erreur / Refus     : #ef4444 + fond #1c0404
En cours           : #7c3aed (Lab) / #4ade80 (One)
```

### Typography
- Font : Inter ou system-ui
- Titre page : text-2xl font-bold
- Titre section : text-base font-semibold
- Corps : text-sm
- Meta/label : text-xs uppercase tracking-wide

### Composants récurrents

**Bouton primaire Lab** : bg #7c3aed, texte blanc, rounded-lg, px-6 py-2.5
**Bouton primaire One** : bg #16a34a, texte blanc, rounded-lg, px-6 py-2.5
**Bouton outline** : border couleur accent, texte accent, transparent, rounded-lg
**Badge statut** : pill arrondi, couleur selon statut, texte 10px uppercase
**Card** : bg #141414, border #2d2d2d, rounded-xl, p-5
**Card active** : border 2px couleur accent, fond accent (10% opacité)

---

## SHELL PARTAGÉ (header + sidebar)

> ⚠️ **DÉJÀ IMPLÉMENTÉ dans le code** — cette section est fournie comme référence de design uniquement. Claude Design doit s'y conformer exactement pour la cohérence visuelle.
> Le shell est le même pour Lab et One. Seuls la couleur d'accent, les items de navigation, et le mode actif changent.

### Header (h-[60px], bg #141414, border-b #2d2d2d)
- **Gauche** : Logo "MonprojetPro" — texte violet (#a78bfa) en mode Lab, vert (#4ade80) en mode One
- **Centre** : Toggle Lab / One
  - Fond container : #0f0f0f, border #3d3d3d, rounded-full, h-[32px] w-[288px]
  - Onglet actif : bg plein (violet ou vert), rounded-full, texte blanc
  - Onglet inactif : texte #6b7280
- **Droite** : Avatar cercle (initiales "CL"), notification bell

### Sidebar (w-[240px], bg #141414, border-r #2d2d2d)

**Mode Lab — Navigation :**
1. Mon Parcours *(icône graduation cap)*
2. Chat Élio *(icône message violet)*
3. Chat MiKL *(icône message humain)*
4. Documents
5. Soumissions
6. — separator —
7. Paramètres *(en bas)*

**Mode One — Navigation :**
1. Accueil *(icône home)*
2. Mes Modules *(icône grid)*
3. Comptabilité *(icône euro)*
4. Documents *(icône folder)*
5. Messages *(icône chat)*
6. Visios *(icône video)*
7. — separator —
8. Paramètres *(en bas)*

**Style item actif** : fond accent (Lab = #1e1557, One = #052e16), border-l-2 couleur accent, texte accent
**Style item inactif** : texte #9ca3af, hover bg #1a1a1a

### FAB Élio (bottom-right corner)
- Cercle 52px, bg accent (violet Lab / vert One)
- Texte "Élio" en blanc
- Position : fixed, bottom-6 right-6
- En mode One : légèrement plus grand avec animation pulse subtile

---

## PAGE 1 — LAB ÉTAPE DÉTAIL + CHAT ÉLIO

**URL** : `/modules/parcours/steps/4`
**Mode** : Lab (violet)

### Layout — 2 colonnes côte à côte (100vh - 60px header)
- **Colonne gauche** : flex-1, overflow-y-auto, p-6
- **Colonne droite** : w-[420px] fixe, flex-col, bg #141414, border-l #2d2d2d

### Colonne gauche — Contenu

**Breadcrumb** : `Mon Parcours ›  Étape 4 — Stratégie commerciale` — texte xs gris, lien cliquable

**Header de l'étape** (card, bg #1e1557, border 2px #7c3aed, rounded-xl, p-5, mt-3)
- Badge pill "EN COURS" (#7c3aed bg blanc)
- Titre h1 : "Étape 4 — Stratégie commerciale" (text-xl font-bold blanc)
- Sous-titre : "Cibles, canaux d'acquisition, positionnement prix — 3 livrables attendus" (text-sm gris)

**Section "Livrables à remettre"** (mt-6)
- Titre section : texte blanc, font-semibold
- 3 cartes empilées (gap-3) :

  *Livrable 1 — Terminé* (bg #0f1f0f, border #22c55e)
  - Icône check vert dans cercle vert
  - Texte barré gris : "Identifiez vos 3 types de clients idéaux (personas)"
  - Sous-texte vert : "Validé par Élio le 14/04"

  *Livrable 2 — En cours* (bg #1e1557, border 2px #7c3aed)
  - Cercle vide violet
  - Texte blanc : "Listez vos 3 canaux d'acquisition et leur coût"
  - Sous-texte violet : "EN COURS — parlez à Élio"
  - Bouton outline violet droite : "Parler à Élio →"

  *Livrable 3 — Verrouillé* (bg #111, border dashed #374151, opacity-60)
  - Icône cadenas gris
  - Texte gris foncé : "Définissez votre grille tarifaire"

**Bouton soumettre** (mt-6, flex items-center gap-4)
- Bouton principal violet désactivé : "Soumettre à MiKL" (disabled si pas tous terminés)
- Texte italic gris : *"Élio préparera un résumé pour MiKL"*

**Section documents** (mt-8)
- Label xs gris uppercase : "DOCUMENTS PARTAGÉS POUR CETTE ÉTAPE"
- Grid 2 colonnes, 2 cartes fichiers (bg #141414, border #2d2d2d, rounded-lg, p-3)
  - Icône fichier + nom + badge type (PDF / XLSX)

### Colonne droite — Chat Élio

**Header panel** (h-[52px], bg #1a1033, border-b #2d2d2d, px-5)
- Gauche : "Chat Élio — Étape 4" violet
- Droite : dot vert + "En ligne"

**Zone messages** (flex-1, overflow-y-auto, p-4, gap-3)

Message Élio (bg #1e1557, border #3d2d6d, rounded-xl, p-3, texte #e5e7eb) :
*"Super travail sur les personas ! Pour les canaux d'acquisition, pensons aux réseaux les plus adaptés à votre cible."*

Message User (bg #1e1e1e, border #2d2d2d, rounded-xl, p-3, ml-8, texte blanc) :
*"Je pense utiliser LinkedIn et le bouche-à-oreille principalement"*

Message Élio :
*"Excellent choix ! LinkedIn pour B2B et le bouche-à-oreille sont très adaptés. Estimons ensemble le temps hebdo par canal."*

**Barre d'input** (h-[64px] shrink-0, border-t #2d2d2d, px-4)
- Textarea (bg #1e1e1e, border #3d3d3d) : placeholder "Répondez à Élio..."
- Bouton send violet 36×36 avec icône →

---

## PAGE 2 — LAB SOUMISSIONS

**URL** : `/modules/soumissions`
**Mode** : Lab (violet)

### Layout
Contenu pleine largeur, p-6.

### Contenu

**Header page**
- Titre h1 : "Mes soumissions à MiKL"
- Sous-titre gris : "Vos briefs soumis au Validation Hub — suivi en temps réel"
- Bouton outline violet droite : "+ Nouvelle soumission"

**Liste de soumissions** (mt-6, flex flex-col gap-3)

4 cartes de soumission (chacune : rounded-xl p-5, border selon statut) :

*Soumission 1 — EN ATTENTE* (border #f59e0b, bg #1c1404)
- Badge orange "EN ATTENTE"
- Titre : "Stratégie commerciale — Étape 4"
- Meta gris : "Soumis le 15/04/2026 à 10h30 | Résumé préparé par Élio"
- Lien violet droite : "Voir →"

*Soumission 2 — VALIDÉE* (border #22c55e, bg #0f1f0f)
- Badge vert "VALIDÉE"
- Titre : "Business Model — Étape 3"
- Meta gris : "Soumis le 08/04 | Validé par MiKL le 10/04"
- Lien vert droite : "Voir →"

*Soumission 3 — VALIDÉE* (même style)
- Badge vert "VALIDÉE"
- Titre : "Étude de marché — Étape 2"

*Soumission 4 — PRÉCISIONS DEMANDÉES* (border #ef4444, bg #1c0404)
- Badge rouge "PRÉCISIONS"
- Titre : "Personas clients — Étape 1"
- Meta rouge : "MiKL demande des précisions — répondez pour relancer la validation"
- Bouton rouge outline : "Répondre →"

---

## PAGE 3 — ONE ACCUEIL

**URL** : `/` (mode One)
**Mode** : One (vert + orange)

### Layout
Contenu pleine largeur, p-6. Pas de panneau latéral droit.

### Contenu

**Welcome**
- Titre h1 : "Bonjour, Sophie !" — text-2xl font-bold blanc
- Sous-titre gris : "Jeudi 17 avril 2026 — Tout est en ordre"

**Statistiques (mt-4, grid grid-cols-4 gap-4)**

*Stat 1 — Devis en attente* (card standard)
- Label gris : "Devis en attente"
- Valeur orange : "3" (text-4xl font-bold)
- Note : "Dont 1 expire bientôt"

*Stat 2 — CA ce mois* (card standard)
- Label gris : "Factures ce mois"
- Valeur verte : "2 850 EUR" (text-3xl font-bold)

*Stat 3 — Prochaine visio* (card standard)
- Label gris : "Prochaine visio"
- Valeur blanche : "Mardi 22 avril — 14h00"

*Stat 4 — Messages* (card standard)
- Label gris : "Messages non lus"
- Valeur blanche : "2"

**Section "Vos modules actifs" (mt-6)**
- Titre : "Vos modules actifs" (text-base font-semibold blanc)
- Grille 4 colonnes, gap-4 :

  *Module Documents* (border #16a34a, bg #052e16, h-[140px], rounded-xl, centered)
  - Icône document (texte vert large)
  - Nom : "Documents"
  - Lien : "Ouvrir →" vert

  *Module Comptabilité* (même style vert)
  - Icône EUR
  - Nom : "Comptabilité"

  *Module Visio* (même style vert)
  - Icône caméra
  - Nom : "Visio"

  *Module CRM* (border dashed #374151, bg #111, opacity-60)
  - Icône gris
  - Texte gris : "CRM — Désactivé"

**Suggestion Élio (mt-6)**
- Card bg #141414, border #2d2d2d, rounded-xl, p-5
- Avatar Élio vert (cercle "E" vert)
- Texte : *"Sophie, vous avez 3 devis en attente de signature. Je vous suggère de relancer Martin Dupont — son devis expire dans 3 jours. Voulez-vous que je prépare un email ?"*
- Bouton vert : "Oui, préparer"
- Bouton outline : "Plus tard"

**Activité récente** (card droite, w-[320px], dans une rangée flex avec suggestion Élio)
- Titre : "Activité récente"
- Liste items :
  - "Facture #INV-042 payée — 1 200 EUR"
  - "Document CV_Sophie_v3.pdf envoyé"
  - "Visio planifiée pour le 22/04"
  - "Message de MiKL — non lu" (en vert)

---

## PAGE 4 — ONE COMPTABILITÉ

**URL** : `/modules/facturation` (mode One)
**Mode** : One (vert + orange)

### Layout
Contenu pleine largeur, p-6.

### Contenu

**Header page**
- Titre h1 : "Comptabilité"
- Bouton vert droite : "+ Nouveau devis (via MiKL)"

**Stats rapides (mt-4, flex gap-4)**
- "Devis en attente" : 3 (orange)
- "CA ce mois" : 4 250 EUR (vert)

**Onglets (mt-6)** : Devis | Factures | Abonnement
- Onglet actif : border-b-2 vert, texte vert
- Onglet inactif : texte gris

**Contenu onglet "Devis" (tableau)**

Header tableau (texte xs gris uppercase) :
| Numéro | Objet | Montant HT | Statut |

3 lignes :

| DEV-2026-042 | Mission Conseil Stratégie — Avril 2026 | 2 400 EUR | 🟡 EN ATTENTE |
| DEV-2026-041 | Formation Équipe RH — Mars 2026 | 1 800 EUR | 🟢 SIGNÉ |
| DEV-2026-039 | Audit Organisation — Fév. 2026 | 1 200 EUR | ⚫ EXPIRÉ |

Chaque ligne : hover bg #1a1a1a, clic pour détail

**Footer** : "Synchronisé avec Pennylane — dernière sync il y a 2 min" (texte xs gris)

**Contenu onglet "Abonnement"** (card mt-6)
- Titre : "Mon abonnement MonprojetPro One"
- Sous-titre gris : "Plan Pro — 149 EUR/mois HT | Prochain renouvellement : 01/05/2026"
- Badge vert "ACTIF"

---

## PAGE 5 — ONE DOCUMENTS

**URL** : `/modules/documents` (mode One)
**Mode** : One (vert + orange)

### Layout
Contenu pleine largeur, p-6.

### Contenu

**Header page**
- Titre h1 : "Documents"
- Actions droite : barre de recherche + bouton vert "+ Ajouter"

**Section "Documents One" (mt-4)**
- Titre section : "Documents One" (blanc)
- Liste 2 colonnes, cartes fichiers :
  - Contrat_Client_Dupont.pdf | badge PDF vert | 450 Ko | 17/04/2026
  - CV_Sophie_Conseil_v3.pdf | badge PDF vert | 220 Ko | 12/04/2026
- Chaque carte : bg #141414, border #2d2d2d, rounded-lg, p-3, flex items-center gap-3

**Section "Livrables hérités du Lab" (mt-6)**
- Titre section violet : "Livrables hérités du Lab" avec badge pill violet "LAB" (lecture seule)
- Sous-titre gris : "Documents partagés par MiKL pendant votre parcours d'incubation"
- Liste 3 cartes (style lecture seule — opacity légère, pas de hover) :
  - Guide_Strategie_Commerciale.pdf | Lab Étape 4 | 680 Ko | Lecture seule
  - BusinessPlan_V2_Final.pdf | Lab Étape 6 | 1.2 Mo | Lecture seule
  - Personas_Clients_Etape1.pdf | Lab Étape 1 | Lecture seule

**Zone d'upload (mt-6)**
- Card dashed border #3d3d3d, bg #0f0f0f, rounded-xl, p-8, centered
- Texte : "Glissez vos fichiers ici ou cliquez pour uploader"
- Sous-texte gris : "PDF, Word, Excel, Images — max 50 Mo"

---

## PAGE 6 — ÉCRAN DE GRADUATION

**URL** : overlay plein écran (pas de sidebar ni header)
**Contexte** : s'affiche une seule fois quand MiKL bascule le client de Lab à One

### Layout
Fullscreen overlay, bg #0c0c0c, centré, flex flex-col items-center justify-center.

### Contenu (centré verticalement)

**Animation en haut** (espace 80px)
- Texte décrivant l'animation : `[ confettis + particules violettes → vertes ]`
- Dégradé de texte ou d'icônes : Lab (violet) → One (vert)

**Flèche de transition**
- `Lab` (text violet) `—————>` `One` (text vert)
- Taille text-xl, animée (slide-in)

**Titre principal** (mt-8)
- "Bravo Sophie, votre projet est prêt !" — text-3xl font-bold blanc, centré

**Sous-titres** (mt-4)
- "Vous avez complété toutes les étapes de votre parcours Lab." — gris
- "Bienvenue dans MonprojetPro One — votre outil métier vous attend." — vert

**Héritage Lab** (mt-6, card bg #141414 border #2d2d2d rounded-xl p-5 max-w-lg)
- "Votre héritage Lab est transféré :"
- Row d'icônes : `[profil Élio] Profil de communication conservé` | `[docs] 12 documents disponibles`
- Texte gris : "Toutes vos conversations Élio Lab accessibles en lecture"

**Bouton CTA** (mt-8)
- Bouton vert large : "Découvrir mon One →" (px-10 py-3 rounded-xl)

**Note bas de page** (mt-6, texte xs gris)
- "Vous pourrez toujours consulter votre parcours Lab via le toggle en haut de la page"

**Message Élio** (mt-6, card violet foncé max-w-lg)
- Avatar Élio vert
- *"Félicitations ! J'ai tout appris de vous pendant ce parcours. Dans One, je serai votre assistant quotidien pour gérer votre activité. À tout de suite !"*

---

## INSTRUCTIONS POUR CLAUDE DESIGN

> 🚫 **RAPPEL FINAL** : NE PAS générer "Lab Accueil" ni le Shell — ils existent déjà en production.

**Pages à générer — exactement ces 6, rien de plus :**
1. Lab — Étape Détail + Chat Élio
2. Lab — Soumissions
3. One — Accueil
4. One — Comptabilité
5. One — Documents
6. Graduation (transition Lab → One)

**Règles de génération :**
- Utilise **exclusivement les couleurs** définies dans le Design System — pas d'interprétation libre
- **Mode dark partout** — fond #0c0c0c, jamais de fond blanc
- **Montre le Shell** (header + sidebar) sur chaque écran comme contexte visuel, mais sans le modifier
- **Les données sont des mock** — prénom "Sophie", montants exemples, dates exemples
- **Desktop uniquement** — 1440×900, pas de responsive mobile pour cette itération
- **Élio FAB** présent sur toutes les pages sauf la Graduation

**Format souhaité** : prototypes interactifs — clic sidebar → changement de page, toggle Lab/One → changement d'accent couleur
