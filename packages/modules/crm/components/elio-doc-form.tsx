'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { showSuccess, showError, Button, SectionTitle, CockpitCallout } from '@monprojetpro/ui'
import { injectElioDocumentation } from '../actions/inject-elio-documentation'
import type { ElioModuleDoc } from '@monprojetpro/types'

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
      {/* Selection module */}
      <div className="space-y-1.5">
        <label htmlFor="elio-doc-module" className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
          Module concerne
        </label>
        <select
          id="elio-doc-module"
          {...register('moduleId')}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
        >
          <option value="">-- Selectionner un module --</option>
          {activeModules.map((moduleId) => (
            <option key={moduleId} value={moduleId}>
              {moduleId}
            </option>
          ))}
        </select>
        {errors.moduleId && (
          <p className="text-xs text-red-400">{errors.moduleId.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="elio-doc-description" className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
          Description du module
        </label>
        <textarea
          id="elio-doc-description"
          {...register('description')}
          rows={3}
          placeholder="Ce que le module fait, ses fonctionnalites principales..."
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/40 focus:outline-none"
        />
        {errors.description && (
          <p className="text-xs text-red-400">{errors.description.message}</p>
        )}
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <SectionTitle
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendFaq({ question: '', answer: '' })}
            >
              + Ajouter une FAQ
            </Button>
          }
        >
          Questions frequentes (FAQ)
        </SectionTitle>
        {faqFields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="space-y-1">
              <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500">Question</label>
              <input
                {...register(`faq.${index}.question`)}
                placeholder="Question fréquente..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/40 focus:outline-none"
              />
              {errors.faq?.[index]?.question && (
                <p className="text-xs text-red-400">{errors.faq[index]?.question?.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500">Reponse</label>
              <textarea
                {...register(`faq.${index}.answer`)}
                rows={2}
                placeholder="Reponse..."
                className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/40 focus:outline-none"
              />
              {errors.faq?.[index]?.answer && (
                <p className="text-xs text-red-400">{errors.faq[index]?.answer?.message}</p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeFaq(index)}
              className="text-red-400 hover:text-red-300"
            >
              Supprimer
            </Button>
          </div>
        ))}
      </div>

      {/* Problemes courants */}
      <div className="space-y-3">
        <SectionTitle
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendIssue({ problem: '', diagnostic: '', escalation: '' })}
            >
              + Ajouter un probleme
            </Button>
          }
        >
          Problemes courants
        </SectionTitle>
        {issueFields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="space-y-1">
              <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500">Probleme</label>
              <input
                {...register(`commonIssues.${index}.problem`)}
                placeholder="Description du probleme..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500">Diagnostic</label>
              <input
                {...register(`commonIssues.${index}.diagnostic`)}
                placeholder="Comment diagnostiquer..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500">Escalade</label>
              <input
                {...register(`commonIssues.${index}.escalation`)}
                placeholder="Quand escalader vers MiKL..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/40 focus:outline-none"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeIssue(index)}
              className="text-red-400 hover:text-red-300"
            >
              Supprimer
            </Button>
          </div>
        ))}
      </div>

      {/* Import JSON */}
      <div className="space-y-2 border-t border-white/10 pt-4">
        <SectionTitle>Import JSON (genere par Orpheus)</SectionTitle>
        <textarea
          value={jsonImport}
          onChange={(e) => setJsonImport(e.target.value)}
          rows={4}
          placeholder='{ "moduleId": "crm", "description": "...", "faq": [], "commonIssues": [] }'
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white placeholder:text-gray-600 focus:border-cyan-400/40 focus:outline-none"
          aria-label="Import JSON de documentation"
        />
        {jsonError && (
          <CockpitCallout tone="red">{jsonError}</CockpitCallout>
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
      <div className="flex justify-end border-t border-white/10 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </form>
  )
}
