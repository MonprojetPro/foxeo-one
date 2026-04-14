# Flux Onboarding Client

## Vue d'Ensemble

Ce document décrit le flux complet depuis le premier contact avec un prospect jusqu'à son accès au dashboard MonprojetPro.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUX ONBOARDING CLIENT                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  POINTS D'ENTRÉE                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ QR Code  │ │ LinkedIn │ │   Site   │ │  Mobile  │                    │
│  │ (carte)  │ │  (lien)  │ │ (bouton) │ │  (MiKL)  │                    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘                    │
│       │            │            │            │                           │
│       └────────────┴────────────┴────────────┘                           │
│                         │                                                │
│                         ▼                                                │
│              ┌─────────────────────┐                                     │
│              │      CAL.COM        │                                     │
│              │   (Prise de RDV)    │                                     │
│              └──────────┬──────────┘                                     │
│                         │                                                │
│                         ▼                                                │
│              ┌─────────────────────┐                                     │
│              │   SALLE D'ATTENTE   │                                     │
│              │  (Formulaire pré-   │                                     │
│              │   visio + INSEE)    │                                     │
│              └──────────┬──────────┘                                     │
│                         │                                                │
│                         ▼                                                │
│              ┌─────────────────────┐                                     │
│              │      OPENVIDU       │                                     │
│              │  (Visio + Record +  │                                     │
│              │   Transcription)    │                                     │
│              └──────────┬──────────┘                                     │
│                         │                                                │
│                         ▼                                                │
│              ┌─────────────────────┐                                     │
│              │     FOXEO HUB       │                                     │
│              │  (Post-visio MiKL)  │                                     │
│              │  Choix du statut    │                                     │
│              └──────────┬──────────┘                                     │
│                         │                                                │
│       ┌─────────────────┼─────────────────┬─────────────────┐           │
│       ▼                 ▼                 ▼                 ▼           │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐        │
│  │🟢 CHAUD │      │🟡 TIÈDE │      │🟠 FROID │      │🔴 NON   │        │
│  │ Créer   │      │ Relance │      │ À dispo │      │ Refus   │        │
│  │ espace  │      │ auto    │      │         │      │         │        │
│  └────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘        │
│       │                │                │                │              │
│       ▼                ▼                ▼                ▼              │
│   CLIENT           PROSPECT         PROSPECT         PROSPECT           │
│  (Lab/One)          CHAUD            FROID            FERMÉ             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Phase 1 : Prise de Rendez-vous

### Points d'Entrée

| Canal | Destination | Comportement |
|-------|-------------|--------------|
| QR Code carte de visite | Cal.com MonprojetPro | Scan → Page RDV |
| Lien LinkedIn | Cal.com MonprojetPro | Clic → Page RDV |
| Bouton site internet | Cal.com MonprojetPro | Clic → Page RDV |
| MiKL sur mobile | Hub MonprojetPro | Création manuelle RDV |

### Outil : Cal.com (Self-hosted)

**Pourquoi Cal.com :**
- Open source, self-hosted (gratuit)
- Équivalent de Calendly
- Synchro bidirectionnelle Google Calendar
- Formulaires personnalisables
- API pour création de RDV depuis mobile
- Possibilité de définir un lien de visio custom (notre lien MonprojetPro/OpenVidu)

**Informations collectées à la prise de RDV :**

| Champ | Obligatoire | Type |
|-------|-------------|------|
| Prénom | Oui | Texte |
| Nom | Oui | Texte |
| Email | Oui | Email |
| Nom de la société | Optionnel | Texte |

**Après la réservation :**
- Email de confirmation envoyé au prospect
- Contient : date/heure, lien visio `visio.monprojet-pro.com/rdv/{room-id}`
- Webhook Cal.com → Backend MonprojetPro :
  - Création fiche prospect dans Supabase
  - Création room OpenVidu unique
  - Génération du lien personnalisé

