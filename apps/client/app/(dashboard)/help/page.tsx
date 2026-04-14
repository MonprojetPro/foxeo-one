'use client'

import { useState } from 'react'
import { FaqPage, ReportIssueDialog } from '@monprojetpro/modules-support'

export default function HelpPage() {
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <>
      <FaqPage
        onReportIssue={() => setReportOpen(true)}
        chatHref="/modules/chat"
      />
      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
    </>
  )
}
