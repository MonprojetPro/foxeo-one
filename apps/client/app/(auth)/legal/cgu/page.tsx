import { Button } from '@monprojetpro/ui'
import Link from 'next/link'

export const metadata = {
  title: 'Conditions Générales d\'Utilisation — MonprojetPro',
  description: 'Conditions Générales d\'Utilisation de la plateforme MonprojetPro',
}

export default function CguPage() {
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
            <h1 className="text-4xl font-bold">Conditions Générales d'Utilisation</h1>
            <p className="text-muted-foreground">
              Version v1.0 — Dernière mise à jour : 01/02/2026
            </p>
          </div>
        </div>

        {/* Contenu CGU */}
        <div className="space-y-8 rounded-lg border border-border bg-card p-8">
          {/* Section 1: Objet */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">1. Objet</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation de la plateforme MonprojetPro (ci-après « la Plateforme »), proposée par MiKL (ci-après « l'Opérateur »).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              La Plateforme est un outil SaaS B2B destiné aux entrepreneurs, proposant trois dashboards : MonprojetPro Hub (opérateur), MonprojetPro Lab (incubation client), et MonprojetPro One (outil business quotidien).
            </p>
          </section>

          {/* Section 2: Accès et inscription */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">2. Accès et inscription</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'accès à la Plateforme nécessite la création d'un compte utilisateur. L'inscription est soumise à l'acceptation des présentes CGU.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'Utilisateur garantit l'exactitude des informations fournies lors de son inscription et s'engage à les maintenir à jour.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'Utilisateur est seul responsable de la confidentialité de ses identifiants de connexion.
            </p>
          </section>

          {/* Section 3: Utilisation */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">3. Utilisation de la Plateforme</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'Utilisateur s'engage à utiliser la Plateforme conformément à sa destination et aux lois en vigueur.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Sont notamment interdits :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Toute utilisation frauduleuse ou illégale de la Plateforme</li>
              <li>Toute tentative d'accès non autorisé aux systèmes de la Plateforme</li>
              <li>Toute transmission de contenus illicites, offensants ou contraires aux bonnes mœurs</li>
              <li>Toute action susceptible de perturber le fonctionnement de la Plateforme</li>
            </ul>
          </section>

          {/* Section 4: Données personnelles */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">4. Données personnelles</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'Opérateur collecte et traite les données personnelles de l'Utilisateur conformément au Règlement Général sur la Protection des Données (RGPD).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les données collectées incluent : nom, prénom, adresse email, données d'utilisation de la Plateforme, et données de connexion (IP, user-agent).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Ces données sont conservées pendant toute la durée d'utilisation du compte et peuvent être supprimées sur simple demande de l'Utilisateur.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'Utilisateur dispose d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition au traitement de ses données personnelles.
            </p>
          </section>

          {/* Section 5: Propriété intellectuelle */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">5. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'ensemble des éléments de la Plateforme (design, code, contenus, marques) sont la propriété exclusive de l'Opérateur ou de ses partenaires.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Toute reproduction, représentation, modification ou exploitation non autorisée est interdite.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les contenus créés par l'Utilisateur via la Plateforme restent sa propriété exclusive.
            </p>
          </section>

          {/* Section 6: Responsabilités */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">6. Responsabilités</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'Opérateur s'efforce d'assurer la disponibilité et la sécurité de la Plateforme, mais ne peut garantir un fonctionnement sans interruption ni erreur.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'Opérateur ne saurait être tenu responsable des dommages indirects résultant de l'utilisation ou de l'impossibilité d'utiliser la Plateforme.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'Utilisateur est seul responsable de l'utilisation qu'il fait de la Plateforme et des contenus qu'il y publie.
            </p>
          </section>

          {/* Section 7: Résiliation */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">7. Résiliation</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'Utilisateur peut résilier son compte à tout moment depuis les paramètres de son compte.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              L'Opérateur se réserve le droit de suspendre ou de résilier l'accès d'un Utilisateur en cas de violation des présentes CGU.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              En cas de résiliation, les données de l'Utilisateur seront conservées conformément aux obligations légales, puis supprimées.
            </p>
          </section>

          {/* Section 8: Modification des CGU */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">8. Modification des CGU</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'Opérateur se réserve le droit de modifier les présentes CGU à tout moment.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Les Utilisateurs seront notifiés de toute modification substantielle et devront accepter les nouvelles CGU pour continuer à utiliser la Plateforme.
            </p>
          </section>

          {/* Section 9: Droit applicable */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">9. Droit applicable et juridiction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes CGU sont régies par le droit français.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Tout litige relatif à l'interprétation ou à l'exécution des présentes CGU sera soumis à la compétence exclusive des tribunaux français.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-3 border-t border-border pt-6">
            <h2 className="text-2xl font-semibold">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes CGU ou à l'utilisation de la Plateforme, vous pouvez contacter l'Opérateur à l'adresse : contact@monprojet-pro.com
            </p>
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
