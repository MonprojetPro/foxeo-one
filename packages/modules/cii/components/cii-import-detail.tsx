'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, FileText, Trash2, AlertTriangle } from 'lucide-react'
import { Button, Input, Textarea, Badge, Checkbox, showSuccess, showError } from '@monprojetpro/ui'
import {
  useUpdateCiiLine,
  useUpdateCiiImportTjm,
  useGenerateCiiReformulations,
  useTransferCiiLines,
  useDeleteCiiImport,
} from '../hooks/use-cii-imports'
import type { CiiImportWithLines, CiiReformulationLine } from '../types/cii.types'

const STATUS_LABELS: Record<CiiReformulationLine['status'], string> = {
  pending: 'À reformuler',
  reformulated: 'Reformulée',
  validated: 'Validée',
  transferred: 'Transférée',
}

const STATUS_COLORS: Record<CiiReformulationLine['status'], string> = {
  pending: 'text-orange-400 border-orange-400/40',
  reformulated: 'text-sky-400 border-sky-400/40',
  validated: 'text-emerald-400 border-emerald-400/40',
  transferred: 'text-muted-foreground border-border',
}

function LineRow({
  line,
  tjm,
  clientId,
}: {
  line: CiiReformulationLine
  tjm: number
  clientId: string
}) {
  const updateLine = useUpdateCiiLine(clientId)
  const [text, setText] = useState(line.reformulatedText ?? '')
  const [timeDays, setTimeDays] = useState(line.timeDays?.toString() ?? '')
  // La reformulation IA (bouton du parent) et un refetch Realtime changent `line`
  // sans passer par les handlers locaux — on ne resynchronise que si le serveur a
  // changé par rapport à la dernière valeur connue, pour ne jamais écraser une
  // saisie de MiKL en cours.
  const lastSyncedText = useRef(line.reformulatedText ?? '')
  const lastSyncedTimeDays = useRef(line.timeDays)

  useEffect(() => {
    if (line.reformulatedText !== lastSyncedText.current) {
      lastSyncedText.current = line.reformulatedText ?? ''
      setText(line.reformulatedText ?? '')
    }
  }, [line.reformulatedText])

  useEffect(() => {
    if (line.timeDays !== lastSyncedTimeDays.current) {
      lastSyncedTimeDays.current = line.timeDays
      setTimeDays(line.timeDays?.toString() ?? '')
    }
  }, [line.timeDays])

  const amount = useMemo(() => {
    const days = Number.parseFloat(timeDays)
    if (Number.isNaN(days)) return null
    return Math.round(days * tjm * 100) / 100
  }, [timeDays, tjm])

  async function handleBlurText() {
    if (text === (line.reformulatedText ?? '')) return
    try {
      await updateLine.mutateAsync({ lineId: line.id, reformulatedText: text, status: text.trim() ? 'reformulated' : 'pending' })
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Mise à jour impossible')
    }
  }

  async function handleBlurTime() {
    const parsed = timeDays.trim() === '' ? null : Number.parseFloat(timeDays.replace(',', '.'))
    if (parsed !== null && Number.isNaN(parsed)) return
    if (parsed === line.timeDays) return
    try {
      await updateLine.mutateAsync({ lineId: line.id, timeDays: parsed })
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Mise à jour impossible')
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-2" data-testid="cii-line">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate">{line.functionName}</span>
        <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[line.status]}`}>
          {STATUS_LABELS[line.status]}
        </Badge>
      </div>

      {!line.timeRaw && (
        <div className="flex items-center gap-1 text-xs text-orange-400">
          <AlertTriangle className="h-3 w-3" />
          Aucun temps trouvé dans le fichier pour cette ligne — à saisir manuellement.
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-20 shrink-0">Temps (jours)</span>
        <Input
          type="number"
          step="0.25"
          min="0"
          value={timeDays}
          onChange={(e) => setTimeDays(e.target.value)}
          onBlur={handleBlurTime}
          disabled={line.status === 'transferred'}
          className="w-24"
          data-testid="cii-line-time"
        />
        <span className="text-xs text-muted-foreground">
          {amount !== null ? `≈ ${amount.toLocaleString('fr-FR')} €` : '—'}
        </span>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlurText}
        disabled={line.status === 'transferred'}
        placeholder="Reformulation CII (Action + Innovation + Technologie + Bénéfice)…"
        rows={2}
        data-testid="cii-line-text"
      />
    </div>
  )
}

export function CiiImportDetail({ clientId, ciiImport }: { clientId: string; ciiImport: CiiImportWithLines }) {
  const generateReformulations = useGenerateCiiReformulations(clientId)
  const updateTjm = useUpdateCiiImportTjm(clientId)
  const transferLines = useTransferCiiLines(clientId)
  const deleteImport = useDeleteCiiImport(clientId)

  const [tjmInput, setTjmInput] = useState(ciiImport.tjmEuros.toString())
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([])

  const selectableLines = ciiImport.lines.filter((l) => l.status !== 'transferred')
  const allSelected = selectableLines.length > 0 && selectedLineIds.length === selectableLines.length

  function toggleSelectAll() {
    setSelectedLineIds(allSelected ? [] : selectableLines.map((l) => l.id))
  }

  function toggleLine(lineId: string) {
    setSelectedLineIds((ids) => (ids.includes(lineId) ? ids.filter((id) => id !== lineId) : [...ids, lineId]))
  }

  async function handleTjmBlur() {
    const parsed = Number.parseFloat(tjmInput.replace(',', '.'))
    if (Number.isNaN(parsed) || parsed === ciiImport.tjmEuros) return
    try {
      await updateTjm.mutateAsync({ importId: ciiImport.id, tjmEuros: parsed })
      showSuccess('TJM mis à jour')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Mise à jour impossible')
    }
  }

  async function handleGenerate() {
    try {
      await generateReformulations.mutateAsync(ciiImport.id)
      showSuccess('Reformulations générées — relis-les avant de transférer')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Génération impossible')
    }
  }

  async function handleTransfer(target: 'quote' | 'invoice') {
    try {
      const result = await transferLines.mutateAsync({ importId: ciiImport.id, lineIds: selectedLineIds, target })
      showSuccess(
        target === 'quote'
          ? `Devis créé (${result.pennylaneId}) — à relire dans Comptabilité`
          : `Facture créée (${result.pennylaneId}) — à relire dans Comptabilité`
      )
      setSelectedLineIds([])
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Transfert impossible')
    }
  }

  async function handleDelete() {
    try {
      await deleteImport.mutateAsync(ciiImport.id)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Suppression impossible')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-indigo-400" />
          <span className="text-sm font-medium truncate">{ciiImport.fileName}</span>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Supprimer cet import"
          className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
          data-testid="cii-delete-import"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">TJM (€)</span>
        <Input
          type="number"
          step="10"
          min="0"
          value={tjmInput}
          onChange={(e) => setTjmInput(e.target.value)}
          onBlur={handleTjmBlur}
          className="w-28"
          data-testid="cii-tjm-input"
        />
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generateReformulations.isPending}>
          <Sparkles className="h-4 w-4 mr-1" />
          {generateReformulations.isPending ? 'Génération…' : 'Générer la reformulation IA'}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {ciiImport.lines.map((line) => (
          <div key={line.id} className="flex items-start gap-2">
            {line.status !== 'transferred' && (
              <Checkbox
                checked={selectedLineIds.includes(line.id)}
                onCheckedChange={() => toggleLine(line.id)}
                className="mt-4"
                data-testid="cii-line-select"
              />
            )}
            <div className="flex-1">
              <LineRow line={line} tjm={ciiImport.tjmEuros} clientId={clientId} />
            </div>
          </div>
        ))}
      </div>

      {selectableLines.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <button type="button" onClick={toggleSelectAll} className="text-xs text-muted-foreground hover:text-foreground">
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedLineIds.length === 0 || transferLines.isPending}
              onClick={() => handleTransfer('quote')}
              data-testid="cii-transfer-quote"
            >
              Préparation devis
            </Button>
            <Button
              size="sm"
              disabled={selectedLineIds.length === 0 || transferLines.isPending}
              onClick={() => handleTransfer('invoice')}
              data-testid="cii-transfer-invoice"
            >
              Préparation facture
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
