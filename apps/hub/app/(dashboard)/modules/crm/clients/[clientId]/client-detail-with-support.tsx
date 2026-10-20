'use client'

import { ClientDetailContent, type ExtraTab, ClientBrandingTab, ClientLabTabContent, ClientAdminTabContent, ClientCockpitTab, ClientProjectFolderTab, CommunicationProfileForm, useClientCommunicationProfile, ClientLifecycleActions, useClientContacts } from '@monprojetpro/modules-crm'
import { ClientVisioTab, cancelMeeting, rescheduleMeeting, syncMeetingResults, type VisioRecipient } from '@monprojetpro/module-visio'
import { sendMeetLink } from '../../../../../../actions/send-meet-link'
import { resendMeetLink } from '../../../../../../actions/resend-meet-link'
import { getClientVisioBillingDefault, getClientVisioDebt, invoiceVisioDebt } from '../../../../../../actions/visio-billing'
import { ClientSupportTab, useSupportTickets } from '@monprojetpro/modules-support'
import { SubmissionsList, ClientParcoursAgentsList } from '@monprojetpro/module-parcours'
import { ElioConfigSection } from '@monprojetpro/module-elio'
import { LabBillingTab, getClientLabStatus } from '@monprojetpro/modules-facturation'
import { ClientExportButton, ImpersonationButton } from '@monprojetpro/module-admin'
import { ClientEmailTab, getGmailStatus } from '@monprojetpro/modules-email'
import { OperatorOverrideSection } from '@monprojetpro/modules-notifications'
import type { Client } from '@monprojetpro/modules-crm'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gauge, Mail, Headphones, ClipboardList, Bot, Palette, FlaskConical, Settings, Video, FolderCog } from 'lucide-react'

interface ClientDetailWithSupportProps {
  client: Client
}

function CommunicationProfileTabContent({ clientId }: { clientId: string }) {
  const { data: profile, isLoading } = useClientCommunicationProfile(clientId)

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-muted animate-pulse" />
  }

  return <CommunicationProfileForm clientId={clientId} initialProfile={profile} />
}

/**
 * Onglet Visio du dossier client — T-051.
 *
 * Les contacts du carnet (T-039) sont proposés en plus de l'email de la fiche.
 * On NE filtre PAS sur `receivesInvoices` : cette case désigne la comptabilité,
 * pas l'interlocuteur d'une visio. Un contact sans adresse est écarté — il ne
 * pourrait rien recevoir.
 */
