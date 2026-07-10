'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import {
  CockpitHeader,
  PillTabs,
  HeroStatGrid,
  HeroStat,
  SectionTitle,
  HeroStatSkeleton,
  RowSkeleton,
} from '@monprojetpro/ui'
import type { PillTab } from '@monprojetpro/ui'
import {
  Search,
  Eye,
  EyeOff,
  Share2,
  Download,
  Upload,
  FileIcon,
  FolderOpen,
  ChevronDown,
  Files,
  Users,
  Globe,
} from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { getAllDocuments } from '../actions/get-all-documents'
import { getDocumentUrl } from '../actions/get-document-url'
import { uploadDocument } from '../actions/upload-document'
import { shareDocument } from '../actions/share-document'
import { unshareDocument } from '../actions/unshare-document'
import { DocumentUpload } from './document-upload'
import type { DocumentWithClient } from '../actions/get-all-documents'

interface ClientOption {
  id: string
  name: string
}

// ── Téléchargement ──────────────────────────────────────────────────────────

function triggerDownload(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Badge type de fichier ───────────────────────────────────────────────────

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf:  'bg-red-500/20 text-red-400',
  docx: 'bg-blue-500/20 text-blue-400',
  doc:  'bg-blue-500/20 text-blue-400',
  xlsx: 'bg-emerald-500/20 text-emerald-400',
  xls:  'bg-emerald-500/20 text-emerald-400',
  csv:  'bg-emerald-500/20 text-emerald-400',
  png:  'bg-violet-500/20 text-violet-400',
  jpg:  'bg-violet-500/20 text-violet-400',
  jpeg: 'bg-violet-500/20 text-violet-400',
  svg:  'bg-violet-500/20 text-violet-400',
  md:   'bg-amber-500/20 text-amber-400',
}

function FileTypeBadge({ fileType }: { fileType: string }) {
  const ext = fileType.toLowerCase().replace(/^\./, '')
  const color = FILE_TYPE_COLORS[ext] ?? 'bg-white/10 text-gray-400'
  return (
    <span className={cn(
      'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0',
      color,
    )}>
      {ext.slice(0, 4)}
    </span>
  )
}

// ── Badge visibilité ────────────────────────────────────────────────────────

function VisibilityBadge({ visibility }: { visibility: string }) {
  const shared = visibility === 'shared'
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
      shared
        ? 'bg-emerald-400/10 text-emerald-300'
        : 'bg-white/[0.05] text-gray-500',
    )}>
      {shared ? <Globe className="h-2.5 w-2.5" /> : null}
      {shared ? 'Partagé' : 'Privé'}
    </span>
  )
}

// ── Badge type / tag ────────────────────────────────────────────────────────

const TAG_TONE_CYCLE = [
  'bg-amber-500/15 text-amber-300',
  'bg-blue-500/15 text-blue-300',
  'bg-violet-500/15 text-violet-300',
  'bg-cyan-500/15 text-cyan-300',
  'bg-emerald-500/15 text-emerald-300',
]

function TypeBadge({ tag }: { tag: string }) {
  const idx = tag.charCodeAt(0) % TAG_TONE_CYCLE.length
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
      TAG_TONE_CYCLE[idx],
    )}>
      {tag}
    </span>
  )
}

// ── Modale de prévisualisation ──────────────────────────────────────────────

const VIEWABLE_IMAGE = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp']
const VIEWABLE_PDF   = ['pdf']

interface PreviewModalProps {
  doc: DocumentWithClient | null
  onClose: () => void
}

