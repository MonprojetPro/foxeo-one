'use client'

import { FaqPage, ReportIssueDialog, MyTicketsList } from '@monprojetpro/modules-support'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@monprojetpro/ui'

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
          <MyTicketsList />
        </TabsContent>
      </Tabs>

      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  )
}
