export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded bg-white/5 animate-pulse" />
        <div className="h-4 w-64 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="flex gap-1 border-b border-white/10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-t bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
