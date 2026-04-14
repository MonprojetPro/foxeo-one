# Story 8.3: Feedback réponses Élio, documents dans le chat & historique configs

Status: done

## Story

As a **utilisateur (MiKL ou client)**,
I want **donner un feedback sur les réponses d'Élio, voir les documents générés directement dans le chat, et (pour MiKL) consulter l'historique des configs Élio**,
So that **Élio s'améliore grâce aux retours, les documents sont accessibles sans quitter la conversation, et MiKL garde la traçabilité des configs**.

## Acceptance Criteria

### AC1 : Feedback sur réponses Élio (FR126)

**Given** Élio envoie une réponse dans le chat
**When** la réponse est affichée
**Then** chaque message d'Élio affiche en bas de bulle deux boutons discrets :

- 👍 (utile) / 👎 (pas utile)
- Les boutons apparaissent au survol (desktop) ou sont toujours visibles (mobile)
- Un seul choix possible par message (toggle : cliquer à nouveau désactive)

**And** au clic, la Server Action `submitFeedback(messageId, rating: 'useful' | 'not_useful')` est exécutée
**And** le feedback est stocké dans `elio_messages.metadata.feedback: { rating, created_at }`
**And** un micro-feedback visuel confirme le choix (le bouton sélectionné change de couleur)
**And** aucune notification n'est envoyée — le feedback est collecté silencieusement pour analyse

### AC2 : Documents dans le chat (FR125)

**Given** Élio génère ou partage un document dans la conversation
**When** le message contient un document (brief, livrable, export)
**Then** le composant `elio-document.tsx` affiche dans la bulle de chat :

- Le nom du document avec une icône de type (PDF, DOC, image)
- Un aperçu inline si possible (markdown rendu, image thumbnail)
- Un bouton "Voir le document complet" qui ouvre le module documents (Epic 4)
- Un bouton "Télécharger" (PDF)

**And** le document est référencé via `elio_messages.metadata.document_id` (FK vers la table `documents`)
**And** si le document est un brief généré par Élio Lab, il affiche le badge "Brief généré par Élio"

### AC3 : Historique des configurations Élio (FR87 — Hub uniquement)

**Given** MiKL veut consulter l'historique des configurations Élio d'un client
**When** il accède à la fiche client dans le Hub (section "Configuration Élio", Story 6.6)
**Then** en plus du formulaire d'édition existant, un onglet "Historique" affiche :

- La liste chronologique des modifications de config Élio (date, champs modifiés, ancienne valeur → nouvelle valeur)
- Les données proviennent de la table `elio_config_history` (ou du versionning JSON mis en place en Story 6.6)
- Chaque entrée est collapsible (clic pour voir le détail)
- Un bouton "Restaurer cette version" permet de revenir à une config précédente

**And** la restauration déclenche une confirmation modale avant exécution
**And** le cache TanStack Query est invalidé après restauration

## Tasks / Subtasks

- [x] **Task 1** : Ajouter feedback dans `elio_messages.metadata`
  - [x] 1.1 : Modifier le type `ElioMessage` pour inclure `metadata.feedback`
  - [x] 1.2 : Créer le type `FeedbackRating = 'useful' | 'not_useful'`

