import type { ReactNode } from 'react'
import { ThemeOneSetter } from './theme-one-setter'

// Graduation layout — full-screen without dashboard shell
export default function GraduationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="graduation-layout">
      <ThemeOneSetter />
      {children}
    </div>
  )
}
