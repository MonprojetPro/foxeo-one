import Link from 'next/link'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        ← Retour au dashboard
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Paramètres</h1>
      {children}
    </div>
  )
}
