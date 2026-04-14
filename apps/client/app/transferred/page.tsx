import { PackageCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@monprojetpro/ui'

export default function TransferredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <PackageCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl">Votre instance a été transférée</CardTitle>
          <CardDescription className="text-base">
            Félicitations — vous êtes maintenant propriétaire complet de votre instance MonprojetPro One.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-medium">Consultez votre email pour :</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Le package de transfert (code source + base de données)</li>
              <li>• La documentation de vos modules actifs</li>
              <li>• Le Guide d&apos;autonomie avec les instructions de déploiement</li>
            </ul>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Pour toute question ou assistance technique, contactez notre équipe :
            </p>
            <a
              href="mailto:support@monprojet-pro.com"
              className="text-sm font-medium text-primary hover:underline mt-1 block"
            >
              support@monprojet-pro.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
