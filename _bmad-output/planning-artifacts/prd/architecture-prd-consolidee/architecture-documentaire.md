# Architecture Documentaire

## Principe : Source Unique, Formats Multiples

Le fichier source est toujours en **Markdown (.md)**. Tous les autres formats sont dérivés.

```
SOURCE OF TRUTH : .md
        │
        ├──→ Dashboard : Rendu HTML (react-markdown)
        │
        ├──→ Export client : Génération PDF (md-to-pdf)
        │
        └──→ Retour BMAD : Le .md original, inchangé
```

## Stack Documentaire (Open Source)

| Fonction | Outil | Licence | Usage |
|----------|-------|---------|-------|
| **Rendu HTML** | react-markdown | MIT | Visualisation dans les dashboards |
| **Génération PDF** | Gotenberg (Docker) | MIT | Export client avec template MonprojetPro |
| **Stockage** | Supabase Storage | - | Documents clients |
| **Backup travail** | Google Workspace | - | Dossiers BMAD locaux (sync auto) |

> **Note technique :** Gotenberg est hébergé sur le même VPS que N8N. Il expose une API qui convertit Markdown → PDF via Chromium. Temps de génération : ~1-2 secondes par document. Template CSS MonprojetPro à créer pour le branding.

## Workflow Validation avec Double Copie

Quand MiKL valide un document soumis par un client :

```
Client + Élio Lab
        │
        ▼
Brief généré → Soumis via Validation Hub
        │
        ▼
MiKL clique ✅ VALIDER
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
   COPIE 1            COPIE 2           ACTIONS
   Supabase           Google Drive
   Storage            (BMAD local)
        │                  │                  │
        ▼                  ▼                  ▼
   Client peut        MiKL peut         • Client notifié
   consulter &        travailler        • Étape suivante
   télécharger        avec Cursor         débloquée
```

## Structure Dossier Client (Supabase Storage)

```
/clients/{client_id}/
├── documents/           ← Visibles par le client (RLS: client + admin)
│   ├── brief-vision.md
│   ├── brief-positionnement.md
│   └── ...
│
├── _private/            ← MiKL uniquement (RLS: admin only)
│   └── notes-mikl.md
│
└── factures/            ← Visibles par le client
    ├── facture-001.pdf
    └── devis-001.pdf
```

## Structure Dossier BMAD Local (Google Drive)

```
C:/Google Drive/Projets/clients/{client_id}/
├── _bmad/
│   ├── inputs/                    ← Documents reçus du client (copie auto)
│   │   ├── brief-vision.md
│   │   ├── brief-positionnement.md
│   │   └── brief-offre.md
│   │
│   ├── _bmad-output/              ← Outputs générés avec BMAD
│   │   ├── architecture.md
│   │   └── specs/
│   │
│   └── project-context.md         ← Config BMAD du projet
│
└── livrables/                     ← Ce qui est livré au client
```

## Visualisation Documents dans les Dashboards

```
┌─────────────────────────────────────────────────┐
│  📄 Brief Vision - Thomas Coaching              │
│  ─────────────────────────────────────────────  │
│                                                 │
│  [Contenu du document rendu en HTML]            │
│  Avec le style MonprojetPro, joli, lisible             │
│                                                 │
│  ─────────────────────────────────────────────  │
│  [📥 Télécharger PDF]  [📝 Voir source (.md)]   │
└─────────────────────────────────────────────────┘
```

## Backup & Résilience

| Donnée | Stockage Principal | Backup |
|--------|-------------------|--------|
| Documents clients | Supabase Storage | Backup Supabase auto |
| Travail BMAD | Google Drive | Sync auto Google |
| Code MonprojetPro | GitHub | Versionné |

**Règle d'or : Le PC local n'est JAMAIS la source de vérité.**

---
