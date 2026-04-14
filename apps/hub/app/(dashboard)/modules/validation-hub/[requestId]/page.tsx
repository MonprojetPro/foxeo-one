import { RequestDetail } from '@monprojetpro/modules-validation-hub'

export default async function ValidationRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params

  return <RequestDetail requestId={requestId} />
}
