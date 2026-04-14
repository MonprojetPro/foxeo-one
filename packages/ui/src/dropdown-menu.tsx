'use client'

// DropdownMenu stub — remplacera par @radix-ui/react-dropdown-menu quand installé
import * as React from 'react'
import { cn } from '@monprojetpro/utils'

interface DropdownCtx { open: boolean; setOpen: (v: boolean) => void }
const DropdownCtx = React.createContext<DropdownCtx>({ open: false, setOpen: () => {} })

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  // Close on outside click
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])
  return (
    <DropdownCtx.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </DropdownCtx.Provider>
  )
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, asChild, onClick, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DropdownCtx)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: (e: React.MouseEvent) => {
        setOpen(!open)
        const origOnClick = (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props.onClick
        if (origOnClick) origOnClick(e as React.MouseEvent<HTMLElement>)
      },
    })
  }
  return (
    <button ref={ref} onClick={(e) => { setOpen(!open); onClick?.(e) }} {...props}>
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'end' | 'center'; sideOffset?: number }
>(({ className, children, align = 'end', ...props }, ref) => {
  const { open } = React.useContext(DropdownCtx)
  if (!open) return null
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-1 min-w-[8rem] rounded-md border border-border bg-popover p-1 shadow-md',
        align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = 'DropdownMenuContent'

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; disabled?: boolean }
>(({ className, inset, disabled, onClick, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownCtx)
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
        inset && 'pl-8',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={(e) => { onClick?.(e); setOpen(false) }}
      {...props}
    />
  )
})
DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

export function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DropdownMenuSubTrigger({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm', className)} {...props}>{children}</div>
}

export function DropdownMenuSubContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('absolute left-full top-0 z-50 ml-1 min-w-[8rem] rounded-md border border-border bg-popover p-1 shadow-md', className)} {...props}>{children}</div>
}

export function DropdownMenuRadioGroup({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { checked?: boolean }
>(({ className, children, checked, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer', className)} {...props}>
    <span className="mr-2">{checked ? '✓' : ' '}</span>
    {children}
  </div>
))
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

export const DropdownMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string }
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer', className)} {...props}>
    {children}
  </div>
))
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

export function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
}
