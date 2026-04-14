import { createServerSupabaseClient, getLatestConsents } from '@monprojetpro/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@monprojetpro/ui'
import { UpdateIaConsentDialog } from './update-ia-consent-dialog'
import { redirect } from 'next/navigation'

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

  // Fetch latest consents
  const { data: consents } = await getLatestConsents(client.id)

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
                  ✅ Vous avez autorisé Élio à traiter vos données pour vous
                  offrir une assistance personnalisée. L'assistant IA est
                  disponible dans toute la plateforme.
                </>
              ) : (
                <>
                  ⚠️ Vous avez refusé le traitement IA. L'assistant Élio est
                  désactivé. Vous pouvez utiliser la plateforme normalement sans
                  les fonctionnalités IA.
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
              Pour toute question ou pour exercer vos droits, contactez notre
              DPO :{' '}
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
