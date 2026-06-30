'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Textarea,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@monprojetpro/ui'
import { useOfficialRecipeActions, useOfficialRecipe } from '../hooks/use-official-recipes'
import type {
  OfficialRecipeListItem,
  OfficialRecipeInput,
  OfficialRecipeDetail,
  RecipeIngredientInput,
  RecipeStepInput,
  Season,
  Course,
  RecipeType,
  MealType,
  Difficulty,
  Budget,
} from '../types'

const SEASONS: { key: Season; label: string }[] = [
  { key: 'spring', label: 'Printemps' },
  { key: 'summer', label: 'Été' },
  { key: 'autumn', label: 'Automne' },
  { key: 'winter', label: 'Hiver' },
]

function numOrUndef(s: string): number | undefined {
  if (s.trim() === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
function numToStr(n: number | null | undefined): string {
  return n != null ? String(n) : ''
}

interface FormState {
  name: string
  seasons: Season[]
  course: Course
  recipe_type: RecipeType
  meal_type: MealType
  prep_minutes: string
  cook_minutes: string
  rest_minutes: string
  portions: string
  is_vegetarian: boolean
  is_gluten_free: boolean
  is_lactose_free: boolean
  difficulty: Difficulty | ''
  budget: Budget | ''
  photo_url: string
  notes: string
  variants_tips: string
  source_url: string
  ingredients: RecipeIngredientInput[]
  steps: RecipeStepInput[]
}

function blankState(recipe: OfficialRecipeListItem | null): FormState {
  return {
    name: recipe?.name ?? '',
    seasons: [],
    course: recipe?.course ?? 'plat',
    recipe_type: recipe?.recipe_type ?? 'simple',
    meal_type: recipe?.meal_type ?? 'both',
    prep_minutes: '',
    cook_minutes: '',
    rest_minutes: '',
    portions: '',
    is_vegetarian: false,
    is_gluten_free: false,
    is_lactose_free: false,
    difficulty: '',
    budget: '',
    photo_url: '',
    notes: '',
    variants_tips: '',
    source_url: '',
    ingredients: [],
    steps: [],
  }
}

function detailToState(d: OfficialRecipeDetail): FormState {
  return {
    name: d.name ?? '',
    seasons: d.seasons ?? [],
    course: d.course ?? 'plat',
    recipe_type: d.recipe_type ?? 'simple',
    meal_type: d.meal_type ?? 'both',
    prep_minutes: numToStr(d.prep_minutes),
    cook_minutes: numToStr(d.cook_minutes),
    rest_minutes: numToStr(d.rest_minutes),
    portions: numToStr(d.portions),
    is_vegetarian: !!d.is_vegetarian,
    is_gluten_free: !!d.is_gluten_free,
    is_lactose_free: !!d.is_lactose_free,
    difficulty: d.difficulty ?? '',
    budget: d.budget ?? '',
    photo_url: d.photo_url ?? '',
    notes: d.notes ?? '',
    variants_tips: d.variants_tips ?? '',
    source_url: d.source_url ?? '',
    ingredients: d.ingredients ?? [],
    steps: d.steps ?? [],
  }
}

export function RecipeFormModal({
  open,
  recipe,
  onClose,
}: {
  open: boolean
  recipe: OfficialRecipeListItem | null // null = création
  onClose: () => void
}) {
  const isEdit = !!recipe
  const { create, update } = useOfficialRecipeActions()

  // Détail complet (édition uniquement). Si l'endpoint manque → erreur → mode sûr.
  const detailQuery = useOfficialRecipe(isEdit ? recipe!.id : null)
  const hasDetail = isEdit && detailQuery.isSuccess
  const detailLoading = isEdit && detailQuery.isLoading
  const safeMode = isEdit && detailQuery.isError // détail indisponible

  const [f, setF] = useState<FormState>(() => blankState(recipe))

  // Quand le détail arrive, on pré-remplit TOUT le formulaire.
  useEffect(() => {
    if (detailQuery.isSuccess && detailQuery.data) {
      setF(detailToState(detailQuery.data))
    }
  }, [detailQuery.isSuccess, detailQuery.data])

  // Mode sûr : on n'envoie régimes/ingrédients/étapes que si explicitement demandé.
  const [replaceIngredients, setReplaceIngredients] = useState(false)
  const [replaceSteps, setReplaceSteps] = useState(false)
  const [editDiet, setEditDiet] = useState(false)

  const busy = create.isPending || update.isPending

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }))

  const toggleSeason = (s: Season) =>
    setF((st) => ({
      ...st,
      seasons: st.seasons.includes(s) ? st.seasons.filter((x) => x !== s) : [...st.seasons, s],
    }))

  const addIngredient = () => set('ingredients', [...f.ingredients, { name: '' }])
  const updateIngredient = (i: number, patch: Partial<RecipeIngredientInput>) =>
    set('ingredients', f.ingredients.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)))
  const removeIngredient = (i: number) =>
    set('ingredients', f.ingredients.filter((_, idx) => idx !== i))

  const addStep = () => set('steps', [...f.steps, { text: '' }])
  const updateStep = (i: number, text: string) =>
    set('steps', f.steps.map((st, idx) => (idx === i ? { ...st, text } : st)))
  const removeStep = (i: number) => set('steps', f.steps.filter((_, idx) => idx !== i))

  const buildScalars = () => ({
    course: f.course,
    recipe_type: f.recipe_type,
    meal_type: f.meal_type,
    prep_minutes: numOrUndef(f.prep_minutes),
    cook_minutes: numOrUndef(f.cook_minutes),
    rest_minutes: numOrUndef(f.rest_minutes),
    portions: numOrUndef(f.portions),
    difficulty: f.difficulty || undefined,
    budget: f.budget || undefined,
    photo_url: f.photo_url || undefined,
    notes: f.notes || undefined,
    variants_tips: f.variants_tips || undefined,
    source_url: f.source_url || undefined,
  })
  const dietFields = () => ({
    is_vegetarian: f.is_vegetarian,
    is_gluten_free: f.is_gluten_free,
    is_lactose_free: f.is_lactose_free,
  })
  const cleanIngredients = () =>
    f.ingredients.filter((i) => i.name.trim()).map((i, idx) => ({ ...i, position: idx }))
  const cleanSteps = () => f.steps.filter((s) => s.text.trim()).map((s, idx) => ({ ...s, position: idx }))

  // Sections « pleines » (toutes visibles, envoyées telles quelles) : en création,
  // ou en édition quand on a le détail complet. Sinon mode sûr (toggles).
  const fullForm = !isEdit || hasDetail

  const submit = () => {
    if (!f.name.trim()) {
      toast.error('Le nom est requis')
      return
    }

    // Création OU édition avec détail complet → payload complet.
    if (!isEdit || hasDetail) {
      if (f.seasons.length === 0) {
        toast.error('Au moins une saison est requise')
        return
      }
      const payload: OfficialRecipeInput = {
        name: f.name.trim(),
        seasons: f.seasons,
        ...buildScalars(),
        ...dietFields(),
        ingredients: cleanIngredients(),
        steps: cleanSteps(),
      }
      if (!isEdit) {
        create.mutate(payload, {
          onSuccess: () => {
            toast.success('Recette créée')
            onClose()
          },
          onError: (e) => toast.error((e as Error).message),
        })
      } else {
        update.mutate(
          { id: recipe!.id, input: payload },
          {
            onSuccess: () => {
              toast.success('Recette mise à jour')
              onClose()
            },
            onError: (e) => toast.error((e as Error).message),
          },
        )
      }
      return
    }

    // Édition en mode sûr (détail indisponible) → PATCH partiel prudent.
    const payload: Partial<OfficialRecipeInput> = {
      name: f.name.trim(),
      ...buildScalars(),
    }
    if (f.seasons.length > 0) payload.seasons = f.seasons
    if (editDiet) Object.assign(payload, dietFields())
    if (replaceIngredients) payload.ingredients = cleanIngredients()
    if (replaceSteps) payload.steps = cleanSteps()

    update.mutate(
      { id: recipe!.id, input: payload },
      {
        onSuccess: () => {
          toast.success('Recette mise à jour')
          onClose()
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-white/10">
          <DialogTitle>{isEdit ? 'Éditer la recette' : 'Nouvelle recette officielle'}</DialogTitle>
        </DialogHeader>

        <form
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
          className="flex-1 min-h-0 overflow-y-auto px-6 py-4"
        >
        {detailLoading ? (
          <div className="space-y-3 py-6">
            <div className="h-10 rounded bg-white/5 animate-pulse" />
            <div className="h-10 rounded bg-white/5 animate-pulse" />
            <div className="h-24 rounded bg-white/5 animate-pulse" />
            <p className="text-center text-xs text-gray-500">Chargement du détail de la recette…</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {safeMode && (
              <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200/90">
                MenuFacile ne fournit pas encore le détail complet de cette recette
                (endpoint <code>GET /official-recipes/:id</code> absent). Seuls nom, type, format et
                repas sont pré-remplis. <strong>Les champs laissés vides ne sont pas modifiés.</strong>
                Pour changer régimes, ingrédients ou étapes, active le bouton « Modifier ».
              </div>
            )}

            {/* Nom */}
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Nom *</Label>
              <Input
                id="r-name"
                name="mf-recipe-name"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                value={f.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            {/* Saisons */}
            <div className="space-y-1.5">
              <Label>Saisons {fullForm ? '*' : '(laisser vide = inchangé)'}</Label>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleSeason(s.key)}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      f.seasons.includes(s.key)
                        ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-200'
                        : 'border-white/10 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Classification */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Type de plat</Label>
                <Select value={f.course} onValueChange={(v) => set('course', v as Course)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entree">Entrée</SelectItem>
                    <SelectItem value="plat">Plat</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="apero">Apéro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Format</Label>
                <Select value={f.recipe_type} onValueChange={(v) => set('recipe_type', v as RecipeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="complete">Complète</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Repas</Label>
                <Select value={f.meal_type} onValueChange={(v) => set('meal_type', v as MealType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunch">Déjeuner</SelectItem>
                    <SelectItem value="dinner">Dîner</SelectItem>
                    <SelectItem value="both">Les deux</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Temps + portions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-prep">Prépa (min)</Label>
                <Input id="r-prep" type="number" value={f.prep_minutes} onChange={(e) => set('prep_minutes', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-cook">Cuisson (min)</Label>
                <Input id="r-cook" type="number" value={f.cook_minutes} onChange={(e) => set('cook_minutes', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-rest">Repos (min)</Label>
                <Input id="r-rest" type="number" value={f.rest_minutes} onChange={(e) => set('rest_minutes', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-portions">Portions</Label>
                <Input id="r-portions" type="number" value={f.portions} onChange={(e) => set('portions', e.target.value)} />
              </div>
            </div>

            {/* Difficulté + budget */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Difficulté</Label>
                <Select value={f.difficulty || 'none'} onValueChange={(v) => set('difficulty', v === 'none' ? '' : (v as Difficulty))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="easy">Facile</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="hard">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Budget</Label>
                <Select value={f.budget || 'none'} onValueChange={(v) => set('budget', v === 'none' ? '' : (v as Budget))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="low">Petit</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="high">Élevé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Régimes */}
            <div className="space-y-2">
              {safeMode && (
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <Switch checked={editDiet} onCheckedChange={setEditDiet} />
                  Modifier les régimes alimentaires
                </label>
              )}
              {(fullForm || editDiet) && (
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2">
                    <Switch checked={f.is_vegetarian} onCheckedChange={(v) => set('is_vegetarian', v)} />
                    <span className="text-gray-300">Végétarien</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch checked={f.is_gluten_free} onCheckedChange={(v) => set('is_gluten_free', v)} />
                    <span className="text-gray-300">Sans gluten</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch checked={f.is_lactose_free} onCheckedChange={(v) => set('is_lactose_free', v)} />
                    <span className="text-gray-300">Sans lactose</span>
                  </label>
                </div>
              )}
            </div>

            {/* Médias / liens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-photo">Photo (URL)</Label>
                <Input id="r-photo" value={f.photo_url} onChange={(e) => set('photo_url', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-source">Source (URL)</Label>
                <Input id="r-source" value={f.source_url} onChange={(e) => set('source_url', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-notes">Notes</Label>
              <Textarea id="r-notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-variants">Astuces / variantes</Label>
              <Textarea id="r-variants" rows={2} value={f.variants_tips} onChange={(e) => set('variants_tips', e.target.value)} />
            </div>

            {/* Ingrédients */}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <Label>Ingrédients</Label>
                {safeMode && (
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <Switch checked={replaceIngredients} onCheckedChange={setReplaceIngredients} />
                    Remplacer la liste
                  </label>
                )}
              </div>
              {(fullForm || replaceIngredients) && (
                <div className="space-y-2">
                  {f.ingredients.map((ing, i) => (
                    <div key={i} className="flex flex-wrap gap-2">
                      <Input
                        className="flex-1 min-w-[8rem]"
                        placeholder="Nom"
                        value={ing.name}
                        onChange={(e) => updateIngredient(i, { name: e.target.value })}
                      />
                      <Input
                        className="w-20"
                        type="number"
                        placeholder="Qté"
                        value={ing.quantity ?? ''}
                        onChange={(e) => updateIngredient(i, { quantity: numOrUndef(e.target.value) })}
                      />
                      <Input
                        className="w-24"
                        placeholder="Unité"
                        value={ing.unit ?? ''}
                        onChange={(e) => updateIngredient(i, { unit: e.target.value || undefined })}
                      />
                      <Input
                        className="w-28"
                        placeholder="Rayon"
                        value={ing.aisle ?? ''}
                        onChange={(e) => updateIngredient(i, { aisle: e.target.value || undefined })}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeIngredient(i)}>✕</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addIngredient}>+ Ingrédient</Button>
                </div>
              )}
            </div>

            {/* Étapes */}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <Label>Étapes</Label>
                {safeMode && (
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <Switch checked={replaceSteps} onCheckedChange={setReplaceSteps} />
                    Remplacer la liste
                  </label>
                )}
              </div>
              {(fullForm || replaceSteps) && (
                <div className="space-y-2">
                  {f.steps.map((st, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="pt-2 text-xs text-gray-500 w-5">{i + 1}.</span>
                      <Textarea
                        className="flex-1"
                        rows={2}
                        placeholder="Décris l'étape…"
                        value={st.text}
                        onChange={(e) => updateStep(i, e.target.value)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeStep(i)}>✕</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addStep}>+ Étape</Button>
                </div>
              )}
            </div>
          </div>
        )}

        </form>

        <DialogFooter className="gap-2 px-6 py-4 shrink-0 border-t border-white/10">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button size="sm" onClick={submit} disabled={busy || detailLoading}>
            {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
