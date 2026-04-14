# Story 6.6: Élio Lab — Configuration Orpheus (personnalisation agent)

Status: done

## Story

As a **client Lab avancé**,
I want **configurer les paramètres avancés d'Élio (température, modèle, instructions personnalisées)**,
So that **je peux affiner le comportement de mon assistant IA selon mes besoins spécifiques**.

## Acceptance Criteria

1. **AC1 — Migration DB** : Table `elio_configs` créée avec : id (UUID PK), client_id (FK clients NOT NULL UNIQUE), model (TEXT DEFAULT 'claude-sonnet-4' CHECK model IN ('claude-haiku-4', 'claude-sonnet-4', 'claude-opus-4')), temperature (NUMERIC DEFAULT 1.0 CHECK temperature >= 0 AND temperature <= 2), max_tokens (INTEGER DEFAULT 1500 CHECK max_tokens >= 100 AND max_tokens <= 8000), custom_instructions (TEXT nullable — instructions supplémentaires injectées dans system prompt), enabled_features (JSONB DEFAULT '{}' — flags feature : code_generation, web_search, etc.), created_at, updated_at. RLS : `elio_configs_select_owner`, `elio_configs_update_owner`.

2. **AC2 — Page configuration Orpheus** : Route `/settings/elio/advanced` (sous-nav "Paramètres > Élio Avancé"). Section "⚠️ Configuration avancée — Orpheus" avec warning : "Modifiez ces paramètres uniquement si vous savez ce que vous faites". Formulaire : sélection modèle (dropdown), slider température (0-2), input max_tokens, textarea custom_instructions, toggles features.

3. **AC3 — Injection config dans prompts** : Quand Élio répond, récupérer `elio_configs` + `communication_profiles` et fusionner dans l'appel API Claude : model, temperature, max_tokens du config, system prompt = `buildElioSystemPrompt(profile, step) + custom_instructions`. Si config inexistant → valeurs par défaut.

4. **AC4 — Reset config** : Bouton "Réinitialiser aux valeurs par défaut" dans la page. Confirmation dialog. Server Action `resetElioConfig()` → supprime config → retour aux defaults.

5. **AC5 — Preview prompt (dev mode)** : Si variable d'env `ENABLE_ELIO_DEBUG=true`, afficher section "Preview System Prompt" montrant le prompt complet qui sera envoyé à l'API. Utile pour debug, caché en prod.

