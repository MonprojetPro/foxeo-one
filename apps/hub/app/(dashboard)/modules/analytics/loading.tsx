export default function AnalyticsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-28 rounded bg-white/5 animate-pulse" />
          <div className="h-4 w-56 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="h-8 w-36 rounded bg-white/5 animate-pulse" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-5 rounded bg-white/5 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
