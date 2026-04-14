# Epic 10 : Dashboard One & Modules Commerciaux — Stories detaillees

**Objectif :** Les clients etablis accedent a un dashboard personnalise avec des modules metier activables, consultent leurs documents herites du Lab, et MiKL configure les modules actifs et le branding par client.

**FRs couverts:** FR38, FR39, FR40, FR41, FR42, FR43, FR139

**NFRs pertinentes:** NFR-P1, NFR-P2, NFR-S7, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

**Note architecturale :** Le dashboard shell, le module registry et le systeme de module manifests existent depuis l'Epic 1. L'app `client-one` (apps/client/) est deja deployable. Cet epic construit l'experience One specifique : accueil personnalise, modules visibles, configuration par MiKL, branding. Les modules commerciaux (Signature, Calendrier, Branding, Site Web, SEO, Social, Maintenance) sont definis dans monprojetpro-modules-commerciaux.md — leur integration complete avec les APIs externes (Yousign, Google Calendar, etc.) est prevue en P2. Cet epic met en place la structure d'activation et l'UI shell de chaque module.

---

## Story 10.1 : Dashboard One — Accueil personnalise, navigation & modules actives

As a **client One (etabli)**,
I want **acceder a mon dashboard personnalise avec les modules actives pour moi et une navigation adaptee**,
So that **j'ai un espace professionnel clair avec uniquement les outils dont j'ai besoin**.

**Acceptance Criteria :**

**Given** un client One se connecte a son dashboard (FR38)
**When** la page d'accueil se charge
**Then** le dashboard One affiche :
- Un header avec le logo MonprojetPro One (ou branding personnalise si configure)
- Un message d'accueil : "Bonjour {prenom}" avec la date du jour
- Une section "Actions rapides" avec les raccourcis vers les modules les plus utilises
- Une section "Activite recente" : derniers messages MiKL, derniers documents mis a jour, derniere activite Elio
- Un acces rapide a Elio One (widget chat ou bouton flottant)
**And** la page se charge en moins de 2 secondes (NFR-P1)
**And** le design suit la palette One (orange vif + bleu-gris, dark mode) ou le branding personnalise

**Given** le client One a des modules actives (FR39)
**When** il consulte la navigation sidebar
**Then** seuls les modules actives pour ce client sont affiches dans la sidebar :
- La liste provient de `client_configs.active_modules`
- Chaque module affiche son icone et son label (depuis le module manifest)
- Les modules sont tries par categorie : Communication, Documents, Outils metier, Paramètres
- Un module desactive n'apparait PAS dans la navigation
**And** le module registry resout les modules au chargement en verifiant `active_modules` ∩ `module_manifests` avec `targets` incluant 'client-one'
**And** si aucun module n'est active (cas improbable), un message invite a contacter MiKL

**Given** le dashboard One doit s'adapter au client
**When** le composant dashboard-home.tsx se charge
**Then** il utilise les donnees de `client_configs` pour personnaliser :
- Les modules affiches (via `active_modules`)
- Le branding (via `custom_branding` — logo, nom affiche) (FR139, Story 10.4)
- Le message d'accueil (via profil communication si disponible)
**And** les donnees client sont fetches via TanStack Query avec queryKey `['client-config', clientId]`
**And** le layout est responsive : sidebar collapsible sur mobile, grille adaptative pour les widgets

---

## Story 10.2 : Documents herites du Lab, livrables & teasing Lab

As a **client One (etabli)**,
I want **consulter mes documents herites du Lab et mes livrables, et voir un teasing Lab si un nouveau projet est possible**,
So that **je retrouve tout mon travail precedent et je sais que je peux relancer un parcours si besoin**.

**Acceptance Criteria :**

