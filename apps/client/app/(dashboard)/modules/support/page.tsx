'use client'

import { FaqPage, ReportIssueDialog, MyTicketsList } from '@monprojetpro/modules-support'
import { useState } from 'react'
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@monprojetpro/ui'
import { Plus } from 'lucide-react'

export default function ClientSupportPage() {
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6 p-6">
      <Tabs defaultValue="faq">
        <TabsList>
          <TabsTrigger value="faq">Aide & FAQ</TabsTrigger>
          <TabsTrigger value="tickets">Mes signalements</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-4">
          <FaqPage onReportIssue={() => setReportOpen(true)} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <div className="mb-4 flex items-center justify-end">
            <Button size="sm" onClick={() => setReportOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Signaler un problème
            </Button>
          </div>
          <MyTicketsList />
        </TabsContent>
      </Tabs>

      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  )
}