6. **AC6 — Tests** : Tests unitaires co-localisés. Tests RLS. Tests injection config. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration Supabase (AC: #1)
  - [x] 1.1 Créer migration `00043_create_elio_configs.sql` (00038 déjà pris)
  - [x] 1.2 Table `elio_configs` avec tous les champs + contraintes
  - [x] 1.3 Index : `idx_elio_configs_client_id`
  - [x] 1.4 Trigger updated_at
  - [x] 1.5 RLS policies (select, insert, update, delete)

- [x] Task 2 — Server Actions (AC: #2, #4)
  - [x] 2.1 `actions/get-elio-config.ts` — Récupérer config ou retourner defaults
  - [x] 2.2 `actions/update-elio-config.ts` — Modifier config (upsert)
  - [x] 2.3 `actions/reset-elio-config.ts` — Supprimer config (retour defaults)

- [x] Task 3 — Page configuration (AC: #2, #5)
  - [x] 3.1 `apps/client/app/(dashboard)/settings/elio/advanced/page.tsx`
  - [x] 3.2 Formulaire config Orpheus intégré via OrpheusConfigForm
  - [x] 3.3 Preview system prompt conditionnel (si ENABLE_ELIO_DEBUG=true)

- [x] Task 4 — Composants UI (AC: #2)
  - [x] 4.1 `components/orpheus-config-form.tsx` — Formulaire config avancée
  - [x] 4.2 `components/elio-model-selector.tsx` — Dropdown sélection modèle
  - [x] 4.3 `components/elio-temperature-slider.tsx` — Slider natif HTML avec labels
  - [x] 4.4 `components/elio-feature-toggles.tsx` — Toggles features (Switch)

- [x] Task 5 — Intégration API Claude (AC: #3)
  - [x] 5.1 Modifier `actions/generate-brief.ts` : récupérer elio_configs via getElioConfig()
  - [x] 5.2 Modifier helper `buildElioSystemPrompt()` : paramètre optionnel customInstructions
  - [x] 5.3 Utiliser model, temperature, max_tokens du config dans appels API

- [x] Task 6 — Tests (AC: #6)
  - [x] 6.1 Tests Server Actions : get/update/resetElioConfig (5+4+4 tests)
  - [x] 6.2 Tests injection config : mock API Claude avec config custom (4 tests)
  - [x] 6.3 Tests composants : OrpheusConfigForm (6 tests)
  - [x] 6.4 Tests RLS : client A ne voit pas config client B (4 tests, skip si RUN_RLS_TESTS)

- [x] Task 7 — Documentation (AC: #6)
  - [x] 7.1 Documentation Orpheus dans `docs/elio-advanced.md`

## Dev Notes

### Architecture — Règles critiques

- **Extension module Élio** : Pas de nouveau module, extend `packages/modules/elio/`.
- **Orpheus** : Nom de code pour la configuration avancée Élio. UI avec warning car paramètres sensibles.
- **Defaults** : Si config inexistant, utiliser defaults (Sonnet 4, temp 1.0, 1500 tokens).
- **Security** : Ne jamais exposer la config complète côté client dans les logs (custom_instructions peut contenir infos sensibles).
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[ELIO:UPDATE_CONFIG]`, `[ELIO:RESET_CONFIG]`

### Base de données

**Migration `00038`** :
```sql
CREATE TABLE elio_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514' CHECK (model IN ('claude-haiku-4-20250122', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514')),
  temperature NUMERIC NOT NULL DEFAULT 1.0 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 1500 CHECK (max_tokens >= 100 AND max_tokens <= 8000),
  custom_instructions TEXT,
  enabled_features JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_elio_configs_client_id ON elio_configs(client_id);
```

**RLS policies** :
```sql
-- Client voit sa config
CREATE POLICY elio_configs_select_owner ON elio_configs FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Client peut modifier sa config
CREATE POLICY elio_configs_update_owner ON elio_configs FOR UPDATE
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Client peut créer sa config
CREATE POLICY elio_configs_insert_owner ON elio_configs FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Client peut supprimer sa config (reset)
CREATE POLICY elio_configs_delete_owner ON elio_configs FOR DELETE
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
```

### Server Action — Get config (avec defaults)

```typescript
// actions/get-elio-config.ts
'use server'
import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import type { ActionResponse } from '@monprojetpro/types'
import { successResponse, errorResponse } from '@monprojetpro/types'

const DEFAULT_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  temperature: 1.0,
  max_tokens: 1500,
  custom_instructions: null,
  enabled_features: {},
}

export async function getElioConfig(): Promise<ActionResponse<typeof DEFAULT_CONFIG>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) return errorResponse('Client non trouvé', 'NOT_FOUND')

  const { data: config } = await supabase
    .from('elio_configs')
    .select('*')
    .eq('client_id', client.id)
    .single()

  // Si config inexistant, retourner defaults
  if (!config) {
    return successResponse(DEFAULT_CONFIG)
  }

  return successResponse({
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    custom_instructions: config.custom_instructions,
    enabled_features: config.enabled_features,
  })
}
```

### Intégration config dans appels API

```typescript
// Modification de actions/generate-brief.ts (Story 6.5)
export async function generateBrief(stepId: string): Promise<ActionResponse<{ brief: string }>> {
  // ... récupération step, profile ...

  // Récupérer config Élio
  const { data: elioConfig } = await getElioConfig()
  const config = elioConfig || DEFAULT_CONFIG

  // Construire system prompt avec custom_instructions
  const systemPrompt = buildElioSystemPrompt(profile, step)
  const fullSystemPrompt = config.custom_instructions
    ? `${systemPrompt}\n\n**Instructions supplémentaires :**\n${config.custom_instructions}`
    : systemPrompt

  try {
    const message = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      system: fullSystemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    // ...
  } catch (error) {
    // ...
  }
}
```

### Page configuration Orpheus

```typescript
// apps/client/app/(dashboard)/settings/elio/advanced/page.tsx
import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import { OrpheusConfigForm } from '@/components/orpheus-config-form'
import { Alert, AlertDescription, AlertTitle } from '@monprojetpro/ui/components/alert'
import { AlertTriangle } from 'lucide-react'

export default async function ElioAdvancedSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user?.id)
    .single()

  const { data: config } = await supabase
    .from('elio_configs')
    .select('*')
    .eq('client_id', client?.id)
    .single()

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configuration avancée Élio</h1>
        <p className="text-muted-foreground mt-2">
          Personnalisez le comportement de votre assistant IA
        </p>
      </div>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuration Orpheus</AlertTitle>
        <AlertDescription>
          Ces paramètres sont réservés aux utilisateurs avancés. Une mauvaise configuration peut affecter la qualité des réponses d'Élio.
        </AlertDescription>
      </Alert>

      <OrpheusConfigForm initialConfig={config} />

      {process.env.ENABLE_ELIO_DEBUG === 'true' && (
        <details className="border rounded-lg p-4">
          <summary className="font-semibold cursor-pointer">Preview System Prompt (Debug)</summary>
          <pre className="mt-4 text-xs bg-muted p-4 rounded overflow-x-auto">
            {/* Afficher preview du prompt complet */}
          </pre>
        </details>
      )}
    </div>
  )
}
```

### Formulaire Orpheus

```typescript
// components/orpheus-config-form.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@monprojetpro/ui/components/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@monprojetpro/ui/components/select'
import { Slider } from '@monprojetpro/ui/components/slider'
import { Textarea } from '@monprojetpro/ui/components/textarea'
import { Input } from '@monprojetpro/ui/components/input'
import { Label } from '@monprojetpro/ui/components/label'
import { updateElioConfig, resetElioConfig } from '../actions'
import { toast } from '@monprojetpro/ui/components/use-toast'

