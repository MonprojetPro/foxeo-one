'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@monprojetpro/utils'

/**
 * Texte tronqué à 2 lignes par défaut, avec un bouton « Voir plus / Voir moins »
 * qui n'apparaît QUE si le texte dépasse réellement (mesure scrollHeight vs clientHeight).
 */
export function ExpandableText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)

  useEffect(() => {
    // On ne mesure que dans l'état tronqué : une fois déplié, on garde le bouton
    // visible pour pouvoir replier (sinon scrollHeight == clientHeight → bouton disparaît).
    if (expanded) return
    const el = ref.current
    if (el) setCanExpand(el.scrollHeight > el.clientHeight + 1)
  }, [text, expanded])

  return (
    <div className="space-y-1">
      <p
        ref={ref}
        className={cn(
          'whitespace-pre-wrap text-sm text-muted-foreground',
          !expanded && 'line-clamp-2'
        )}
      >
        {text}
      </p>
      {(canExpand || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? 'Voir moins' : 'Voir plus'}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  )
}
