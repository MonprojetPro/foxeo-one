'use client'

import { useState, useMemo } from 'react'
import { Card, Button } from '@monprojetpro/ui'
import {
  ChevronDown,
  MessageCircle,
  AlertTriangle,
  Rocket,
  FlaskConical,
  LayoutDashboard,
  Shield,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { FAQ_CATEGORIES, type FaqCategory, type FaqQuestion } from '../data/faq-content'
import { FaqSearch } from './faq-search'

// Mappe l'icône déclarée dans faq-content vers le composant lucide correspondant.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  flask: FlaskConical,
  'layout-dashboard': LayoutDashboard,
  shield: Shield,
  'message-circle': MessageCircle,
}

function FaqCategorySection({
  category,
  filteredQuestions,
}: {
  category: FaqCategory
  filteredQuestions: FaqQuestion[]
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (filteredQuestions.length === 0) return null

  const Icon = CATEGORY_ICONS[category.icon] ?? HelpCircle

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-semibold">{category.title}</h2>
      </div>
      <div className="space-y-2">
        {filteredQuestions.map((faq, idx) => {
          const isOpen = openIndex === idx
          return (
            <div
              key={idx}
              className={cn(
                'overflow-hidden rounded-xl border bg-card/40 transition-all',
                isOpen
                  ? 'border-primary/40 bg-card shadow-sm ring-1 ring-primary/10'
                  : 'border-border hover:border-primary/30 hover:bg-card/70'
              )}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-medium transition-colors"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
              >
                <span className={cn('transition-colors', isOpen && 'text-primary')}>{faq.q}</span>
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all',
                    isOpen ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
                  )}
                >
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                  />
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-border/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface FaqPageProps {
  onReportIssue?: () => void
  chatHref?: string
}

export function FaqPage({ onReportIssue, chatHref = '/modules/chat' }: FaqPageProps) {
  const [search, setSearch] = useState('')

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return FAQ_CATEGORIES

    const lower = search.toLowerCase()
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (faq) =>
          faq.q.toLowerCase().includes(lower) ||
          faq.a.toLowerCase().includes(lower)
      ),
    })).filter((cat) => cat.questions.length > 0)
  }, [search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aide &amp; FAQ</h1>
        <p className="text-muted-foreground">
          Trouvez rapidement des réponses à vos questions.
        </p>
      </div>

      <FaqSearch value={search} onChange={setSearch} />

      {filteredCategories.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Aucun résultat pour «&nbsp;{search}&nbsp;».
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredCategories.map((cat) => (
            <FaqCategorySection
              key={cat.id}
              category={cat}
              filteredQuestions={cat.questions}
            />
          ))}
        </div>
      )}

      <Card className="flex flex-col gap-3 border-primary/20 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">Vous ne trouvez pas la réponse ?</h3>
          <p className="text-sm text-muted-foreground">
            Contactez MiKL ou signalez un problème.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={chatHref}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Contacter MiKL
            </a>
          </Button>
          {onReportIssue && (
            <Button variant="outline" onClick={onReportIssue}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Signaler un problème
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
