'use client'

import { ValidationQueue } from '@monprojetpro/modules-validation-hub'
import { usePresenceContext } from '@monprojetpro/modules-chat'

export default function ValidationHubPage() {
  const { operatorId } = usePresenceContext()
  return <ValidationQueue operatorId={operatorId} />
}
