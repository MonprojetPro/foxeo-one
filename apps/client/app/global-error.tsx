'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ fontFamily: 'monospace', padding: '2rem', background: '#111', color: '#fff' }}>
        <h1 style={{ color: '#f87171' }}>Erreur serveur</h1>
        <p style={{ color: '#9ca3af' }}>Digest: {error.digest ?? 'aucun'}</p>
        <pre style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', overflow: 'auto', color: '#fca5a5' }}>
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
        <button
          onClick={reset}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}
