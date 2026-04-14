'use client'

import { useState } from 'react'
import { Button } from '@monprojetpro/ui'
import { Plus } from 'lucide-react'
import { MyTicketsList, ReportIssueDialog } from '@monprojetpro/modules-support'

export default function SupportPage() {
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes signalements</h1>
          <p className="text-muted-foreground">
            Suivez l'état de vos demandes de support.
          </p>
        </div>
        <Button onClick={() => setReportOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Signaler un problème
        </Button>
      </div>

      <MyTicketsList />

      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  )
}
