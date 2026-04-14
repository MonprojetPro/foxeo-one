'use client'

// Popover stub — remplacera par @radix-ui/react-popover quand installé
import * as React from 'react'
import { cn } from '@monprojetpro/utils'

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}
const PopoverContext = React.createContext<PopoverContextValue>({ open: false, setOpen: () => {} })

export function Popover({ children }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

export const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, asChild, onClick, ...props }, ref) => {
  const { setOpen, open } = React.useContext(PopoverContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: (e: React.MouseEvent) => {
        setOpen(!open)
        const originalOnClick = (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props.onClick
        if (originalOnClick) originalOnClick(e as React.MouseEvent<HTMLElement>)
      },
    })
  }
  return (
    <button ref={ref} onClick={(e) => { setOpen(!open); onClick?.(e) }} {...props}>
      {children}
    </button>
  )
})
PopoverTrigger.displayName = 'PopoverTrigger'

export const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: string; sideOffset?: number }
>(({ className, children, align, sideOffset, ...props }, ref) => {
  const { open } = React.useContext(PopoverContext)
  if (!open) return null
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-1 min-w-[8rem] rounded-md border border-border bg-popover p-1 shadow-md',
        align === 'start' ? 'left-0' : 'right-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = 'PopoverContent'
