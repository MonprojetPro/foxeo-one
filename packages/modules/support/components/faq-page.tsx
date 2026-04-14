'use client'

import { useState, useMemo } from 'react'
import { Card, Button } from '@monprojetpro/ui'
import { ChevronDown, MessageCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { FAQ_CATEGORIES, type FaqCategory, type FaqQuestion } from '../data/faq-content'
import { FaqSearch } from './faq-search'

function FaqCategorySection({
  category,
  filteredQuestions,
}: {
  category: FaqCategory
  filteredQuestions: FaqQuestion[]
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (filteredQuestions.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{category.title}</h2>
      <div className="space-y-1">
        {filteredQuestions.map((faq, idx) => {
          const isOpen = openIndex === idx
          return (
            <div key={idx} className="rounded-lg border border-border">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left text-sm font-medium hover:bg-accent/50"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
              >
                {faq.q}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
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
        <h1 className="text-2xl font-bold">Aide & FAQ</h1>
        <p className="text-muted-foreground">
          Trouvez rapidement des réponses à vos questions.
        </p>
      </div>

      <FaqSearch value={search} onChange={setSearch} />

      {filteredCategories.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Aucun résultat pour « {search} ».
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((cat) => (
            <FaqCategorySection
              key={cat.id}
              category={cat}
              filteredQuestions={cat.questions}
            />
          ))}
        </div>
      )}

      <Card className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
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
