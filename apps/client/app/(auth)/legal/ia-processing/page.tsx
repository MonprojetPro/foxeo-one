import { Button } from '@monprojetpro/ui'
import Link from 'next/link'

export const metadata = {
  title: 'Politique de Traitement IA — MonprojetPro',
  description: 'Politique de traitement des données par l\'intelligence artificielle Élio',
}

export default function IaProcessingPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link href="/login">
            <Button variant="outline" size="sm">
              ← Retour à la connexion
            </Button>
          </Link>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Politique de Traitement par Intelligence Artificielle</h1>
            <p className="text-muted-foreground">
              Version v1.0 — Dernière mise à jour : 01/02/2026
            </p>
          </div>
        </div>

        {/* Contenu Politique IA */}
        <div className="space-y-8 rounded-lg border border-border bg-card p-8">
          {/* Section 1: Qu'est-ce qu'Élio ? */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">1. Qu'est-ce qu'Élio ?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Élio est un agent d'intelligence artificielle conversationnel intégré à la plateforme MonprojetPro. Il vous accompagne dans votre parcours entrepreneurial en vous aidant à :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Élaborer vos briefs et documents stratégiques</li>
              <li>Naviguer dans la plateforme et ses fonctionnalités</li>
              <li>Obtenir des réponses à vos questions</li>
              <li>Générer du contenu adapté à votre profil de communication</li>
            </ul>
          </section>

          {/* Section 2: Données traitées */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">2. Quelles données sont traitées par Élio ?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Lorsque vous acceptez le traitement par intelligence artificielle, Élio a accès aux données suivantes :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Messages de conversation :</strong> Tous les échanges que vous avez avec Élio</li>
              <li><strong>Documents partagés :</strong> Les documents que vous choisissez de partager dans le contexte d'une conversation</li>
              <li><strong>Profil de communication :</strong> Vos préférences de ton, de style et de niveau de détail des réponses</li>
              <li><strong>Métadonnées :</strong> Date, heure et contexte des interactions</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Important :</strong> Élio n'a PAS accès à vos identifiants de connexion, vos données bancaires, ni aux conversations avec l'opérateur MiKL (sauf si explicitement partagées).
            </p>
          </section>

          {/* Section 3: Stockage */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">3. Où sont stockées vos données ?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vos données sont stockées de manière sécurisée sur les serveurs de Supabase, hébergés en Europe (conformité RGPD).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Lorsque vous interagissez avec Élio, vos messages sont transmis à notre fournisseur d'intelligence artificielle (DeepSeek) pour génération de réponses. Ces données sont traitées de manière confidentielle et ne sont pas utilisées pour entraîner des modèles publics.
            </p>
            <div className="rounded-md bg-muted p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note technique :</strong> Les conversations avec Élio sont chiffrées en transit (HTTPS) et au repos (AES-256).
              </p>
            </div>
          </section>

          {/* Section 4: Durée de conservation */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">4. Durée de conservation des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vos données de conversation avec Élio sont conservées aussi longtemps que votre compte est actif.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Vous pouvez à tout moment :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Supprimer des conversations individuelles</li>
              <li>Effacer l'historique complet</li>
              <li>Révoquer votre consentement au traitement IA (désactivation d'Élio)</li>
              <li>Demander l'export de vos données (portabilité RGPD)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              En cas de suppression de votre compte, toutes vos données de conversation sont définitivement supprimées dans un délai maximum de 30 jours.
            </p>
          </section>

          {/* Section 5: Droit de révocation */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">5. Droit de révocation du consentement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vous pouvez révoquer votre consentement au traitement par intelligence artificielle à tout moment depuis vos paramètres de compte.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Navigation :</strong> Paramètres → Consentements → Modifier mon consentement IA
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La révocation du consentement entraîne la désactivation immédiate d'Élio pour votre compte. Vous pourrez toujours réactiver Élio ultérieurement en acceptant à nouveau le traitement IA.
            </p>
          </section>

          {/* Section 6: Impact de la désactivation */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">6. Impact de la désactivation d'Élio</h2>
            <p className="text-muted-foreground leading-relaxed">
              Si vous choisissez de refuser ou de révoquer votre consentement au traitement IA, les conséquences sont les suivantes :
            </p>
            <div className="grid gap-4 mt-4">
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
                <h3 className="font-semibold text-destructive mb-2">❌ Fonctionnalités désactivées</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                  <li>Chat avec Élio</li>
                  <li>Génération automatique de briefs</li>
                  <li>Suggestions personnalisées</li>
                  <li>Assistance contextuelle dans les modules</li>
                </ul>
              </div>

              <div className="rounded-md bg-success/10 border border-success/20 p-4">
                <h3 className="font-semibold text-success mb-2">✅ Fonctionnalités toujours accessibles</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                  <li>Accès complet au dashboard</li>
                  <li>Gestion de documents</li>
                  <li>Communication avec MiKL</li>
                  <li>Toutes les fonctionnalités de la plateforme (hors IA)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 7: Sécurité et conformité */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">7. Sécurité et conformité</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le traitement de vos données par Élio est conforme au Règlement Général sur la Protection des Données (RGPD) et aux législations françaises en vigueur.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Accès non autorisés</li>
              <li>Perte ou destruction accidentelle</li>
              <li>Altération ou divulgation non autorisée</li>
            </ul>
          </section>

          {/* Section 8: Vos droits */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">8. Vos droits RGPD</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conformément au RGPD, vous disposez des droits suivants concernant vos données traitées par Élio :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> Corriger des données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> Supprimer vos données (« droit à l'oubli »)</li>
              <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
              <li><strong>Droit de limitation :</strong> Limiter le traitement dans certaines conditions</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à : dpo@monprojet-pro.com
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-3 border-t border-border pt-6">
            <h2 className="text-2xl font-semibold">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative au traitement de vos données par intelligence artificielle, contactez notre Délégué à la Protection des Données (DPO) :
            </p>
            <ul className="list-none space-y-1 text-muted-foreground ml-4">
              <li><strong>Email :</strong> dpo@monprojet-pro.com</li>
              <li><strong>Courrier :</strong> MonprojetPro — Service DPO, [Adresse à compléter]</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-center">
          <Link href="/login">
            <Button>
              Retour à la connexion
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
