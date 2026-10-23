'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, showError } from '@monprojetpro/ui'
import { useCreateCiiImport } from '../hooks/use-cii-imports'

export type CiiClientProjectOption = { id: string; name: string }

export function CiiImportUpload({
  clientId,
  clientProjects = [],
}: {
  clientId: string
  clientProjects?: CiiClientProjectOption[]
}) {
  const createImport = useCreateCiiImport(clientId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rawContent = await file.text()
      await createImport.mutateAsync({
        clientId,
        clientProjectId: selectedProjectId || null,
        fileName: file.name,
        rawContent,
      })
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Import impossible')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-4 flex flex-col gap-3">
      <span className="text-sm text-muted-foreground">
        Uploade un fichier texte listant les fonctions développées, une par ligne, avec leur temps
        en fin de ligne (ex. « Validation du formulaire de paiement — 2h »). Le temps non reconnu
        reste modifiable ensuite.
      </span>
      {clientProjects.length > 0 && (
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Rattacher à un projet (optionnel)" />
          </SelectTrigger>
          <SelectContent>
            {clientProjects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,text/plain"
        className="hidden"
        onChange={handleFileChange}
        data-testid="cii-file-input"
      />
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() => fileInputRef.current?.click()}
        disabled={createImport.isPending}
        data-testid="cii-upload-button"
      >
        <Upload className="h-4 w-4 mr-1" />
        {createImport.isPending ? 'Import…' : 'Uploader un fichier'}
      </Button>
    </div>
  )
}
