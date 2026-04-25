import { ThemeReset } from './theme-reset'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeReset />
      <div className="flex min-h-screen items-center justify-center">
        {children}
      </div>
    </>
  )
}