**Given** un client One a ete gradue du Lab (FR40)
**When** il accede au module Documents dans son dashboard One
**Then** il peut voir :
- **Section "Briefs Lab"** : tous les briefs generes et valides pendant le parcours Lab (type='brief', filtres par `source='lab'`)
- **Section "Livrables"** : documents livres par MiKL apres deploiement (type='livrable')
- **Section "Autres documents"** : documents partages par MiKL (type='shared')
**And** chaque document affiche : titre, date, badge de type, apercu (rendu HTML pour markdown, thumbnail pour images/PDF)
**And** le module Documents (Epic 4) est reutilise — les documents Lab sont lies au meme `client_id` et donc automatiquement visibles
**And** un filtre "Origine" permet de distinguer : Lab / One / Tous

**Given** un client Direct One (sans parcours Lab)
**When** il accede aux documents
**Then** la section "Briefs Lab" n'est pas affichee (pas de parcours Lab)
**And** seuls les livrables et documents partages sont visibles

**Given** un client One pourrait beneficier d'un nouveau parcours Lab (FR41)
**When** il accede a la page d'accueil ou au module Documents
**Then** un encart teasing est affiche :
- Titre : "Un nouveau projet en tete ?"
- Description : "Relancez un parcours Lab pour structurer votre prochain projet avec Elio et MiKL."
- Bouton CTA : "En savoir plus" → ouvre le chat avec MiKL pre-rempli avec "Je souhaite lancer un nouveau parcours Lab"
**And** le teasing est visible uniquement si :
- Le client a un parcours Lab termine (`parcours.status='completed'`) OU n'a jamais eu de parcours Lab (Direct One)
- Le client n'a PAS de parcours Lab en cours
**And** MiKL peut desactiver le teasing par client via `client_configs.show_lab_teasing: boolean` (defaut: true)

**Given** un onglet "Mon parcours Lab" est accessible (historique Lab)
**When** le client clique dessus
**Then** il voit son parcours Lab termine en lecture seule (via le module historique-lab) :
- Etapes completees avec dates
- Briefs valides avec liens
- Duree totale du parcours
**And** cette vue est en lecture seule — aucune action possible

---

## Story 10.3 : Configuration modules actifs par MiKL & injection documentation Elio One

As a **MiKL (operateur)**,
I want **configurer les modules actifs pour chaque client One et injecter la documentation dans Elio One apres un deploiement**,
So that **chaque client a un dashboard adapte a ses besoins et Elio One connait les outils deployes**.

**Acceptance Criteria :**

**Given** MiKL consulte la fiche d'un client One dans le Hub (FR42)
**When** il accede a la section "Modules actifs"
**Then** il voit la liste de tous les modules disponibles avec pour chacun :
- Nom et description du module
- Icone du module
- Toggle actif/inactif
- Statut actuel (active/desactive)
- Date d'activation (si active)
**And** les modules de base (core-dashboard, chat, documents, elio) sont toujours actives et non desactivables (grisés)
**And** les modules commerciaux configurables sont :
| Module | Description | Pre-requis |
|--------|-------------|-----------|
| Signature | Signature electronique (Yousign) | Abonnement Signature |
| Calendrier | Synchronisation calendrier | Aucun |
| Branding | Guide de marque | Prestation branding commandee |
| Site Web | Dashboard analytics site | Prestation site commandee |
| SEO | Suivi positionnement | Prestation SEO commandee |
| Social | Reseaux sociaux | Prestation social commandee |
| Maintenance | Suivi maintenance | Contrat maintenance signe |

**Given** MiKL active ou desactive un module
**When** il clique sur le toggle
**Then** la Server Action `updateActiveModules(clientId, moduleId, enabled)` s'execute :
1. Met a jour `client_configs.active_modules` (ajout ou retrait du moduleId)
2. Logge l'evenement dans `activity_logs`
3. L'effet est immediat : au prochain chargement, le client voit/ne voit plus le module
**And** un toast confirme "Module {nom} active/desactive pour {client}"
**And** le cache TanStack Query est invalide

