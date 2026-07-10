'use client'

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
}

export function Sparkline({ values, width = 100, height = 32 }: SparklineProps) {
  if (!values.length) return null

  const min = Math.min(...values)
  const max = Math.max(...values, min + 1)
  const range = max - min

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  })

  return (
    /* Sparkline cockpit : ligne cyan avec zone de remplissage discrète */
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      {/* Zone de remplissage très discrète sous la courbe */}
      <polyline
        points={[`0,${height}`, ...points, `${width},${height}`].join(' ')}
        fill="rgb(34 211 238 / 0.06)"
        stroke="none"
      />
      {/* Ligne principale cyan */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="rgb(34 211 238 / 0.7)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