### Flux Technique Cal.com → MonprojetPro

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CAL.COM                              FOXEO BACKEND                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Client réserve ─────────────────────▶ Webhook reçu                      │
│                                              │                           │
│                                              ▼                           │
│                                       Créer prospect                     │
│                                       dans Supabase                      │
│                                              │                           │
│                                              ▼                           │
│                                       Créer room                         │
│                                       OpenVidu unique                    │
│                                              │                           │
│                                              ▼                           │
│                                       Générer lien                       │
│                                       visio.monprojet-pro.com/rdv/{id}            │
│                                              │                           │
│  Email confirmation ◀────────────────────────┘                           │
│  avec lien visio                                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Phase 2 : Salle d'Attente (Pré-visio)

### Timing

- Le client reçoit un créneau à H:00
- Le lien l'invite à arriver **5 minutes avant** (H-5)
- Pendant ces 5 minutes, il complète le formulaire
- MiKL n'attend pas

### Interface Salle d'Attente

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     👋 Bonjour {Prénom} !                                       │
│                                                                 │
│     MiKL vous rejoint dans quelques instants.                  │
│                                                                 │
│     ─────────────────────────────────────────────────────────  │
│                                                                 │
│     📋 Dernières infos pour préparer notre échange             │
│        (Promis, c'est la seule fois qu'on vous le demande !)   │
│                                                                 │
│     📱 Téléphone *        [_____________________]               │
│                                                                 │
│     🏢 Vous avez déjà une entreprise ?                         │
│        ○ Oui → SIRET * [______________] [🔍 Vérifier]          │
│                                                                 │
│              ┌─────────────────────────────────────┐           │
│              │ ✅ {Raison sociale}                 │           │
│              │ {Adresse complète}                  │           │
│              │ {Activité} ({Code NAF})             │           │
│              └─────────────────────────────────────┘           │
│                                                                 │
│        ○ Non, pas encore                                        │
│              📍 Votre ville * [______________]                  │
│              (Pour mieux vous connaître)                        │
│                                                                 │
│     ─────────────────────────────────────────────────────────  │
│                                                                 │
│     📹 Cet échange sera enregistré                              │
│        → Vous recevrez la retranscription par email            │
│        → Pratique pour garder une trace de nos échanges !      │
│                                                                 │
│     ☑️ J'accepte l'enregistrement de cette visio *             │
│                                                                 │
│                    [ ✅ Je suis prêt ]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Informations Collectées (Salle d'Attente)

| Champ | Obligatoire | Condition | Source |
|-------|-------------|-----------|--------|
| Téléphone | Oui | Toujours | Saisie manuelle |
| SIRET | Oui | Si entreprise | Saisie manuelle |
| Raison sociale | Auto | Si SIRET | API INSEE |
| Adresse | Auto | Si SIRET | API INSEE |
| Code NAF + libellé | Auto | Si SIRET | API INSEE |
| Ville | Oui | Si pas d'entreprise | Saisie manuelle |
| Consentement enregistrement | Oui | Toujours | Checkbox |

### API INSEE

**Endpoint :** `https://api.insee.fr/entreprises/sirene/V3/siret/{siret}`

**Données retournées :**
- Raison sociale officielle
- Adresse complète du siège
- Code NAF + libellé (secteur d'activité)
- Date de création
- Tranche d'effectifs

**Temps de réponse :** ~200ms

**Coût :** Gratuit (API publique)

## Phase 3 : Visio

### Outil : OpenVidu (Self-hosted)

**Fonctionnalités activées :**
- Visio temps réel (WebRTC)
- Enregistrement automatique (Egress API)
- Transcription temps réel ou post-visio (Deepgram)

### Vue MiKL pendant la Visio

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FOXEO HUB — Visio avec {Prénom Nom}                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │                                │  │  📋 FICHE PROSPECT             │ │
│  │        FLUX VIDÉO              │  │  ──────────────────────────    │ │
│  │                                │  │  Nom : {Nom}                   │ │
│  │                                │  │  Prénom : {Prénom}             │ │
│  │                                │  │  Email : {Email}               │ │
│  │                                │  │  Tél : {Téléphone}             │ │
│  │                                │  │  ──────────────────────────    │ │
│  │                                │  │  🏢 {Raison sociale}           │ │
│  │                                │  │  {Adresse}                     │ │
│  │                                │  │  {Activité} ({NAF})            │ │
│  │                                │  │  ──────────────────────────    │ │
│  │                                │  │  📅 RDV pris le : {date}       │ │
│  └────────────────────────────────┘  │  📍 Source : {QR/LinkedIn/...} │ │
│                                       └────────────────────────────────┘ │
│  🔴 Enregistrement en cours                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fin de Visio

À la fin de la visio :
1. Enregistrement stoppé et sauvegardé (Supabase Storage)
2. Transcription générée (voir section Transcription ci-dessous)
3. Élio Hub génère un résumé de l'échange
4. MiKL arrive sur l'écran post-visio

## Transcription Audio — Décision Technique

**Contexte :** TOUTES les visios (pas seulement la 1ère) seront enregistrées et transcrites.

### Options Évaluées

| Solution | Prix/heure | Diarisation | Qualité FR | Notes |
|----------|------------|-------------|------------|-------|
| **Whisper API** (OpenAI) | ~0,36€ | Non native | Excellente | Meilleur rapport qualité/prix |
| **Deepgram** | ~0,63€ | Oui | Excellente | 200$ crédit offert (~300h gratuites) |
| **OpenVidu STT** | PRO/Enterprise only | Variable | Variable | Non disponible en Community |
| **DeepSeek V3** | N/A | N/A | N/A | Pas de STT natif |

### Décision : Stratégie Progressive

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1 : Lancement (Gratuit)                                              │
│  Provider: Deepgram                                                         │
│  Coût: 0€ (200$ de crédit gratuit = ~300h de visio)                        │
│  Avantage: Diarisation incluse (qui parle quand)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  PHASE 2 : Post-crédit (si besoin)                                          │
│  Option A: Rester sur Deepgram (~10€/mois)                                  │
│  Option B: Migrer vers Whisper (~5€/mois) si diarisation pas nécessaire    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Estimation Coûts Mensuels

Hypothèse : 20 visios/mois x 45 min = **15 heures/mois**

| Solution | Coût mensuel |
|----------|--------------|
| Whisper API | ~5,40€ |
| Deepgram (avec diarisation) | ~9,45€ |

### Workflow Technique Transcription

```
VISIO TERMINÉE (OpenVidu)
       │
       ▼
   Fichier audio (.webm/.mp4)
       │
       ▼
   Envoi à Deepgram API
       │
       ▼
   Transcription texte + diarisation reçue
       │
       ▼
   Élio Hub (DeepSeek) analyse et résume
       │
       ▼
   Résumé + transcription stockés dans Supabase
       │
       ▼
   Email au prospect avec lien transcription
```

### Stockage Transcriptions

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  TABLE: visio_transcriptions                                            │
│  ├── id UUID                                                            │
│  ├── prospect_id UUID REFERENCES prospects(id)                          │
│  ├── client_id UUID REFERENCES clients(id)                              │
│  ├── visio_date TIMESTAMP                                               │
│  ├── recording_url TEXT (Supabase Storage)                              │
│  ├── transcription_text TEXT                                            │
│  ├── transcription_json JSONB (avec diarisation)                        │
│  ├── resume_elio TEXT                                                   │
│  ├── duree_minutes INT                                                  │
│  ├── cout_transcription DECIMAL                                         │
│  └── created_at TIMESTAMP                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Conclusion :** Le coût transcription reste négligeable (<10€/mois). Deepgram recommandé pour la diarisation.

## Phase 4 : Post-Visio (Hub MiKL)

### Interface Post-Visio

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📹 Visio avec {Prénom Nom} terminée                     {heure}        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📝 RÉSUMÉ GÉNÉRÉ PAR ÉLIO                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ {Prénom} est {activité} depuis {durée}. Il/Elle cherche à       │   │
│  │ {besoin principal}. Points clés :                                │   │
│  │ • {Point 1}                                                      │   │
│  │ • {Point 2}                                                      │   │
│  │ • {Point 3}                                                      │   │
│  │ • Budget : {budget}                                              │   │
│  │ • Timeline : {timeline}                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  [✏️ Modifier le résumé]                                               │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  🎯 QUELLE SUITE POUR {PRÉNOM} ?                                       │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  🟢 CHAUD   │  │  🟡 TIÈDE   │  │  🟠 FROID   │  │   🔴 NON    │   │
│  │             │  │             │  │             │  │             │   │
│  │ On part     │  │ Doit        │  │ Pas pour    │  │ Pas         │   │
│  │ ensemble !  │  │ réfléchir   │  │ maintenant  │  │ intéressé   │   │
│  │             │  │             │  │             │  │             │   │
│  │ → Créer     │  │ → Relance   │  │ → Mail      │  │ → Mail      │   │
│  │   espace    │  │   auto J+X  │  │   "à dispo" │  │   merci     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ✉️ APERÇU EMAIL (adapté au statut sélectionné)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Objet : {Objet adapté}                                          │   │
│  │                                                                  │   │
│  │ Bonjour {Prénom},                                               │   │
│  │                                                                  │   │
│  │ {Corps du mail adapté au statut}                                │   │
│  │                                                                  │   │
│  │ {Lien création espace si CHAUD}                                 │   │
│  │ {Lien transcription}                                            │   │
│  │                                                                  │   │
│  │ MiKL                                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  [✏️ Personnaliser]                                                     │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [ 📤 Envoyer maintenant ]   [ ⏰ Programmer ]   [ 💾 Standby ]         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Les 4 Statuts et leurs Actions

| Statut | Contexte | Email envoyé | Action CRM | Relance |
|--------|----------|--------------|------------|---------|
| **CHAUD** | Client convaincu, on démarre | Résumé + Lien création espace | Statut "Client" | Non |
| **TIEDE** | Intéressé, doit réfléchir/consulter | Résumé ton commercial | Statut "Prospect chaud" | Auto J+X (configurable) |
| **FROID** | Pas le bon moment | Résumé + "Je reste à dispo" | Statut "Prospect froid" | Non |
| **NON** | Pas intéressé | Remerciement + Transcription | Statut "Prospect fermé" | Non |

### Templates Email

**4 templates pré-configurés** (modifiables dans Hub > Paramètres) :

1. **Template CHAUD** : Création espace
2. **Template TIEDE** : Commercial + relance
3. **Template FROID** : À disposition
4. **Template NON** : Remerciement simple

**Tous les templates incluent :**
- Lien vers la transcription de la visio
- Signature MiKL personnalisée

### Options d'Envoi

| Option | Comportement |
|--------|--------------|
| **Envoyer maintenant** | Email envoyé immédiatement |
| **Programmer** | Choisir date/heure d'envoi |
| **Standby** | Brouillon sauvegardé + Rappel sur dashboard MiKL |

## Phase 5 : Création de Compte (Statut CHAUD)

### Flux de Création

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  EMAIL REÇU PAR LE CLIENT                                                │
│  ─────────────────────────                                               │
│  "Bonjour {Prénom}, [...] Cliquez ici pour créer votre espace MonprojetPro"    │
│                         │                                                │
│                         ▼                                                │
│              ┌─────────────────────┐                                     │
│              │  PAGE CRÉATION MDP  │                                     │
│              │  app.monprojet-pro.com/      │                                     │
│              │  create-account     │                                     │
│              │  ?token={token}     │                                     │
│              └──────────┬──────────┘                                     │
│                         │                                                │
│                         ▼                                                │
│              ┌─────────────────────┐                                     │
│              │  FORMULAIRE         │                                     │
│              │  • Email (pré-      │                                     │
│              │    rempli, readonly)│                                     │
│              │  • Mot de passe     │                                     │
│              │  • Confirmer MDP    │                                     │
│              │  • CGU checkbox     │                                     │
│              └──────────┬──────────┘                                     │
│                         │                                                │
│                         ▼                                                │
│              ┌─────────────────────┐                                     │
│              │  COMPTE CRÉÉ        │                                     │
│              │  Redirection vers   │                                     │
│              │  dashboard + modale │                                     │
│              │  onboarding Élio    │                                     │
│              └─────────────────────┘                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Première Connexion

À la première connexion, le client voit une **modale d'onboarding Élio** qui :
- L'accueille par son prénom
- Lui explique comment fonctionne son espace
- L'oriente vers les premières actions à faire

---
