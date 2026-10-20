'use client'

import { useEffect, useState } from 'react'
import { FolderOpen, FolderPlus, Link2, Trash2, FileDown, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button, Input, Badge, Skeleton, showSuccess, showError } from '@monprojetpro/ui'
import { useClientProjects, useCreateClientProject, useDeleteClientProject } from '../hooks/use-client-projects'
import { useClientDocuments } from '../hooks/use-client-documents'
import {
  isLocalFolderSupported,
  pickAndStoreFolder,
  getStoredFolderHandle,
  hasFolderPermission,
  requestFolderPermission,
  writeFileToFolder,
} from '../utils/local-folder'
import type { ClientProject } from '../types/crm.types'

// ============================================================
// ClientProjectFolderTab — T-063
//
// Remplace l'onglet "Cursor" (chemin Mac en dur, jamais fonctionnel sous
// Windows — voir cursor-integration.ts, retiré). Un client peut porter
// plusieurs projets ; chacun se relie à un dossier local via la File System
// Access API du navigateur (Chrome/Edge uniquement). Le Hub n'a et n'aura
// jamais d'accès direct au disque de MiKL — c'est la seule porte possible.
// ============================================================

type ProjectCardProps = {
  project: ClientProject
  onDelete: (project: ClientProject) => void
  documents: { id: string; name: string; url?: string }[]
}

function ProjectFolderCard({ project, onDelete, documents }: ProjectCardProps) {
  const [linked, setLinked] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [checking, setChecking] = useState(true)
  const [copyingId, setCopyingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      setChecking(true)
      const handle = await getStoredFolderHandle(project.id)
      if (cancelled) return
      if (!handle) {
        setLinked(false)
        setPermissionGranted(false)
        setChecking(false)
        return
      }
      setLinked(true)
      setPermissionGranted(await hasFolderPermission(handle))
      setChecking(false)
    }
    check()
    return () => {
      cancelled = true
    }
  }, [project.id])

  async function handleLinkFolder() {
    try {
      const handle = await pickAndStoreFolder(project.id)
      if (!handle) {
        showError('Ton navigateur ne supporte pas cette fonction — utilise Chrome ou Edge.')
        return
      }
      setLinked(true)
      setPermissionGranted(await hasFolderPermission(handle))
      showSuccess(`Dossier lié à « ${project.name} »`)
    } catch {
      // L'utilisateur a annulé le sélecteur — rien à signaler.
    }
  }

  async function handleRequestPermission() {
    const handle = await getStoredFolderHandle(project.id)
    if (!handle) return
    const granted = await requestFolderPermission(handle)
    setPermissionGranted(granted)
    if (!granted) showError('Permission refusée — relie le dossier à nouveau.')
  }

  async function handleCopyDocument(doc: { id: string; name: string; url?: string }) {
    if (!doc.url) {
      showError('Ce document n\'a pas de fichier associé')
      return
    }
    const handle = await getStoredFolderHandle(project.id)
    if (!handle) {
      showError('Lie d\'abord un dossier à ce projet')
      return
    }
    if (!(await hasFolderPermission(handle))) {
      const granted = await requestFolderPermission(handle)
      if (!granted) {
        showError('Permission refusée')
        return
      }
      setPermissionGranted(true)
    }
    setCopyingId(doc.id)
    try {
      const response = await fetch(doc.url)
      if (!response.ok) throw new Error('Téléchargement du document échoué')
      const blob = await response.blob()
      await writeFileToFolder(handle, 'documentsElio', doc.name, blob)
      showSuccess(`« ${doc.name} » copié dans le dossier`)
    } catch {
      showError(`Impossible de copier « ${doc.name} »`)
    } finally {
      setCopyingId(null)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3" data-testid="project-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="h-4 w-4 shrink-0 text-indigo-400" />
          <span className="font-medium truncate">{project.name}</span>
        </div>
        <button
          type="button"
          onClick={() => onDelete(project)}
          aria-label={`Supprimer ${project.name}`}
          className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {checking ? (
        <Skeleton className="h-8 w-full" />
      ) : !linked ? (
        <Button size="sm" variant="outline" onClick={handleLinkFolder} data-testid="link-folder">
          <Link2 className="h-4 w-4 mr-1" />
          Lier un dossier local
        </Button>
      ) : permissionGranted ? (
        <Badge variant="outline" className="w-fit gap-1 text-emerald-400 border-emerald-400/40">
          <CheckCircle2 className="h-3 w-3" />
          Dossier lié
        </Badge>
      ) : (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="w-fit gap-1 text-orange-400 border-orange-400/40">
            <AlertTriangle className="h-3 w-3" />
            Permission à renouveler
          </Badge>
          <Button size="sm" variant="outline" onClick={handleRequestPermission}>
            Autoriser
          </Button>
        </div>
      )}

      {linked && documents.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">Documents du dossier client</span>
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{doc.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyDocument(doc)}
                disabled={copyingId === doc.id}
                data-testid="copy-document"
              >
                <FileDown className="h-4 w-4 mr-1" />
                {copyingId === doc.id ? '…' : 'Copier ici'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ClientProjectFolderTab({ clientId }: { clientId: string }) {
  const { data: projects, isLoading, error } = useClientProjects(clientId)
  const { data: documents } = useClientDocuments(clientId)
  const createProject = useCreateClientProject(clientId)
  const deleteProject = useDeleteClientProject(clientId)

  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ClientProject | null>(null)

  const supported = isLocalFolderSupported()

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    try {
      await createProject.mutateAsync({ clientId, name })
      setNewName('')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Création impossible')
    }
  }

  async function confirmDelete(project: ClientProject) {
    try {
      await deleteProject.mutateAsync(project.id)
      setPendingDelete(null)
      showSuccess('Projet retiré — les documents déjà rangés ne sont pas touchés')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression impossible')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm" role="alert">
        Impossible de charger les projets : {error.message}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!supported && (
        <div
          className="rounded-md border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-200/90"
          role="alert"
        >
          <strong className="text-orange-400">Navigateur non supporté</strong>
          <p className="mt-1">
            Lier un dossier local demande Chrome ou Edge. Tu peux quand même créer des projets ici, mais
            la liaison au dossier ne sera possible que depuis un navigateur compatible.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du projet (ex. Refonte site vitrine)"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          data-testid="project-name-input"
        />
        <Button onClick={handleCreate} disabled={!newName.trim() || createProject.isPending} data-testid="project-create">
          <FolderPlus className="h-4 w-4 mr-1" />
          Créer
        </Button>
      </div>

      {(projects ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun projet pour ce client. Crée-en un pour relier un dossier local (Bureau, puis disque dur
          externe) où ranger les documents générés par le Hub.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(projects ?? []).map((project) => (
            <ProjectFolderCard
              key={project.id}
              project={project}
              onDelete={setPendingDelete}
              documents={documents ?? []}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex flex-col gap-2" role="alert">
          <span className="text-xs">Retirer le projet « {pendingDelete.name} » ? Le dossier local et son contenu ne sont pas supprimés.</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" onClick={() => confirmDelete(pendingDelete)} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? '…' : 'Retirer'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPendingDelete(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
