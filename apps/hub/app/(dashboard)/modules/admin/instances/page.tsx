'use client'

import { InstancesList } from '@monprojetpro/module-admin'

export default function InstancesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Instances One</h1>
        <p className="text-sm text-gray-400">
          Instances MonprojetPro One dédiées provisionnées par client.
          Pour provisionner une nouvelle instance, rendez-vous sur la fiche client CRM.
        </p>
      </div>

      <InstancesList />
    </div>
  )
}