**Given** MiKL deploie une nouvelle fonctionnalite pour un client et veut mettre a jour la documentation Elio (FR43)
**When** il accede a la section "Documentation Elio" de la fiche client
**Then** il voit un formulaire pour injecter la documentation par module :
- Selection du module concerne (dropdown des modules actifs)
- Champ "Description" : ce que le module fait (textarea)
- Champ "Questions frequentes" : paires question/reponse (ajout dynamique)
  - Question : "Comment je fais X ?"
  - Reponse : "Allez dans Y puis Z"
- Champ "Problemes courants" : paires probleme/solution (ajout dynamique)
  - Probleme : "Ca ne marche pas"
  - Diagnostic : "Verifiez 1)... 2)..."
  - Escalade : "Contactez MiKL si..."
- Bouton "Sauvegarder"

**Given** MiKL sauvegarde la documentation Elio
**When** la Server Action `injectElioDocumentation(clientId, moduleId, documentation)` s'execute
**Then** la documentation est stockee dans `client_configs.elio_module_docs` :
```typescript
type ElioModuleDoc = {
  moduleId: string
  description: string
  faq: Array<{ question: string; answer: string }>
  commonIssues: Array<{ problem: string; diagnostic: string; escalation: string }>
  updatedAt: string
}
```
**And** Elio One integre cette documentation dans son system prompt des la prochaine conversation
**And** un toast confirme "Documentation Elio mise a jour pour le module {nom}"
**And** MiKL peut aussi coller un JSON de documentation (genere par Orpheus) pour les cas complexes

---

## Story 10.4 : Personnalisation branding dashboard One par client

As a **MiKL (operateur)**,
I want **personnaliser le branding du dashboard One de chaque client (logo, nom affiche, couleurs)**,
So that **chaque client a un espace qui porte visuellement son identite**.

**Acceptance Criteria :**

**Given** MiKL consulte la fiche d'un client One (FR139)
**When** il accede a la section "Branding"
**Then** il voit un formulaire de personnalisation :
- **Logo** : upload d'image (PNG, SVG, max 2 Mo) avec apercu
- **Nom affiche** : le nom qui apparait dans le header du dashboard (defaut : nom de l'entreprise du client)
- **Couleur d'accent** : color picker pour la couleur dominante du dashboard (defaut : couleur One standard)
- **Apercu en temps reel** : un mini-preview du dashboard avec les modifications appliquees
- Boutons "Sauvegarder" / "Reinitialiser aux valeurs par defaut"

**Given** MiKL sauvegarde le branding
**When** la Server Action `updateClientBranding(clientId, branding)` s'execute
**Then** la configuration est stockee dans `client_configs.custom_branding` :
```typescript
type CustomBranding = {
  logoUrl: string | null        // URL dans Supabase Storage
  displayName: string | null    // Nom affiche
  accentColor: string | null    // Couleur hex (#FF5733)
  updatedAt: string
}
```
**And** le logo est uploade dans Supabase Storage (dossier `/clients/{clientId}/branding/`)
**And** l'effet est immediat au prochain chargement du dashboard client
**And** un toast confirme "Branding mis a jour pour {client}"

**Given** le client One se connecte avec un branding personnalise
**When** le dashboard se charge
**Then** :
- Le logo personnalise remplace le logo MonprojetPro One dans le header et la sidebar
- Le nom affiche remplace "MonprojetPro One" dans le header
- La couleur d'accent est appliquee via des CSS custom properties (override de la variable `--accent`)
- Le reste du design (typographie, layout, structure) reste standard
**And** si aucun branding personnalise n'est defini, le design One par defaut est utilise
**And** le branding est charge via le hook `use-elio-config.ts` qui resout aussi le `custom_branding`

---

## Resume Epic 10 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 10.1 | Dashboard One — accueil personnalise & modules actives | FR38, FR39 |
| 10.2 | Documents herites Lab, livrables & teasing Lab | FR40, FR41 |
| 10.3 | Configuration modules actifs & injection documentation Elio | FR42, FR43 |
| 10.4 | Personnalisation branding dashboard One | FR139 |

**Toutes les 7 FRs de l'Epic 10 sont couvertes.**

---
