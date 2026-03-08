'use client'

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded bg-red-500/10 border border-red-500/20 px-6 py-8 text-center space-y-3">
      <p className="text-sm text-red-400">Erreur dans le module Administration</p>
      <p className="text-xs text-gray-500">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded px-4 py-2 text-sm bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10"
      >
        Réessayer
      </button>
    </div>
  )
}
