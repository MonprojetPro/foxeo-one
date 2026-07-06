export default function ElioHubTabLoading() {
  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <div className="h-5 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl border border-border/40 bg-card/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border/40 bg-card/40" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-border/40 bg-card/40" />
        ))}
      </div>
    </div>
  )
}
