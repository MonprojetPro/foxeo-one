'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@monprojetpro/ui'
import { updateOnboardingProfile } from '../actions/update-onboarding-profile'

interface ProfileFormProps {
  clientKind: 'individual' | 'entity'
  firstName: string
  name: string
  contact: string
  email: string
  phone: string
  sector: string
  website: string
}

export function ProfileForm({
  clientKind,
  firstName: initialFirstName,
  name: initialName,
  contact: initialContact,
  email,
  phone: initialPhone,
  sector: initialSector,
  website: initialWebsite,
}: ProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState(initialFirstName)
  const [name, setName] = useState(initialName)
  const [contact, setContact] = useState(initialContact)
  const [phone, setPhone] = useState(initialPhone)
  const [sector, setSector] = useState(initialSector)
  const [website, setWebsite] = useState(initialWebsite)

  const isEntity = clientKind === 'entity'

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    startTransition(async () => {
      const result = await updateOnboardingProfile({ firstName, name, contact, phone, sector, website })
      if (result.error) {
        setServerError(result.error.message)
        return
      }
      router.push('/login')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          {serverError}
        </p>
      )}

      {!isEntity && (
        <div className="space-y-2">
          <label htmlFor="firstName" className="text-sm font-medium">Prénom</label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">{isEntity ? 'Raison sociale' : 'Nom'}</label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder={isEntity ? 'Raison sociale' : 'Votre nom'} />
      </div>

      {isEntity && (
        <div className="space-y-2">
          <label htmlFor="contact" className="text-sm font-medium">Contact</label>
          <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nom du contact" />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">Pour changer d'adresse email, contactez MiKL.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">Téléphone</label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Votre numéro" />
      </div>

      <div className="space-y-2">
        <label htmlFor="sector" className="text-sm font-medium">Secteur d'activité</label>
        <Input id="sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Ex : Santé, Commerce..." />
      </div>

      <div className="space-y-2">
        <label htmlFor="website" className="text-sm font-medium">Site web</label>
        <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Validation...' : 'Valider et me connecter'}
      </Button>
    </form>
  )
}
