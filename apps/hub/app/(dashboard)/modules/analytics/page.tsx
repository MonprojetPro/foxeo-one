import { AnalyticsDashboard } from '@monprojetpro/module-analytics'

export const metadata = {
  title: 'Analytics — MonprojetPro Hub',
}

export default function AnalyticsPage() {
  return (
    /* Padding homogène avec les autres modules Hub */
    <div className="p-6 md:p-8">
      <AnalyticsDashboard />
    </div>
  )
}
