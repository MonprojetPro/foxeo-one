'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Megaphone,
  Upload,
  Rocket,
  EyeOff,
  ImageIcon,
  Link2,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { Button, Input, Label, Switch, Textarea, toast } from '@monprojetpro/ui'
import { useHomeBanner, useHomeBannerActions } from '../hooks/use-home-banner'
import { uploadBannerImage } from '../actions/upload-banner-image'
import type { HomeBanner, HomeBannerInput, BannerTextColor } from '../types'

// Limites du contrat guichet (validation douce côté Hub).
const LIMITS = {
  title: 120,
  body: 2000,
  image_url: 1000,
  link_url: 1000,
  link_label: 40,
} as const

const EMBED_BASE = 'https://menufacile.app/embed/home-banner'

/** Applique les valeurs par défaut du contrat (overlay 65, texte clair…). */
function normalize(b: Partial<HomeBanner> | null | undefined): HomeBanner {
  return {
    enabled: b?.enabled ?? false,
    title: b?.title ?? '',
    body: b?.body ?? '',
    image_url: b?.image_url ?? '',
    link_url: b?.link_url ?? '',
    link_label: b?.link_label ?? '',
    overlay_strength: b?.overlay_strength ?? 65,
    text_color: b?.text_color ?? 'light',
    updated_at: b?.updated_at,
  }
}

const DIFF_KEYS: (keyof HomeBannerInput)[] = [
  'enabled',
  'title',
  'body',
  'image_url',
  'link_url',
  'link_label',
  'overlay_strength',
  'text_color',
]

/** Patch = uniquement les champs qui diffèrent de l'état déployé. */
function diff(draft: HomeBanner, deployed: HomeBanner): HomeBannerInput {
  const patch: HomeBannerInput = {}
  for (const k of DIFF_KEYS) {
    if (draft[k] !== deployed[k]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(patch as any)[k] = draft[k]
    }
  }
  return patch
}

function fmtDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('fr-FR')
}

