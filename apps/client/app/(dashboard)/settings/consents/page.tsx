import { createServerSupabaseClient, getLatestConsents, getConsentHistory } from '@monprojetpro/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@monprojetpro/ui'
import { UpdateIaConsentDialog } from './update-ia-consent-dialog'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Consentements — MonprojetPro',
  description: 'Gérez vos consentements CGU et traitement IA',
}

export default async function ConsentsPage() {
  const supabase = await createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get client_id
  const { data: client } = (await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()) as { data: { id: string } | null }

  if (!client) {
    redirect('/login')
  }

  // Fetch latest consents + full audit history (RGPD)
  const { data: consents } = await getLatestConsents(client.id)
  const { data: history } = await getConsentHistory(client.id)

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function consentTypeLabel(type: string) {
    if (type === 'cgu') return "Conditions Générales d'Utilisation"
    if (type === 'ia_processing') return 'Traitement des données par l\'IA'
    return type
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestion des consentements</h1>
        <p className="text-muted-foreground mt-2">
          Consultez et gérez vos consentements relatifs à l'utilisation de la
          plateforme MonprojetPro.
        </p>
      </div>

      {/* CGU Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conditions Générales d'Utilisation</CardTitle>
              <CardDescription>
                Obligatoire pour utiliser la plateforme
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-success text-success-foreground">
              Acceptées
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Version acceptée</p>
              <p className="font-medium">{consents?.cgu?.version ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date d'acceptation</p>
              <p className="font-medium">
                {consents?.cgu?.created_at
                  ? formatDate(consents.cgu.created_at)
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <a
              href="/legal/cgu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline hover:text-primary/80 transition-colors"
            >
              Consulter les CGU actuelles →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* IA Processing Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Traitement des données par l'IA</CardTitle>
              <CardDescription>
                Optionnel — Active ou désactive l'assistant Élio
              </CardDescription>
            </div>
            <Badge
              variant={consents?.ia?.accepted ? 'default' : 'secondary'}
              className={
                consents?.ia?.accepted
                  ? 'bg-success text-success-foreground'
                  : ''
              }
            >
              {consents?.ia?.accepted ? 'Accepté' : 'Refusé'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              {consents?.ia?.accepted ? (
                <>
                  ✅ Vous avez autorisé Élio à traiter vos données via{' '}
                  <strong>Claude (Anthropic, États-Unis)</strong> pour vous offrir
                  une assistance personnalisée. L'assistant est disponible dans
                  toute la plateforme.
                </>
              ) : (
                <>
                  🔒 <strong>Élio est en veille</strong> : aucune de vos données
                  n'est traitée par l'IA. Vous utilisez la plateforme normalement,
                  sans les fonctionnalités IA. Vous pouvez réactiver Élio à tout
                  moment ci-dessous.
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Version de la politique</p>
              <p className="font-medium">{consents?.ia?.version ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dernière modification</p>
              <p className="font-medium">
                {consents?.ia?.created_at
                  ? formatDate(consents.ia.created_at)
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <a
              href="/legal/ia-processing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline hover:text-primary/80 transition-colors"
            >
              En savoir plus sur la politique IA →
            </a>

            <UpdateIaConsentDialog
              currentConsent={consents?.ia?.accepted ?? false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Historique des consentements (audit RGPD — table INSERT-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Historique de vos consentements</CardTitle>
          <CardDescription>
            Chaque décision est conservée de façon immuable et horodatée,
            conformément au RGPD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history && history.length > 0 ? (
            <ul className="divide-y divide-border">
              {history.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {consentTypeLabel(c.consent_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(c.created_at)} · version {c.version}
                      {c.ip_address && c.ip_address !== 'unknown'
                        ? ` · IP ${c.ip_address}`
                        : ''}
                    </p>
                  </div>
                  <Badge
                    variant={c.accepted ? 'default' : 'secondary'}
                    className={
                      c.accepted
                        ? 'self-start bg-success text-success-foreground sm:self-center'
                        : 'self-start sm:self-center'
                    }
                  >
                    {c.accepted ? 'Accepté' : 'Refusé'}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun consentement enregistré pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Information Footer */}
      <Card className="bg-muted">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Vos droits RGPD :</strong> Vous disposez d'un droit
              d'accès, de rectification, de suppression, de portabilité et
              d'opposition au traitement de vos données personnelles.
            </p>
            <p>
              Vous pouvez télécharger l'ensemble de vos données personnelles
              (portabilité) depuis la page{' '}
              <Link
                href="/settings"
                className="text-primary underline hover:text-primary/80"
              >
                Paramètres → Conformité RGPD
              </Link>
              .
            </p>
            <p>
              Pour exercer votre droit à l'effacement (« droit à l'oubli ») ou
              pour toute question, contactez notre DPO :{' '}
              <a
                href="mailto:dpo@monprojet-pro.com"
                className="text-primary underline hover:text-primary/80"
              >
                dpo@monprojet-pro.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
