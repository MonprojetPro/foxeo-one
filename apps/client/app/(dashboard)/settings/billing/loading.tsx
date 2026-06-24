export default function SettingsBillingLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-7 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
      {/* Abonnement */}
      <div className="h-28 w-full animate-pulse rounded-lg bg-muted" />
      {/* Résumé 3 cartes */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      {/* Factures */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}
