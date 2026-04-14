'use client'

import { Info } from 'lucide-react'
import { Checkbox } from '../checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../tooltip'
import { t } from '@monprojetpro/utils'
import '../messages/init'

interface ConsentCheckboxProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  link?: string
  linkText?: string
  tooltip?: string
  required?: boolean
  /** Translation key for default values (e.g., 'consent.cgu') */
  translationKey?: string
}

export function ConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  label: labelProp,
  link: linkProp,
  linkText: linkTextProp,
  tooltip: tooltipProp,
  required = false,
  translationKey,
}: ConsentCheckboxProps) {
  // Use defaults from translation if translationKey provided
  const label = labelProp ?? (translationKey ? t(`${translationKey}.label`) : '')
  const link = linkProp ?? (translationKey ? t(`${translationKey}.link`) : '#')
  const linkText = linkTextProp ?? (translationKey ? t(`${translationKey}.linkText`) : '')
  const tooltip = tooltipProp ?? (translationKey ? t(`${translationKey}.tooltip`) : undefined)

  return (
    <div className="flex items-start space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        required={required}
      />
      <div className="space-y-1 leading-none">
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>

        <div className="flex items-center gap-2">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline hover:text-primary/80 transition-colors"
          >
            {linkText}
          </a>

          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="focus:outline-none">
                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  )
}
