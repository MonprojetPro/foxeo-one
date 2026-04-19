'use client'

import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { Button } from '../button'
import { Sheet, SheetContent, SheetTitle } from '../sheet'
import { useIsMobile } from '../use-mobile'

type DashboardShellProps = {
  density?: 'compact' | 'comfortable' | 'spacious'
  sidebar?: ReactNode
  header?: ReactNode
  breadcrumb?: ReactNode
  children?: ReactNode
}

const densityClasses = {
  compact: 'gap-2 p-2',
  comfortable: 'gap-4 p-4',
  spacious: 'gap-6 p-6',
} as const

export function DashboardShell({
  density = 'comfortable',
  sidebar,
  header,
  breadcrumb,
  children,
}: DashboardShellProps) {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="flex h-screen overflow-hidden bg-background text-foreground"
      data-density={density}
    >
      {/* Skip to content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Aller au contenu principal
      </a>

      {/* Desktop sidebar */}
      {sidebar && (
        <aside
          className="hidden md:flex md:flex-col md:w-[240px] border-r border-[#2d2d2d] bg-[#141414]"
          role="navigation"
          aria-label="Menu principal"
        >
          {sidebar}
        </aside>
      )}

      {/* Mobile sidebar (Sheet drawer) */}
      {sidebar && isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[240px] p-0 bg-[#141414]">
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
            <nav role="navigation" aria-label="Menu principal">
              {sidebar}
            </nav>
          </SheetContent>
        </Sheet>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {header && (
          <header className="flex h-[60px] items-center border-b border-[#2d2d2d] px-4 bg-[#141414]">
            {/* Mobile hamburger */}
            {sidebar && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            {header}
          </header>
        )}
        <main
          id="main-content"
          className={cn('flex-1 overflow-y-auto', densityClasses[density])}
        >
          {breadcrumb && (
            <div className="mb-4">
              {breadcrumb}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