function ClientVisioTabContent({ client }: { client: Client }) {
  const { data: contacts, isLoading: contactsLoading } = useClientContacts(client.id)

  // T-055 — l'état RÉEL de Gmail, pour prévenir AVANT l'envoi plutôt qu'après.
  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: async () => {
      const r = await getGmailStatus()
      return r.data ?? null
    },
    staleTime: 2 * 60 * 1000,
  })

  const recipients = useMemo<VisioRecipient[]>(
    () =>
      (contacts ?? [])
        .filter((c): c is typeof c & { email: string } => Boolean(c.email))
        .map((c) => ({ email: c.email, label: `${c.fullName} (${c.email})` })),
    [contacts]
  )

  // T-059 — défaut gratuit/payant selon le profil client (one_plus = gratuit).
  const { data: billingDefault } = useQuery({
    queryKey: ['visio-billing-default', client.id],
    queryFn: async () => {
      const r = await getClientVisioBillingDefault(client.id)
      return r.data ?? { isFree: true }
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <ClientVisioTab
      clientId={client.id}
      clientName={client.name}
      clientEmail={client.email}
      contacts={recipients}
      contactsLoading={contactsLoading}
      mailState={gmailStatus?.state}
      sendMeetLinkAction={sendMeetLink}
      defaultIsFree={billingDefault?.isFree ?? true}
      getVisioDebtAction={getClientVisioDebt}
      invoiceVisioDebtAction={invoiceVisioDebt}
      // ⚠️ Ces trois-là NE SONT PAS OPTIONNELLES EN PRATIQUE : sans elles, les
      // boutons Renvoyer / Déplacer / Annuler ne s'affichent pas — et le build
      // reste vert, puisque les props sont facultatives. Exactement le piège
      // des deux surfaces (T-051).
      onResend={resendMeetLink}
      onCancel={cancelMeeting}
      onReschedule={rescheduleMeeting}
      onSyncResults={syncMeetingResults}
    />
  )
}

export function ClientDetailWithSupport({ client }: ClientDetailWithSupportProps) {
  const { data: labStatus } = useQuery({
    queryKey: ['billing', 'lab-status', client.id],
    queryFn: async () => {
      const result = await getClientLabStatus(client.id)
      if (result.error) return null
      return result.data
    },
    staleTime: 5 * 60 * 1_000,
  })

  const labActive = labStatus?.dashboardActivated ?? false

  // Compteur de tickets support ouverts pour le bloc « À traiter » du cockpit.
  const { data: supportTickets } = useSupportTickets({ clientId: client.id })
  const supportOpenCount = (supportTickets ?? []).filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  ).length

  const extraTabs: ExtraTab[] = useMemo(
    () => [
      {
        value: 'pilote',
        label: 'Pilote',
        icon: Gauge, color: '#22d3ee',
        content: <ClientCockpitTab clientId={client.id} supportOpenCount={supportOpenCount} />,
      },
      {
        value: 'visio',
        label: 'Visio',
        icon: Video, color: '#2dd4bf',
        content: <ClientVisioTabContent client={client} />,
      },
      {
        value: 'projet',
        label: 'Projet',
        icon: FolderCog, color: '#818cf8',
        content: <ClientProjectFolderTab clientId={client.id} />,
      },
      {
        value: 'emails',
        label: 'Emails',
        icon: Mail, color: '#60a5fa',
        content: (
          <ClientEmailTab
            clientId={client.id}
            clientEmail={client.email}
            returnTo={`/modules/crm/clients/${client.id}`}
          />
        ),
      },
      {
        value: 'support',
        label: 'Support',
        icon: Headphones, color: '#a78bfa',
        content: <ClientSupportTab clientId={client.id} />,
      },
      {
        value: 'submissions',
        label: 'Soumissions',
        icon: ClipboardList, color: '#34d399',
        content: <SubmissionsList clientId={client.id} />,
      },
      {
        value: 'elio-config',
        label: 'Élio',
        icon: Bot, color: '#f59e0b',
        content: (
          <ElioConfigSection
            clientId={client.id}
            communicationProfileSlot={
              <CommunicationProfileTabContent clientId={client.id} />
            }
          />
        ),
      },
      {
        value: 'branding',
        label: 'Branding',
        icon: Palette, color: '#ec4899',
        content: <ClientBrandingTab clientId={client.id} clientCompanyName={client.company} />,
      },
      {
        value: 'lab-billing',
        label: 'Lab',
        icon: FlaskConical, color: '#22d3ee',
        content: (
          <ClientLabTabContent
            clientId={client.id}
            billingStatus={
              labStatus
                ? { invoiceSent: labStatus.invoiceSent, labPaid: labStatus.labPaid }
                : undefined
            }
            billingSlot={<LabBillingTab clientId={client.id} clientName={client.name} />}
            elioConfigSlot={<ClientParcoursAgentsList clientId={client.id} />}
          />
        ),
      },
      {
        value: 'administration',
        label: 'Paramètres',
        icon: Settings, color: '#94a3b8',
        content: (
          <div className="space-y-6">
            <ClientAdminTabContent clientId={client.id} />
            <div className="space-y-6 p-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cycle de vie</h3>
                <div className="flex flex-wrap gap-2">
                  <ClientLifecycleActions client={client} />
                </div>
              </div>
              <OperatorOverrideSection clientId={client.id} />
            </div>
          </div>
        ),
      },
    ],
    [client.id, client.company, client.name, client.email, labStatus, supportOpenCount]
  )

  return (
    <ClientDetailContent
      client={client}
      extraTabs={extraTabs}
      dashboardType={client.config?.dashboardType}
      hasActiveParcours={labActive}
      headerActionsSlot={
        client.status === 'active'
          ? <ImpersonationButton clientId={client.id} clientName={client.name} />
          : undefined
      }
    />
  )
}
