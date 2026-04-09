'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { Search, Eye, EyeOff, Share2, Download, Upload, FileIcon, Folder, ChevronDown } from 'lucide-react'
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

// ---- Download helper ----

function triggerDownload(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ---- File type badge ----

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf:  'bg-red-500/20 text-red-600 dark:text-red-400',
  docx: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  doc:  'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  xlsx: 'bg-green-500/20 text-green-600 dark:text-green-400',
  xls:  'bg-green-500/20 text-green-600 dark:text-green-400',
  csv:  'bg-green-500/20 text-green-600 dark:text-green-400',
  png:  'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  jpg:  'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  jpeg: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  svg:  'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  md:   'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
}

function FileTypeBadge({ fileType }: { fileType: string }) {
  const ext = fileType.toLowerCase().replace(/^\./, '')
  const color = FILE_TYPE_COLORS[ext] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0', color)}>
      {ext.slice(0, 4)}
    </span>
  )
}

// ---- Visibility badge ----

function VisibilityBadge({ visibility }: { visibility: string }) {
  const shared = visibility === 'shared'
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
      shared
        ? 'bg-green-500/15 text-green-600 dark:text-green-400'
        : 'bg-red-500/15 text-red-600 dark:text-red-400'
    )}>
      {shared ? 'Partagé' : 'Privé'}
    </span>
  )
}

// ---- Type badge ----

function TypeBadge({ tag }: { tag: string }) {
  const colors = [
    'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  ]
  const idx = tag.charCodeAt(0) % colors.length
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', colors[idx])}>
      {tag}
    </span>
  )
}

// ---- Preview modal ----

const VIEWABLE_IMAGE = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp']
const VIEWABLE_PDF   = ['pdf']

interface PreviewModalProps {
  doc: DocumentWithClient | null
  onClose: () => void
}

function PreviewModal({ doc, onClose }: PreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Load URL when doc changes
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
      <DialogContent className="sm:max-w-[700px] flex flex-col gap-0 p-0 max-h-[85vh]">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-5 py-4 border-b shrink-0">
          <DialogTitle className="text-sm font-medium truncate pr-4">
            {doc?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Preview area */}
        <div className="flex-1 overflow-auto min-h-[300px] bg-muted/20">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !url || !canPreview ? (
            /* Fallback — pas d'aperçu possible */
            <div className="flex flex-col items-center justify-center gap-4 h-[300px] text-muted-foreground">
              <FileIcon className="h-12 w-12 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">{doc?.name}</p>
                <p className="text-xs opacity-60 mt-1">Aperçu non disponible pour ce type de fichier</p>
              </div>
            </div>
          ) : VIEWABLE_PDF.includes(ext) ? (
            <iframe
              src={url}
              className="w-full h-[500px]"
              title={doc?.name}
            />
          ) : (
            /* Image */
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

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t shrink-0 gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

// ---- Import modal ----

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
      <DialogContent className="sm:max-w-[520px] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base">Importer un document</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Client */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Sélectionner un client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Fichier */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Fichier *
            </label>
            <DocumentUpload
              onUpload={(file) => setSelectedFile(file)}
              isUploading={isUploading}
            />
          </div>

          {/* Visibilité */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Visibilité
            </label>
            <div className="flex gap-2">
              {(['private', 'shared'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                    visibility === v
                      ? v === 'shared'
                        ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'border-primary bg-primary/10 text-primary'
                      : 'border-input text-muted-foreground hover:border-muted-foreground'
                  )}
                >
                  {v === 'private' ? '🔒 Privé (MiKL uniquement)' : '👁 Partagé (visible client)'}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Tags <span className="font-normal normal-case">(optionnel, séparés par virgule)</span>
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Business, Branding, Tarifs..."
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t shrink-0">
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

// ---- Visibility toggle (hub view) ----

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
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-7 w-7', isShared ? 'text-green-500 hover:text-green-400' : 'text-muted-foreground hover:text-foreground')}
      title={isShared ? 'Retirer le partage' : 'Partager avec le client'}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {isShared ? <EyeOff className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
    </Button>
  )
}

// ---- Helpers ----

function getUniqueClients(docs: DocumentWithClient[]) {
  return [...new Set(docs.map((d) => d.clientName))].sort()
}

function getUniqueTypes(docs: DocumentWithClient[]) {
  return [...new Set(docs.flatMap((d) => d.tags))].sort()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ---- Main component ----

interface DocumentsHubPageProps {
  initialDocuments: DocumentWithClient[]
  initialClients: ClientOption[]
  operatorId: string
}

export function DocumentsHubPage({ initialDocuments, initialClients, operatorId }: DocumentsHubPageProps) {
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('')
  const [previewDoc, setPreviewDoc] = useState<DocumentWithClient | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set())

  const { data: documents = initialDocuments, refetch } = useQuery({
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

  const toggleClient = (clientId: string) => {
    setCollapsedClients((prev) => {
      const next = new Set(prev)
      next.has(clientId) ? next.delete(clientId) : next.add(clientId)
      return next
    })
  }

  function handleDownload(doc: DocumentWithClient) {
    triggerDownload(`/api/documents/download/${doc.id}`)
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} document{filtered.length > 1 ? 's' : ''} · {documents.length} au total
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importer un document
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un document..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Tous types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Toute visibilité</option>
            <option value="shared">Partagé</option>
            <option value="private">Privé</option>
          </select>

          {(search || clientFilter || typeFilter || visibilityFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setClientFilter(''); setTypeFilter(''); setVisibilityFilter('') }}
              className="text-muted-foreground text-xs h-9"
            >
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Vue groupée par client */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <p className="text-sm">Aucun document trouvé</p>
            {(search || clientFilter || typeFilter || visibilityFilter) && (
              <p className="text-xs opacity-60">Essaie de modifier les filtres</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groupedByClient.map(({ clientId, clientName, docs }) => {
              const isCollapsed = collapsedClients.has(clientId)
              return (
                <div key={clientId} className="rounded-lg border overflow-hidden">
                  {/* En-tête dossier client */}
                  <button
                    type="button"
                    onClick={() => toggleClient(clientId)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-150', isCollapsed && '-rotate-90')} />
                    <Folder className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium">{clientName}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {docs.length} document{docs.length > 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Liste des documents */}
                  {!isCollapsed && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nom</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Visibilité</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {docs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <FileTypeBadge fileType={doc.fileType} />
                                <span className="font-medium truncate max-w-[260px]" title={doc.name}>
                                  {doc.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {doc.tags.length > 0
                                ? <TypeBadge tag={doc.tags[0]} />
                                : <span className="text-muted-foreground/50 text-xs">—</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              <VisibilityBadge visibility={doc.visibility} />
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-muted-foreground text-xs">{formatDate(doc.createdAt)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <VisibilityToggleButton doc={doc} />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Prévisualiser"
                                  onClick={() => setPreviewDoc(doc)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Télécharger"
                                  onClick={() => handleDownload(doc)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                                  asChild
                                >
                                  <a href={`/modules/documents/${doc.clientId}`}>
                                    Ouvrir
                                  </a>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modale prévisualisation */}
      <PreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

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
