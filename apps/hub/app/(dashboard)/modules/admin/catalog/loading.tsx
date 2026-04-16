export default function CatalogLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-white/5" />
        <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-white/5" />
        ))}
      </div>
    </div>
  )
}
