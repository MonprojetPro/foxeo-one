export default function DocumentationLoading() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-80 bg-muted/60 rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-muted/40 rounded-lg animate-pulse mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
