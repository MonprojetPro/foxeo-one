'use client'

// ── Props ─────────────────────────────────────────────────────────────────────

type PdfDownloadButtonProps = {
  fileUrl: string | null | undefined
  label?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PdfDownloadButton({ fileUrl, label = 'Télécharger PDF' }: PdfDownloadButtonProps) {
  if (!fileUrl) {
    return (
      <span
        role="status"
        aria-label="PDF en cours de génération"
        title="PDF en cours de génération"
        className="cursor-not-allowed rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground/50 select-none"
      >
        {label}
      </span>
    )
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
    >
      {label}
    </a>
  )
}
