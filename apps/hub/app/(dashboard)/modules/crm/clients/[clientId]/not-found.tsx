import { Button } from '@monprojetpro/ui'
import Link from 'next/link'

export default function ClientNotFound() {
  return (
    <div className="container mx-auto py-12">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <h1 className="text-4xl font-bold">Client introuvable</h1>
        <p className="text-muted-foreground max-w-md">
          Le client que vous recherchez n'existe pas ou vous n'avez pas les permissions pour y accéder.
        </p>
        <Button asChild>
          <Link href="/modules/crm">
            Retour à la liste des clients
          </Link>
        </Button>
      </div>
    </div>
  )
}
