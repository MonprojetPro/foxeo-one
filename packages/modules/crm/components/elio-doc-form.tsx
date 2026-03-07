'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { showSuccess, showError, Button } from '@foxeo/ui'
import { injectElioDocumentation } from '../actions/inject-elio-documentation'
import type { ElioModuleDoc } from '@foxeo/types'

const FaqItemSchema = z.object({
  question: z.string().min(1, 'Question requise'),
  answer: z.string().min(1, 'Réponse requise'),
})

const CommonIssueSchema = z.object({
  problem: z.string().min(1, 'Problème requis'),
  diagnostic: z.string().min(1, 'Diagnostic requis'),
  escalation: z.string().min(1, 'Escalade requise'),
})

const ElioDocFormSchema = z.object({
  moduleId: z.string().min(1, 'Sélectionnez un module'),
  description: z.string().min(10, 'La description doit faire au moins 10 caractères'),
  faq: z.array(FaqItemSchema).default([]),
  commonIssues: z.array(CommonIssueSchema).default([]),
})

type ElioDocFormValues = z.infer<typeof ElioDocFormSchema>

interface ElioDocFormProps {
  clientId: string
  activeModules: string[]
  onSuccess?: () => void
}

export function ElioDocForm({ clientId, activeModules, onSuccess }: ElioDocFormProps) {
  const [jsonImport, setJsonImport] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ElioDocFormValues>({
    resolver: zodResolver(ElioDocFormSchema),
    defaultValues: {
      moduleId: '',
      description: '',
      faq: [],
      commonIssues: [],
    },
  })

  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq,
  } = useFieldArray({ control, name: 'faq' })

  const {
    fields: issueFields,
    append: appendIssue,
    remove: removeIssue,
  } = useFieldArray({ control, name: 'commonIssues' })

  const onSubmit = async (data: ElioDocFormValues) => {
    setIsSubmitting(true)
    const doc: ElioModuleDoc = {
      ...data,
      updatedAt: new Date().toISOString(),
    }

    const result = await injectElioDocumentation(clientId, doc)

    if (result.error) {
      showError(`Erreur : ${result.error.message}`)
    } else {
      showSuccess(`Documentation Élio mise à jour pour le module ${data.moduleId}`)
      reset()
      onSuccess?.()
    }
    setIsSubmitting(false)
  }

  const handleJsonImport = () => {
    setJsonError(null)
    try {
      const parsed = JSON.parse(jsonImport) as unknown
      const validated = ElioDocFormSchema.parse(parsed)
      setValue('moduleId', validated.moduleId)
      setValue('description', validated.description)
      setValue('faq', validated.faq ?? [])
      setValue('commonIssues', validated.commonIssues ?? [])
      setJsonImport('')
    } catch (err) {
      if (err instanceof z.ZodError) {
        setJsonError(`JSON invalide : ${err.issues[0]?.message ?? 'Format incorrect'}`)
      } else {
        setJsonError('JSON malformé — vérifiez la syntaxe')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Sélection module */}
      <div className="space-y-1">
        <label htmlFor="elio-doc-module" className="text-sm font-medium">
          Module concerné
        </label>
        <select
          id="elio-doc-module"
          {...register('moduleId')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">— Sélectionner un module —</option>
          {activeModules.map((moduleId) => (
            <option key={moduleId} value={moduleId}>
              {moduleId}
            </option>
          ))}
        </select>
        {errors.moduleId && (
          <p className="text-xs text-destructive">{errors.moduleId.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="elio-doc-description" className="text-sm font-medium">
          Description du module
        </label>
        <textarea
          id="elio-doc-description"
          {...register('description')}
          rows={3}
          placeholder="Ce que le module fait, ses fonctionnalités principales..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Questions fréquentes (FAQ)</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendFaq({ question: '', answer: '' })}
          >
            + Ajouter une FAQ
          </Button>
        </div>
        {faqFields.map((field, index) => (
          <div key={field.id} className="space-y-2 p-3 rounded-md border border-border bg-muted/30">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Question</label>
              <input
                {...register(`faq.${index}.question`)}
                placeholder="Question fréquente..."
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
              {errors.faq?.[index]?.question && (
                <p className="text-xs text-destructive">{errors.faq[index]?.question?.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Réponse</label>
              <textarea
                {...register(`faq.${index}.answer`)}
                rows={2}
                placeholder="Réponse..."
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none"
              />
              {errors.faq?.[index]?.answer && (
                <p className="text-xs text-destructive">{errors.faq[index]?.answer?.message}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeFaq(index)}
              className="text-destructive hover:text-destructive"
            >
              Supprimer
            </Button>
          </div>
        ))}
      </div>

      {/* Problèmes courants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Problèmes courants</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendIssue({ problem: '', diagnostic: '', escalation: '' })}
          >
            + Ajouter un problème
          </Button>
        </div>
        {issueFields.map((field, index) => (
          <div key={field.id} className="space-y-2 p-3 rounded-md border border-border bg-muted/30">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Problème</label>
              <input
                {...register(`commonIssues.${index}.problem`)}
                placeholder="Description du problème..."
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Diagnostic</label>
              <input
                {...register(`commonIssues.${index}.diagnostic`)}
                placeholder="Comment diagnostiquer..."
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Escalade</label>
              <input
                {...register(`commonIssues.${index}.escalation`)}
                placeholder="Quand escalader vers MiKL..."
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeIssue(index)}
              className="text-destructive hover:text-destructive"
            >
              Supprimer
            </Button>
          </div>
        ))}
      </div>

      {/* Import JSON */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-sm font-medium text-muted-foreground">
          Import JSON (généré par Orpheus)
        </p>
        <textarea
          value={jsonImport}
          onChange={(e) => setJsonImport(e.target.value)}
          rows={4}
          placeholder='{ "moduleId": "crm", "description": "...", "faq": [], "commonIssues": [] }'
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none"
          aria-label="Import JSON de documentation"
        />
        {jsonError && (
          <p className="text-xs text-destructive">{jsonError}</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleJsonImport}
          disabled={!jsonImport.trim()}
        >
          Importer le JSON
        </Button>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </form>
  )
}