const schema = z.object({
  model: z.enum(['claude-haiku-4-20250122', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514']),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().min(100).max(8000),
  custom_instructions: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function OrpheusConfigForm({ initialConfig }: { initialConfig?: any }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialConfig || {
      model: 'claude-sonnet-4-20250514',
      temperature: 1.0,
      max_tokens: 1500,
    },
  })

  const temperature = watch('temperature')

  const onSubmit = async (data: FormData) => {
    const response = await updateElioConfig(data)

    if (response.error) {
      toast({ title: 'Erreur', description: response.error.message, variant: 'destructive' })
      return
    }

    toast({ title: 'Configuration enregistrée', description: 'Élio utilisera ces nouveaux paramètres.' })
  }

  const handleReset = async () => {
    if (!confirm('Réinitialiser tous les paramètres aux valeurs par défaut ?')) return

    const response = await resetElioConfig()

    if (response.error) {
      toast({ title: 'Erreur', description: response.error.message, variant: 'destructive' })
      return
    }

    toast({ title: 'Configuration réinitialisée' })
    window.location.reload()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Modèle */}
      <div>
        <Label>Modèle Claude</Label>
        <Select value={watch('model')} onValueChange={(value) => setValue('model', value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="claude-haiku-4-20250122">Haiku 4 (rapide & économique)</SelectItem>
            <SelectItem value="claude-sonnet-4-20250514">Sonnet 4 (équilibré) — Recommandé</SelectItem>
            <SelectItem value="claude-opus-4-20250514">Opus 4 (puissant & lent)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Température */}
      <div>
        <Label>Température: {temperature.toFixed(1)}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Plus élevé = plus créatif, plus bas = plus déterministe
        </p>
        <Slider
          value={[temperature]}
          onValueChange={([value]) => setValue('temperature', value)}
          min={0}
          max={2}
          step={0.1}
        />
      </div>

      {/* Max tokens */}
      <div>
        <Label>Max tokens</Label>
        <Input type="number" {...register('max_tokens', { valueAsNumber: true })} />
        {errors.max_tokens && <p className="text-sm text-red-500 mt-1">{errors.max_tokens.message}</p>}
      </div>

      {/* Custom instructions */}
      <div>
        <Label>Instructions personnalisées (optionnel)</Label>
        <Textarea
          {...register('custom_instructions')}
          rows={5}
          placeholder="Ex: Utilise toujours des analogies avec le cinéma..."
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="destructive" onClick={handleReset}>
          Réinitialiser
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
```

### Fichiers à créer

**Module Élio (extension) :**
```
packages/modules/elio/
├── actions/get-elio-config.ts, update-elio-config.ts, reset-elio-config.ts
├── components/orpheus-config-form.tsx, elio-model-selector.tsx, elio-temperature-slider.tsx, elio-feature-toggles.tsx
└── docs/elio-advanced.md
```

**Routes :**
- `apps/client/app/(dashboard)/settings/elio/advanced/page.tsx`

**Migration :**
- `supabase/migrations/00038_create_elio_configs.sql`

### Fichiers à modifier

- `actions/generate-brief.ts` (Story 6.5) : Intégrer `getElioConfig()`
- `utils/build-system-prompt.ts` (Story 6.4) : Ajouter `custom_instructions` au prompt

### Dépendances

- **Story 6.4** : Table `communication_profiles`, helper `buildElioSystemPrompt()`
- **Story 6.5** : `generateBrief()` à modifier
- Table `clients`
- API Claude (Anthropic)

### Anti-patterns — Interdit

- NE PAS permettre des valeurs extrêmes qui cassent l'API (ex: temperature > 2, max_tokens > 8000)
- NE PAS exposer la config complète dans les logs (custom_instructions peut être sensible)
- NE PAS forcer Orpheus sur tous les clients (opt-in, defaults suffisent pour 90% des cas)
- NE PAS oublier le warning UX (paramètres avancés = risque de dégradation qualité)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-6-*.md#Story 6.6]
- [Source: docs/project-context.md]
- [Anthropic Models: https://docs.anthropic.com/en/docs/models-overview]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Migration numéro : 00038 déjà utilisé → migration créée en 00043
- `@monprojetpro/ui` : pas de Slider Radix → slider natif HTML `<input type="range">`
- `@monprojetpro/ui` : pas de `Label` → utilisation de `<label>` HTML avec Tailwind
- `Alert` : variant `warning` inexistant → utilisation du variant `default` avec AlertTriangle icon
- `getElioConfig()` en Server Action est appelable depuis Server Component (page)
- Les tests RLS sont skip par défaut (nécessitent `RUN_RLS_TESTS=1` + Supabase local)

### Completion Notes List

- Story 6.6 implémentée complètement : migration DB, 3 server actions, 4 composants UI, page settings, intégration API Claude, 28 tests ajoutés (2423 total, aucune régression)
- Code Review fixes: [H1] validation Zod serveur dans updateElioConfig, [M1] getElioConfig(clientId) skip double auth, [M2] debug preview avec vrai profil client, [M3] validation runtime modèle dans toElioConfig, [M4] loading.tsx + error.tsx pour route
- Task 1: Migration `00043_create_elio_configs.sql` avec RLS complet (select/insert/update/delete) et trigger updated_at
- Task 2: `getElioConfig` retourne defaults si config absente. `updateElioConfig` utilise upsert sur conflict client_id. `resetElioConfig` supprime la row DB.
- Task 3: Page Server Component `/settings/elio/advanced` avec warning Orpheus + debug preview conditionnel (ENABLE_ELIO_DEBUG=true)
- Task 4: `ElioModelSelector` (Select), `ElioTemperatureSlider` (input range natif), `ElioFeatureToggles` (Switch), `OrpheusConfigForm` (useTransition pattern, validation max_tokens)
- Task 5: `generate-brief.ts` modifié pour injecter model/temperature/max_tokens/customInstructions. `buildElioSystemPrompt` étendu avec 3ème paramètre optionnel `customInstructions`.
- Task 6: Tests unitaires co-localisés. Tests RLS dans `tests/rls/elio-configs-rls.test.ts` (skip si pas de Supabase local).
- Task 7: Documentation complète dans `docs/elio-advanced.md`

### File List

**Nouveaux fichiers :**
- `supabase/migrations/00043_create_elio_configs.sql`
- `packages/modules/elio/types/elio-config.types.ts`
- `packages/modules/elio/actions/get-elio-config.ts`
- `packages/modules/elio/actions/get-elio-config.test.ts`
- `packages/modules/elio/actions/update-elio-config.ts`
- `packages/modules/elio/actions/update-elio-config.test.ts`
- `packages/modules/elio/actions/reset-elio-config.ts`
- `packages/modules/elio/actions/reset-elio-config.test.ts`
- `packages/modules/elio/actions/generate-brief-with-elio-config.test.ts`
- `packages/modules/elio/components/orpheus-config-form.tsx`
- `packages/modules/elio/components/orpheus-config-form.test.tsx`
- `packages/modules/elio/components/elio-model-selector.tsx`
- `packages/modules/elio/components/elio-temperature-slider.tsx`
- `packages/modules/elio/components/elio-feature-toggles.tsx`
- `packages/modules/elio/docs/elio-advanced.md`
- `apps/client/app/(dashboard)/settings/elio/advanced/page.tsx`
- `tests/rls/elio-configs-rls.test.ts`

- `apps/client/app/(dashboard)/settings/elio/advanced/loading.tsx`
- `apps/client/app/(dashboard)/settings/elio/advanced/error.tsx`

**Fichiers modifiés :**
- `packages/modules/elio/actions/generate-brief.ts`
- `packages/modules/elio/utils/build-system-prompt.ts`
- `packages/modules/elio/index.ts`