- [x] **Task 2** : Créer le composant `elio-feedback.tsx` (AC: #1, FR126)
  - [x] 2.1 : Créer le composant avec 2 boutons 👍 / 👎
  - [x] 2.2 : Boutons discrets au survol (desktop)
  - [x] 2.3 : Boutons visibles (mobile < 768px)
  - [x] 2.4 : Toggle : un seul choix possible, cliquer à nouveau désactive
  - [x] 2.5 : Micro-feedback visuel (changement couleur bouton)

- [x] **Task 3** : Créer la Server Action `submitFeedback()` (AC: #1)
  - [x] 3.1 : Créer `actions/submit-feedback.ts`
  - [x] 3.2 : Mettre à jour `elio_messages.metadata.feedback`
  - [x] 3.3 : Retourner `{ data: success, error: null }`
  - [x] 3.4 : Pas de notification envoyée (collecte silencieuse)

- [x] **Task 4** : Créer le composant `elio-document.tsx` (AC: #2, FR125)
  - [x] 4.1 : Créer le composant avec affichage nom + icône type
  - [x] 4.2 : Aperçu inline (markdown rendu, image thumbnail)
  - [x] 4.3 : Bouton "Voir le document complet" → module documents
  - [x] 4.4 : Bouton "Télécharger" (PDF)
  - [x] 4.5 : Badge "Brief généré par Élio" si applicable

- [x] **Task 5** : Ajouter `document_id` dans `elio_messages.metadata`
  - [x] 5.1 : Modifier le type `ElioMessage.metadata.documentId`
  - [x] 5.2 : Créer la référence FK vers `documents.id`

- [x] **Task 6** : Créer la migration `elio_config_history` (AC: #3)
  - [x] 6.1 : Créer `supabase/migrations/00047_elio_config_history.sql` (00012 déjà pris par rls_policies)
  - [x] 6.2 : Table avec id, client_id, field_changed, old_value, new_value, changed_at, changed_by
  - [x] 6.3 : Policies RLS (opérateur voit historique de ses clients)
  - [x] 6.4 : Trigger sur `elio_configs` (pas `client_configs.elio_config` qui n'existe pas)

- [x] **Task 7** : Créer le composant historique config (AC: #3, FR87)
  - [x] 7.1 : Créer `components/elio-config-history.tsx` (Hub uniquement)
  - [x] 7.2 : Afficher liste chronologique des modifications
  - [x] 7.3 : Affichage collapsible par entrée (détails au clic)
  - [x] 7.4 : Bouton "Restaurer cette version" avec confirmation modale

- [x] **Task 8** : Créer la Server Action `restoreElioConfig()`
  - [x] 8.1 : Créer `actions/restore-elio-config.ts`
  - [x] 8.2 : Restaurer la config depuis l'historique
  - [x] 8.3 : Invalider le cache `['elio-config']` et `['elio-config-history']`
  - [x] 8.4 : La restauration est loguée automatiquement par le trigger DB

- [x] **Task 9** : Intégrer feedback dans `elio-message.tsx`
  - [x] 9.1 : Ajouter `elio-feedback.tsx` en bas de chaque message Élio (slot pattern)
  - [x] 9.2 : Afficher le feedback existant si déjà donné (prop `currentFeedback`)
  - [x] 9.3 : État optimiste géré localement dans `elio-feedback.tsx`

- [x] **Task 10** : Intégrer documents dans les messages
  - [x] 10.1 : Détecter si `message.metadata.documentId` existe dans `elio-chat.tsx`
  - [x] 10.2 : Afficher `elio-document.tsx` dans la bulle (slot pattern)
  - [x] 10.3 : Props passées depuis `metadata` (documentName, documentType, etc.)

- [x] **Task 11** : Tests
  - [x] 11.1 : Tester `submitFeedback()` (utile/pas utile, toggle, NOT_FOUND, DB_ERROR)
  - [x] 11.2 : Tester `elio-document.tsx` (aperçu, download, navigation, badge, types)
  - [x] 11.3 : Tester historique config (affichage, restauration, cache invalidation)

## Dev Notes

### Migration elio_config_history

```sql
-- Table elio_config_history
CREATE TABLE elio_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_elio_config_history_client_id ON elio_config_history(client_id);
CREATE INDEX idx_elio_config_history_changed_at ON elio_config_history(changed_at DESC);

-- RLS policies
ALTER TABLE elio_config_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view config history of their clients"
  ON elio_config_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = elio_config_history.client_id
      AND clients.operator_id = auth.uid()
    )
  );

-- Trigger pour enregistrer les modifications
CREATE OR REPLACE FUNCTION log_elio_config_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_config JSONB;
  new_config JSONB;
  changed_field TEXT;
BEGIN
  old_config := OLD.elio_config;
  new_config := NEW.elio_config;

  -- Comparer les configs et enregistrer les différences
  -- (simplifié — à adapter selon la structure exacte de elio_config)
  IF old_config IS DISTINCT FROM new_config THEN
    INSERT INTO elio_config_history (client_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'elio_config', old_config, new_config, auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_elio_config_changes
  AFTER UPDATE ON client_configs
  FOR EACH ROW
  WHEN (OLD.elio_config IS DISTINCT FROM NEW.elio_config)
  EXECUTE FUNCTION log_elio_config_changes();
```

### Types feedback

```typescript
// types/elio.types.ts
export type FeedbackRating = 'useful' | 'not_useful'

export interface ElioMessageMetadata {
  feedback?: {
    rating: FeedbackRating
    createdAt: string
  }
  documentId?: string
  profileObservation?: string
  draftType?: 'email' | 'validation_hub' | 'chat'
  evolutionBrief?: boolean
}
```

### Composant elio-feedback.tsx

```typescript
// components/elio-feedback.tsx
'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { submitFeedback } from '../actions/submit-feedback'
import { cn } from '@monprojetpro/utils'

interface ElioFeedbackProps {
  messageId: string
  currentFeedback?: FeedbackRating
}

export function ElioFeedback({ messageId, currentFeedback }: ElioFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackRating | null>(currentFeedback ?? null)
  const [isPending, startTransition] = useTransition()

  const handleFeedback = (rating: FeedbackRating) => {
    // Toggle : cliquer à nouveau désactive
    const newRating = feedback === rating ? null : rating

    // Optimistic update
    setFeedback(newRating)

    startTransition(async () => {
      await submitFeedback(messageId, newRating)
    })
  }

  return (
    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
      <button
        onClick={() => handleFeedback('useful')}
        disabled={isPending}
        className={cn(
          'p-1 rounded-full hover:bg-accent transition-colors',
          feedback === 'useful' && 'text-green-500 bg-green-500/10'
        )}
        aria-label="Réponse utile"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleFeedback('not_useful')}
        disabled={isPending}
        className={cn(
          'p-1 rounded-full hover:bg-accent transition-colors',
          feedback === 'not_useful' && 'text-red-500 bg-red-500/10'
        )}
        aria-label="Réponse pas utile"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  )
}
```

### Composant elio-document.tsx

```typescript
// components/elio-document.tsx
'use client'

import { FileText, Download, ExternalLink } from 'lucide-react'
import { Button } from '@monprojetpro/ui'
import { useRouter } from 'next/navigation'

interface ElioDocumentProps {
  documentId: string
  documentName: string
  documentType: 'pdf' | 'doc' | 'image' | 'markdown'
  isElioGenerated?: boolean
  preview?: string
}

export function ElioDocument({
  documentId,
  documentName,
  documentType,
  isElioGenerated,
  preview,
}: ElioDocumentProps) {
  const router = useRouter()

  const icons = {
    pdf: <FileText className="w-5 h-5 text-red-500" />,
    doc: <FileText className="w-5 h-5 text-blue-500" />,
    image: <FileText className="w-5 h-5 text-purple-500" />,
    markdown: <FileText className="w-5 h-5 text-green-500" />,
  }

  return (
    <div className="border rounded-lg p-4 my-2 bg-card">
      <div className="flex items-start gap-3">
        {icons[documentType]}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{documentName}</h4>
            {isElioGenerated && (
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                Brief généré par Élio
              </span>
            )}
          </div>

          {preview && (
            <div className="mt-2 text-sm text-muted-foreground line-clamp-3">
              {preview}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/modules/documents/${documentId}`)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir le document complet
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(`/api/documents/${documentId}/download`, '_blank')}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### References

- [Source: Epic 8 — Story 8.3](file:///_bmad-output/planning-artifacts/epics/epic-8-agents-ia-elio-hub-lab-one-stories-detaillees.md#story-83)
- [Source: PRD — FR87, FR125, FR126](file:///_bmad-output/planning-artifacts/prd/functional-requirements-monprojetpro-plateforme.md)

---

**Story créée le** : 2026-02-13
**Story prête pour développement** : ✅ Oui
**Dépendances** : Story 8.1, 8.2
**FRs couvertes** : FR87 (historique configs), FR125 (documents dans chat), FR126 (feedback)

---

## Dev Agent Record

**Agent** : Amelia (Dev Agent)
**Date** : 2026-03-02
**Statut** : Done — Code Review Phase 2 complète (6 fixes appliqués)

### Implementation Notes

- **Migration** : Numéro 00047 utilisé (00012 déjà occupé par `rls_policies.sql`)
- **Trigger** : Appliqué sur `elio_configs` (trigger AFTER UPDATE), pas sur `client_configs.elio_config` qui n'existe pas en tant que table séparée
- **Slot pattern** : `feedbackSlot` et `documentSlot` dans `ElioMessage` → `ElioChat` injecte les composants
- **Feedback optimiste** : Géré localement dans `elio-feedback.tsx` via `useState` + `useTransition` (pas TanStack mutation)
- **ElioConfigSection** : Composant Hub uniquement, wraps `OrpheusConfigForm` (existant) + `ElioConfigHistory` en sub-tabs
- **Test fix** : Sélecteur `getByTestId('expand-btn-{id}')` ajouté pour le bouton expand dans `elio-config-history.tsx`

### Completion Notes

Tous les ACs implémentés :
- **AC1** ✅ : Feedback 👍/👎 avec toggle, couleur active, collecte silencieuse
- **AC2** ✅ : Documents dans le chat (carte, icône type, aperçu, liens, badge Élio)
- **AC3** ✅ : Historique configs Hub, collapsible, restauration avec modale + invalidation cache

### Code Review Fixes (Phase 2 — Opus)

- **H1** : Ajouté `group` class sur `elio-message.tsx`, inversé logique visibilité feedback → mobile visible, desktop hover
- **H2** : Corrigé `created_at` → `createdAt` dans `submit-feedback.ts` metadata (alignement TypeScript)
- **H3** : Supprimé policy INSERT `WITH CHECK (true)` → trigger SECURITY DEFINER bypass RLS, plus de faux historique possible
- **M1** : Supprimé conditionnel mort `docsBasePath` dans `elio-document.tsx`
- **M2** : Remplacé type local `HistoryEntry` par import `ElioConfigHistoryEntry` dans `elio-config-history.tsx`
- **M3** : Ajouté commentaire alignement schema dans `restore-elio-config.ts`
- **L1** : Documenté (JSON.stringify comparaison acceptable pour valeurs simples)
- **L2** : Documenté (feedback optimiste sans rollback, acceptable pour story)

### File List

**Créés :**
- `packages/modules/elio/components/elio-feedback.tsx`
- `packages/modules/elio/components/elio-feedback.test.tsx`
- `packages/modules/elio/components/elio-document.tsx`
- `packages/modules/elio/components/elio-document.test.tsx`
- `packages/modules/elio/components/elio-config-history.tsx`
- `packages/modules/elio/components/elio-config-history.test.tsx`
- `packages/modules/elio/components/elio-config-section.tsx`
- `packages/modules/elio/actions/submit-feedback.ts`
- `packages/modules/elio/actions/submit-feedback.test.ts`
- `packages/modules/elio/actions/get-elio-config-history.ts`
- `packages/modules/elio/actions/get-elio-config-history.test.ts`
- `packages/modules/elio/actions/restore-elio-config.ts`
- `packages/modules/elio/actions/restore-elio-config.test.ts`
- `supabase/migrations/00047_elio_config_history.sql`

**Modifiés :**
- `packages/modules/elio/types/elio.types.ts` (FeedbackRating, ElioMessageMetadata)
- `packages/modules/elio/components/elio-message.tsx` (documentSlot prop)
- `packages/modules/elio/components/elio-chat.tsx` (feedbackSlot + documentSlot injection)
- `packages/modules/elio/index.ts` (exports ElioFeedback, ElioDocument, ElioConfigHistory, ElioConfigSection + actions + types)
- `apps/hub/app/(dashboard)/modules/crm/clients/[clientId]/client-detail-with-support.tsx` (onglet Configuration Élio)
