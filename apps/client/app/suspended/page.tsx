import { AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@monprojetpro/ui'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Accès suspendu</CardTitle>
          <CardDescription className="text-base">
            Votre accès a été temporairement suspendu par votre opérateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Vos données sont conservées en toute sécurité. Pour plus d&apos;informations
              ou pour réactiver votre accès, veuillez contacter votre opérateur.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
