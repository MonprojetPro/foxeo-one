'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Textarea,
  Button,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { useCreateClientContact, useUpdateClientContact } from '../hooks/use-client-contacts'
import type { ClientContact } from '../types/crm.types'

// ============================================================
// ClientContactDialog — T-039
//
// 🔑 LES DEUX CASES SONT INDEPENDANTES, et l'ecran doit le rendre evident : MiKL
// veut pouvoir afficher le NOM du secretaire tout en envoyant la facture a
// l'ADRESSE de la comptable. Elles sont donc presentees separement, chacune avec
// sa consequence ecrite en clair, et non comme deux variantes d'un meme reglage.
// ============================================================

const formSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Le nom est requis').max(200, 'Nom trop long'),
    email: z.union([z.string().trim().email('Adresse e-mail invalide'), z.literal('')]),
    note: z.string().trim().max(2000, 'Note trop longue (2000 caractères max)'),
    receivesInvoices: z.boolean(),
    showOnInvoice: z.boolean(),
  })
  // Un destinataire sans adresse serait coche a l'ecran et muet a l'envoi. La base
  // le refuse aussi (contrainte CHECK) : ici c'est pour le dire lisiblement.
  .refine((v) => v.receivesInvoices !== true || v.email.trim() !== '', {
    message: 'Une adresse e-mail est requise pour envoyer la facture à ce contact',
    path: ['email'],
  })

type FormValues = z.infer<typeof formSchema>

const EMPTY: FormValues = {
  fullName: '',
  email: '',
  note: '',
  receivesInvoices: false,
  showOnInvoice: false,
}

type ClientContactDialogProps = {
  clientId: string
  /** Contact a modifier. Absent = creation. */
  contact?: ClientContact | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientContactDialog({
  clientId,
  contact,
  open,
  onOpenChange,
}: ClientContactDialogProps) {
  const isEdit = Boolean(contact)
  const createContact = useCreateClientContact(clientId)
  const updateContact = useUpdateClientContact(clientId)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY })

  // Le dialogue est monte une seule fois et reutilise pour chaque contact : sans
  // cette remise a zero, ouvrir « Modifier » sur Marie puis sur Paul afficherait
  // encore les valeurs de Marie.
  useEffect(() => {
    if (!open) return
    reset(
      contact
        ? {
            fullName: contact.fullName,
            email: contact.email ?? '',
            note: contact.note ?? '',
            receivesInvoices: contact.receivesInvoices,
            showOnInvoice: contact.showOnInvoice,
          }
        : EMPTY
    )
  }, [open, contact, reset])

  const receivesInvoices = watch('receivesInvoices')
  const showOnInvoice = watch('showOnInvoice')

  async function onSubmit(values: FormValues) {
    const payload = {
      fullName: values.fullName,
      email: values.email.trim() === '' ? null : values.email.trim(),
      note: values.note.trim() === '' ? null : values.note.trim(),
      receivesInvoices: values.receivesInvoices,
      showOnInvoice: values.showOnInvoice,
    }

    try {
      if (isEdit && contact) {
        await updateContact.mutateAsync({ contactId: contact.id, ...payload })
        showSuccess(`Contact « ${values.fullName} » modifié`)
      } else {
        await createContact.mutateAsync({ clientId, ...payload })
        showSuccess(`Contact « ${values.fullName} » ajouté`)
      }
      onOpenChange(false)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erreur inattendue')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Pas d'overflow sur le DialogContent : le liseré défilerait et couperait
          la pop-up. Le défilement vit dans le formulaire. */}
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le contact' : 'Nouveau contact'}</DialogTitle>
          <DialogDescription>
            Les contacts servent à savoir qui fait quoi chez ce client, et à qui partent les
            factures. Les notes restent privées — le client ne les voit jamais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1">
            <label htmlFor="contact-full-name" className="text-sm font-medium">
              Nom
            </label>
            <Input
              id="contact-full-name"
              placeholder="Ex : Marie Dupont"
              data-testid="contact-full-name"
              {...register('fullName')}
            />
            {errors.fullName && (
              <span className="text-xs text-destructive">{errors.fullName.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="contact-email" className="text-sm font-medium">
              Adresse e-mail
            </label>
            <Input
              id="contact-email"
              type="email"
              placeholder="marie.dupont@exemple.fr"
              data-testid="contact-email"
              {...register('email')}
            />
            <p className="text-xs text-muted-foreground">
              Facultative — un contact joignable seulement par téléphone est légitime. Elle devient
              obligatoire si tu coches l&apos;envoi des factures.
            </p>
            {errors.email && <span className="text-xs text-destructive">{errors.email.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="contact-note" className="text-sm font-medium">
              Note (privée)
            </label>
            <Textarea
              id="contact-note"
              rows={3}
              placeholder="Son statut dans l'entité, ce dont tu veux te souvenir..."
              data-testid="contact-note"
              {...register('note')}
            />
            {errors.note && <span className="text-xs text-destructive">{errors.note.message}</span>}
          </div>

          {/* Les deux cases, séparées et expliquées : leur indépendance est le cœur
              de la demande, pas un détail d'interface. */}
          <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
            <label
              htmlFor="contact-receives-invoices"
              className="flex items-start gap-3 text-sm cursor-pointer"
            >
              <input
                id="contact-receives-invoices"
                type="checkbox"
                data-testid="contact-receives-invoices"
                className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-cyan-500"
                checked={receivesInvoices}
                onChange={(e) => setValue('receivesInvoices', e.target.checked, { shouldValidate: true })}
              />
              <span>
                <span className="font-medium">Envoyer la facture à cette adresse</span>
                <span className="block text-xs text-muted-foreground">
                  Cette adresse recevra les factures, les devis et les relances d&apos;impayés.
                  Plusieurs contacts peuvent être cochés.
                </span>
              </span>
            </label>

            <label
              htmlFor="contact-show-on-invoice"
              className="flex items-start gap-3 text-sm cursor-pointer"
            >
              <input
                id="contact-show-on-invoice"
                type="checkbox"
                data-testid="contact-show-on-invoice"
                className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-cyan-500"
                checked={showOnInvoice}
                onChange={(e) => setValue('showOnInvoice', e.target.checked, { shouldValidate: true })}
              />
              <span>
                <span className="font-medium">Ce nom doit apparaître sur la facture</span>
                <span className="block text-xs text-muted-foreground">
                  Imprime « À l&apos;attention de {watch('fullName').trim() || '…'} » sur le document.
                  Indépendant de la case ci-dessus : tu peux afficher un nom et envoyer à une autre
                  adresse.
                </span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="contact-submit">
              {isSubmitting ? '…' : isEdit ? 'Enregistrer' : 'Ajouter le contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