function PreviewModal({ doc, onClose }: PreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useMemo(() => {
    if (!doc) { setUrl(null); return }
    setLoading(true)
    getDocumentUrl({ documentId: doc.id }).then((res) => {
      setUrl(res.data?.url ?? null)
      setLoading(false)
    })
  }, [doc?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const ext = doc?.fileType.toLowerCase() ?? ''
  const canPreview = VIEWABLE_IMAGE.includes(ext) || VIEWABLE_PDF.includes(ext)

  function handleDownload() {
    if (!doc) return
    triggerDownload(`/api/documents/download/${doc.id}`)
  }

  return (
    <Dialog open={!!doc} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[700px] flex flex-col gap-0 p-0 max-h-[85vh] bg-[#0a0a0a] border border-white/10">
        {/* En-tête */}
        <DialogHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <DialogTitle className="text-sm font-medium text-white truncate pr-4">
            {doc?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Zone de prévisualisation */}
        <div className="flex-1 overflow-auto min-h-[300px] bg-white/[0.02]">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              {/* Skeleton animate-pulse au lieu du spinner */}
              <div className="h-32 w-full max-w-xs animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : !url || !canPreview ? (
            /* Fallback : aperçu non disponible */
            <div className="flex flex-col items-center justify-center gap-4 h-[300px]">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 flex flex-col items-center gap-3">
                <FileIcon className="h-10 w-10 text-gray-600" />
                <p className="text-sm text-gray-400 font-medium">{doc?.name}</p>
                <p className="text-xs text-gray-600">Aperçu non disponible pour ce type de fichier</p>
              </div>
            </div>
          ) : VIEWABLE_PDF.includes(ext) ? (
            <iframe src={url} className="w-full h-[500px]" title={doc?.name} />
          ) : (
            <div className="flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={doc?.name ?? ''}
                className="max-w-full max-h-[500px] object-contain rounded"
              />
            </div>
          )}
        </div>

        {/* Pied */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 shrink-0 gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {doc && <FileTypeBadge fileType={doc.fileType} />}
            <span>{doc?.clientName}</span>
            {doc?.tags[0] && <><span>·</span><TypeBadge tag={doc.tags[0]} /></>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleDownload} disabled={!url} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Modale d'import ─────────────────────────────────────────────────────────

interface ImportModalProps {
  open: boolean
  onClose: () => void
  clients: ClientOption[]
  operatorId: string
  onUploaded: () => void
}

function ImportModal({ open, onClose, clients, operatorId, onUploaded }: ImportModalProps) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private')
  const [tags, setTags] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  function handleClose() {
    setSelectedClientId('')
    setSelectedFile(null)
    setVisibility('private')
    setTags('')
    onClose()
  }

  async function handleSubmit() {
    if (!selectedFile || !selectedClientId) return
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('clientId', selectedClientId)
    formData.append('operatorId', operatorId)
    formData.append('uploadedBy', 'operator')
    formData.append('visibility', visibility)
    formData.append('tags', JSON.stringify(
      tags.split(',').map((t) => t.trim()).filter(Boolean)
    ))

    const result = await uploadDocument(formData)
    setIsUploading(false)

    if (result.error) {
      showError(result.error.message)
      return
    }
    showSuccess('Document importé avec succès')
    onUploaded()
    handleClose()
  }

  const canSubmit = !!selectedFile && !!selectedClientId && !isUploading

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-[520px] flex flex-col gap-0 p-0 bg-[#0a0a0a] border border-white/10">
        <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
          <DialogTitle className="text-base text-white">Importer un document</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Client */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            >
              <option value="">Sélectionner un client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Fichier */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Fichier *
            </label>
            <DocumentUpload
              onUpload={(file) => setSelectedFile(file)}
              isUploading={isUploading}
            />
          </div>

          {/* Visibilité */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Visibilité
            </label>
            <div className="flex gap-2">
              {(['private', 'shared'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    'flex-1 rounded-xl border px-3 py-2 text-sm transition-colors',
                    visibility === v
                      ? v === 'shared'
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                        : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                      : 'border-white/10 bg-white/[0.02] text-gray-500 hover:border-white/20 hover:text-gray-300'
                  )}
                >
                  {v === 'private' ? '🔒 Privé (MiKL uniquement)' : '👁 Partagé (visible client)'}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Tags <span className="font-normal normal-case">(optionnel, séparés par virgule)</span>
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Business, Branding, Tarifs..."
              className="h-9 text-sm bg-white/[0.03] border-white/10 text-gray-200 placeholder:text-gray-600"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-white/10 shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Import en cours...' : 'Importer'}
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Bouton toggle partage ────────────────────────────────────────────────────

function VisibilityToggleButton({ doc }: { doc: DocumentWithClient }) {
  const queryClient = useQueryClient()
  const isShared = doc.visibility === 'shared'

  const mutation = useMutation({
    mutationFn: async () => {
      const result = isShared
        ? await unshareDocument(doc.id)
        : await shareDocument(doc.id)
      if (result.error) throw new Error(result.error.message)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', doc.clientId] })
      showSuccess(isShared ? 'Partage retiré' : 'Document partagé')
    },
    onError: () => showError('Erreur lors de la modification'),
  })

  return (
    <button
      type="button"
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded-lg transition-colors',
        isShared
          ? 'text-emerald-400 hover:bg-emerald-400/10'
          : 'text-gray-600 hover:text-gray-300 hover:bg-white/[0.05]',
        mutation.isPending && 'opacity-50 pointer-events-none',
      )}
      title={isShared ? 'Retirer le partage' : 'Partager avec le client'}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      aria-label={isShared ? 'Retirer le partage' : 'Partager avec le client'}
    >
      {isShared ? <EyeOff className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
    </button>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUniqueClients(docs: DocumentWithClient[]) {
  return [...new Set(docs.map((d) => d.clientName))].sort()
}

function getUniqueTypes(docs: DocumentWithClient[]) {
  return [...new Set(docs.flatMap((d) => d.tags))].sort()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Pills de filtre visibilité ───────────────────────────────────────────────

type VisibilityFilter = '' | 'shared' | 'private'

const VISIBILITY_PILLS: PillTab<VisibilityFilter>[] = [
  { key: '', label: 'Tous' },
  { key: 'shared', label: 'Partagés' },
  { key: 'private', label: 'Privés' },
]

// ── Composant principal ──────────────────────────────────────────────────────

interface DocumentsHubPageProps {
  initialDocuments: DocumentWithClient[]
  initialClients: ClientOption[]
  operatorId: string
}

export function DocumentsHubPage({ initialDocuments, initialClients, operatorId }: DocumentsHubPageProps) {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('')
  const [previewDoc, setPreviewDoc] = useState<DocumentWithClient | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set())

  const { data: documents = initialDocuments, refetch, isPending } = useQuery({
    queryKey: ['all-documents'],
    queryFn: async () => {
      const r = await getAllDocuments()
      return r.data ?? []
    },
    initialData: initialDocuments,
    staleTime: 30_000,
  })

  const clients = useMemo(() => getUniqueClients(documents), [documents])
  const types   = useMemo(() => getUniqueTypes(documents), [documents])

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false
      if (clientFilter && doc.clientName !== clientFilter) return false
      if (typeFilter && !doc.tags.includes(typeFilter)) return false
      if (visibilityFilter && doc.visibility !== visibilityFilter) return false
      return true
    })
  }, [documents, search, clientFilter, typeFilter, visibilityFilter])

  const groupedByClient = useMemo(() => {
    const map = new Map<string, { clientId: string; clientName: string; docs: DocumentWithClient[] }>()
    for (const doc of filtered) {
      if (!map.has(doc.clientId)) {
        map.set(doc.clientId, { clientId: doc.clientId, clientName: doc.clientName, docs: [] })
      }
      map.get(doc.clientId)!.docs.push(doc)
    }
    return [...map.values()].sort((a, b) => a.clientName.localeCompare(b.clientName))
  }, [filtered])

  // Métriques calculées côté client pour les cartes héros
  const totalDocs     = documents.length
  const sharedDocs    = documents.filter((d) => d.visibility === 'shared').length
  const uniqueClients = new Set(documents.map((d) => d.clientId)).size

  const toggleClient = (clientId: string) => {
    setCollapsedClients((prev) => {
      const next = new Set(prev)
      next.has(clientId) ? next.delete(clientId) : next.add(clientId)
      return next
    })
  }

  const hasActiveFilters = search || clientFilter || typeFilter || visibilityFilter

  return (
    <>
      <div className="flex flex-col gap-6 p-6">

        {/* ── En-tête cockpit ── */}
        <CockpitHeader
          icon={Files}
          title="Documents"
          subtitle="Bibliothèque des documents opérateur et clients"
          tone="cyan"
          actions={
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3.5 py-2 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-400/20"
            >
              <Upload className="h-4 w-4" />
              Importer un document
            </button>
          }
        />

        {/* ── Cartes KPI ── */}
        {isPending ? (
          <HeroStatGrid>
            <HeroStatSkeleton />
            <HeroStatSkeleton />
            <HeroStatSkeleton />
          </HeroStatGrid>
        ) : (
          <HeroStatGrid>
            <HeroStat
              icon={Files}
              label="Documents total"
              value={totalDocs}
              tone="cyan"
            />
            <HeroStat
              icon={Globe}
              label="Partagés clients"
              value={sharedDocs}
              tone="emerald"
            />
            <HeroStat
              icon={Users}
              label="Clients avec docs"
              value={uniqueClients}
              tone="blue"
            />
          </HeroStatGrid>
        )}

        {/* ── Filtres ── */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          {/* Ligne 1 : recherche + sélecteurs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Champ recherche */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un document..."
                className="w-full h-9 rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
              />
            </div>

            {/* Filtre client */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            >
              <option value="">Tous les clients</option>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Filtre type / tag */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            >
              <option value="">Tous types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setClientFilter('')
                  setTypeFilter('')
                  setVisibilityFilter('')
                }}
                className="h-9 px-3 rounded-xl border border-white/10 bg-white/[0.02] text-xs text-gray-500 hover:text-gray-300 hover:border-white/20 transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Ligne 2 : pills visibilité */}
          <PillTabs
            tabs={VISIBILITY_PILLS}
            active={visibilityFilter}
            onChange={setVisibilityFilter}
            tone="cyan"
          />
        </div>

        {/* ── Contenu ── */}
        {isPending ? (
          /* Skeleton de chargement */
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                  <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                </div>
                <div className="flex flex-col gap-2 p-3">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <RowSkeleton key={j} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* État vide */
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Files className="h-6 w-6 text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 font-medium">Aucun document trouvé</p>
              {hasActiveFilters && (
                <p className="text-xs text-gray-600 mt-1">Essaie de modifier les filtres</p>
              )}
            </div>
          </div>
        ) : (
          /* Liste groupée par client */
          <div className="flex flex-col gap-3">
            <SectionTitle action={
              <span className="text-xs text-gray-500 tabular-nums">
                {filtered.length} document{filtered.length > 1 ? 's' : ''}
              </span>
            }>
              Par client
            </SectionTitle>

            {groupedByClient.map(({ clientId, clientName, docs }) => {
              const isCollapsed = collapsedClients.has(clientId)
              const sharedCount = docs.filter((d) => d.visibility === 'shared').length

              return (
                <div
                  key={clientId}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
                >
                  {/* En-tête dossier client */}
                  <button
                    type="button"
                    onClick={() => toggleClient(clientId)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <ChevronDown className={cn(
                      'h-4 w-4 text-gray-600 transition-transform duration-150',
                      isCollapsed && '-rotate-90',
                    )} />
                    <FolderOpen className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span className="font-medium text-sm text-white">{clientName}</span>
                    {sharedCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300">
                        <Globe className="h-2.5 w-2.5" />
                        {sharedCount} partagé{sharedCount > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-xs text-gray-600 ml-auto tabular-nums">
                      {docs.length} doc{docs.length > 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Desktop : table ──────────────────────────────────── */}
                  {!isCollapsed && (
                    <>
                      <div className="hidden md:block">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibilité</th>
                              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docs.map((doc) => (
                              <tr
                                key={doc.id}
                                className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <FileTypeBadge fileType={doc.fileType} />
                                    <span className="font-medium text-gray-200 truncate max-w-[260px]" title={doc.name}>
                                      {doc.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {doc.tags.length > 0
                                    ? <TypeBadge tag={doc.tags[0]} />
                                    : <span className="text-gray-700 text-xs">—</span>
                                  }
                                </td>
                                <td className="px-4 py-3">
                                  <VisibilityBadge visibility={doc.visibility} />
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-gray-600 text-xs tabular-nums">{formatDate(doc.createdAt)}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <VisibilityToggleButton doc={doc} />
                                    <button
                                      type="button"
                                      className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.05] transition-colors"
                                      title="Prévisualiser"
                                      aria-label="Prévisualiser"
                                      onClick={() => setPreviewDoc(doc)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.05] transition-colors"
                                      title="Télécharger"
                                      aria-label="Télécharger"
                                      onClick={() => triggerDownload(`/api/documents/download/${doc.id}`)}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                    <a
                                      href={`/modules/documents/${doc.clientId}`}
                                      className="h-7 px-2 inline-flex items-center text-xs text-gray-600 hover:text-cyan-300 hover:bg-white/[0.05] rounded-lg transition-colors"
                                    >
                                      Ouvrir
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile : cards ───────────────────────────────── */}
                      <div className="flex flex-col gap-2 p-3 md:hidden">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-col gap-2"
                          >
                            <div className="flex items-start gap-2 justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileTypeBadge fileType={doc.fileType} />
                                <span className="text-sm font-medium text-gray-200 truncate">{doc.name}</span>
                              </div>
                              <VisibilityBadge visibility={doc.visibility} />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {doc.tags[0] && <TypeBadge tag={doc.tags[0]} />}
                              <span className="text-xs text-gray-600 tabular-nums">{formatDate(doc.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                              <VisibilityToggleButton doc={doc} />
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.05] transition-colors"
                                aria-label="Prévisualiser"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerDownload(`/api/documents/download/${doc.id}`)}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/[0.05] transition-colors"
                                aria-label="Télécharger"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <a
                                href={`/modules/documents/${doc.clientId}`}
                                className="ml-auto text-xs text-cyan-300/80 hover:text-cyan-200 transition-colors"
                              >
                                Ouvrir →
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modale prévisualisation */}
      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Modale import */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        clients={initialClients}
        operatorId={operatorId}
        onUploaded={() => refetch()}
      />
    </>
  )
}
