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
    /* Champ de recherche cockpit — pleine largeur dans son conteneur */
    <div className="w-full max-w-md">
      <Input
        type="search"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-white/[0.03] border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-400/40 focus:ring-cyan-400/10"
      />
    </div>
  )
}

ClientSearch.displayName = 'ClientSearch'