export function HomeBannerTab() {
  const { data, isLoading, error } = useHomeBanner()
  const { deploy } = useHomeBannerActions()

  const [draft, setDraft] = useState<HomeBanner | null>(null)
  const [deployed, setDeployed] = useState<HomeBanner | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Initialisation (et resync après déploiement) sans écraser un brouillon en cours.
  useEffect(() => {
    if (!data) return
    const norm = normalize(data)
    setDeployed(norm)
    setDraft((cur) => cur ?? norm)
  }, [data])

  // ── Aperçu live (iframe) avec debounce 300 ms ─────────────────────────────
  const [previewSrc, setPreviewSrc] = useState('')
  useEffect(() => {
    if (!draft) return
    const t = setTimeout(() => {
      const p = new URLSearchParams({
        title: draft.title,
        body: draft.body,
        image_url: draft.image_url,
        link_url: draft.link_url,
        link_label: draft.link_label,
        overlay_strength: String(draft.overlay_strength),
        text_color: draft.text_color,
      })
      setPreviewSrc(`${EMBED_BASE}?${p.toString()}`)
    }, 300)
    return () => clearTimeout(t)
  }, [draft])

  const patch = useMemo(
    () => (draft && deployed ? diff(draft, deployed) : {}),
    [draft, deployed],
  )
  const dirty = Object.keys(patch).length > 0
  const busy = deploy.isPending || uploading
  const hasImage = !!draft?.image_url.trim()

  const set = <K extends keyof HomeBanner>(k: K, v: HomeBanner[K]) =>
    setDraft((s) => (s ? { ...s, [k]: v } : s))

  const onPickFile = () => fileRef.current?.click()

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await uploadBannerImage(fd)
      if (res.error || !res.data) {
        toast.error(res.error?.message ?? 'Échec de l\'upload')
        return
      }
      set('image_url', res.data)
      toast.success('Image importée')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onDeploy = () => {
    if (!draft || !deployed) return
    if (!dirty) {
      toast.info('Aucune modification à déployer')
      return
    }
    deploy.mutate(patch, {
      onSuccess: () => {
        setDeployed(draft)
        toast.success('Encart déployé — visible immédiatement par tous')
      },
      onError: (e) => toast.error((e as Error).message),
    })
  }

  const onDisable = () => {
    if (!draft) return
    deploy.mutate(
      { enabled: false },
      {
        onSuccess: () => {
          setDraft((s) => (s ? { ...s, enabled: false } : s))
          setDeployed((d) => (d ? { ...d, enabled: false } : d))
          toast.success('Encart désactivé — masqué pour tous')
        },
        onError: (e) => toast.error((e as Error).message),
      },
    )
  }

  // ── États de chargement / erreur ──────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-center">
        <p className="text-sm text-red-400">Impossible de charger l&apos;encart d&apos;accueil</p>
        <p className="mt-1 text-xs text-gray-500">{(error as Error).message}</p>
      </div>
    )
  }
  if (isLoading || !draft) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded bg-white/5" />
          <div className="h-10 animate-pulse rounded bg-white/5" />
          <div className="h-24 animate-pulse rounded bg-white/5" />
          <div className="h-10 animate-pulse rounded bg-white/5" />
        </div>
        <div className="h-56 animate-pulse rounded-2xl bg-white/5" />
      </div>
    )
  }

  const lastDeployed = fmtDate(deployed?.updated_at)

  return (
    <div className="space-y-5">
      {/* En-tête onglet */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Encart libre d&apos;accueil</h2>
            <p className="text-xs text-gray-500">
              Bannière éditoriale en tête de l&apos;accueil de l&apos;appli MenuFacile
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium ${
              draft.enabled
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : 'border-white/10 bg-white/[0.03] text-gray-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${draft.enabled ? 'bg-emerald-400' : 'bg-gray-500'}`} />
            {draft.enabled ? 'Actif (brouillon)' : 'Masqué (brouillon)'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Colonne formulaire ────────────────────────────────────────── */}
        <div className="space-y-4 text-sm">
          {/* Toggle activé */}
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <span className="text-gray-300">
              Afficher l&apos;encart sur l&apos;appli
              <span className="block text-xs text-gray-500">
                Prend effet à la publication.
              </span>
            </span>
            <Switch checked={draft.enabled} onCheckedChange={(v) => set('enabled', v)} />
          </label>

          {/* Titre */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="hb-title">Titre</Label>
              <span className="text-[0.7rem] tabular-nums text-gray-500">
                {draft.title.length}/{LIMITS.title}
              </span>
            </div>
            <Input
              id="hb-title"
              maxLength={LIMITS.title}
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex. Nouveauté de la semaine"
            />
          </div>

          {/* Texte */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="hb-body">Texte</Label>
              <span className="text-[0.7rem] tabular-nums text-gray-500">
                {draft.body.length}/{LIMITS.body}
              </span>
            </div>
            <Textarea
              id="hb-body"
              rows={4}
              maxLength={LIMITS.body}
              value={draft.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Le message affiché sous le titre…"
            />
          </div>

          {/* Image : upload OU URL */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-300" />
              <Label className="text-gray-300">Image de fond (optionnelle)</Label>
            </div>
            <p className="text-xs text-gray-500">
              Importe un fichier <em>ou</em> colle une URL. Sans image, l&apos;appli affiche un bloc
              dégradé vert→tangerine (le voile et le choix clair/sombre sont alors ignorés).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={onPickFile} disabled={uploading}>
                {uploading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                {uploading ? 'Import…' : 'Importer'}
              </Button>
              {hasImage && (
                <Button variant="ghost" size="sm" onClick={() => set('image_url', '')} disabled={uploading}>
                  Retirer l&apos;image
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
            <Input
              aria-label="URL de l'image"
              maxLength={LIMITS.image_url}
              value={draft.image_url}
              onChange={(e) => set('image_url', e.target.value)}
              placeholder="https://… (URL de l'image)"
            />
          </div>

          {/* Réglages bannière image (voile + couleur texte) */}
          <div
            className={`space-y-4 rounded-xl border p-4 transition-opacity ${
              hasImage ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 bg-white/[0.01] opacity-50'
            }`}
          >
            <p className="text-xs text-gray-500">
              {hasImage
                ? 'Réglages de la bannière image :'
                : 'Réglages disponibles uniquement avec une image de fond.'}
            </p>

            {/* Curseur voile */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="hb-overlay">Intensité du voile</Label>
                <span className="text-[0.7rem] tabular-nums text-gray-400">{draft.overlay_strength}%</span>
              </div>
              <input
                id="hb-overlay"
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={!hasImage}
                value={draft.overlay_strength}
                onChange={(e) => set('overlay_strength', Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400 disabled:cursor-not-allowed"
              />
              <p className="text-[0.7rem] text-gray-500">
                Assombrit l&apos;image pour rendre le texte lisible (0 = aucun voile).
              </p>
            </div>

            {/* Couleur du texte */}
            <div className="space-y-1.5">
              <Label>Couleur du texte</Label>
              <div className="flex gap-2">
                {(
                  [
                    { key: 'light', label: 'Texte clair' },
                    { key: 'dark', label: 'Texte sombre' },
                  ] as { key: BannerTextColor; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={!hasImage}
                    onClick={() => set('text_color', opt.key)}
                    className={`flex-1 rounded-md border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed ${
                      draft.text_color === opt.key
                        ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-200'
                        : 'border-white/10 text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lien + libellé du bouton */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-cyan-300" />
              <Label className="text-gray-300">Bouton (optionnel)</Label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hb-link" className="text-xs text-gray-400">
                  Lien
                </Label>
                <Input
                  id="hb-link"
                  maxLength={LIMITS.link_url}
                  value={draft.link_url}
                  onChange={(e) => set('link_url', e.target.value)}
                  placeholder="/planning ou https://…"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hb-link-label" className="text-xs text-gray-400">
                    Libellé
                  </Label>
                  <span className="text-[0.7rem] tabular-nums text-gray-500">
                    {draft.link_label.length}/{LIMITS.link_label}
                  </span>
                </div>
                <Input
                  id="hb-link-label"
                  maxLength={LIMITS.link_label}
                  value={draft.link_label}
                  onChange={(e) => set('link_label', e.target.value)}
                  placeholder="Ex. Voir le planning"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Colonne aperçu live ───────────────────────────────────────── */}
        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Aperçu en direct</span>
            <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-gray-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
              rendu exact de l&apos;appli
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            {previewSrc ? (
              <iframe
                key="hb-preview"
                src={previewSrc}
                title="Aperçu de l'encart d'accueil MenuFacile"
                className="h-64 w-full border-0"
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
              />
            ) : (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            )}
          </div>
          <p className="text-[0.7rem] text-gray-500">
            Cet aperçu utilise la page d&apos;embed de MenuFacile : ce que tu vois ici est
            exactement ce que verront les utilisateurs.
          </p>
        </div>
      </div>

      {/* ── Barre de déploiement ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            La publication est <strong>instantanée pour tous les utilisateurs</strong> de
            l&apos;appli MenuFacile. Tes réglages restent en brouillon local tant que tu ne cliques
            pas sur « Déployer ».
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {dirty ? (
              <span className="text-amber-300/90">Modifications non déployées</span>
            ) : (
              <span>À jour avec l&apos;appli</span>
            )}
            {lastDeployed && <span className="ml-2">· Dernière mise en ligne : {lastDeployed}</span>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisable}
              disabled={busy || (!deployed?.enabled && !draft.enabled)}
            >
              <EyeOff className="mr-1.5 h-4 w-4" />
              Désactiver
            </Button>
            <Button size="sm" onClick={onDeploy} disabled={busy || !dirty}>
              {deploy.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-1.5 h-4 w-4" />
              )}
              {deploy.isPending ? 'Déploiement…' : 'Déployer sur l\'appli'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
