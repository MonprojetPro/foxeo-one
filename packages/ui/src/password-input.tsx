'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { cn } from '@monprojetpro/utils'
import { Input } from './input'

/**
 * Champ mot de passe avec bouton œil pour révéler/masquer la saisie.
 *
 * S'utilise exactement comme `<Input type="password" />` : toutes les props
 * (register RHF, id, value/onChange, placeholder, aria-invalid…) sont forwardées
 * à l'input interne. Le `type` est géré en interne par le toggle œil.
 */
type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>

function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // tabIndex -1 : on ne veut pas casser la tabulation email → mot de passe → submit.
        tabIndex={-1}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

export { PasswordInput }
