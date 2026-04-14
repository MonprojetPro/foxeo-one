'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@monprojetpro/ui'

interface ClientSearchProps {
  onSearchChange: (search: string) => void
  placeholder?: string
}

export function ClientSearch({
  onSearchChange,
  placeholder = 'Rechercher par nom, entreprise, email ou secteur...'
}: ClientSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const onSearchChangeRef = useRef(onSearchChange)
  onSearchChangeRef.current = onSearchChange

  // Debounce search input (300ms) — ref avoids re-firing on unstable callbacks
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChangeRef.current(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  return (
    <div className="w-full max-w-md">
      <Input
        type="search"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full"
      />
    </div>
  )
}

ClientSearch.displayName = 'ClientSearch'
