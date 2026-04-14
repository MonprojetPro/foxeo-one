import { notFound } from 'next/navigation'
import { SubmissionDetailView } from '@monprojetpro/module-parcours'

interface SubmissionDetailPageProps {
  params: Promise<{
    clientId: string
    submissionId: string
  }>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function SubmissionDetailPage({ params }: SubmissionDetailPageProps) {
  const { clientId, submissionId } = await params

  if (!UUID_REGEX.test(clientId) || !UUID_REGEX.test(submissionId)) {
    notFound()
  }

  return (
    <div className="container mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Soumission client</h1>
        <p className="text-muted-foreground mt-1">Examinez le travail soumis et validez ou demandez une révision.</p>
      </div>

      <SubmissionDetailView
        submissionId={submissionId}
        clientId={clientId}
        showValidationForm={true}
      />
    </div>
  )
}
