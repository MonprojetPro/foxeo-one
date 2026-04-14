'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Input } from '@monprojetpro/ui'
import { Search, X } from 'lucide-react'

interface DocumentSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function debounce<T extends (val: string) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (val: string) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(val), delay)
  }
}

export function DocumentSearch({
  value,
  onChange,
  placeholder = 'Rechercher un document...',
}: DocumentSearchProps) {
  const [hasValue, setHasValue] = useState(value !== '')
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedOnChange = useCallback(
    debounce((val: string) => onChange(val), 200),
    [onChange]
  )

  // Sync external reset
  useEffect(() => {
    if (value === '' && inputRef.current && inputRef.current.value !== '') {
      inputRef.current.value = ''
      setHasValue(false)
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHasValue(val !== '')
    debouncedOnChange(val)
  }

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setHasValue(false)
    onChange('')
  }

  return (
    <div className="relative" data-testid="document-search">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-8 pr-8"
        data-testid="document-search-input"
      />
      {hasValue && (
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          aria-label="Effacer la recherche"
          data-testid="document-search-clear"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
