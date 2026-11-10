import Link from 'next/link'
import { AuthCard } from '@monprojetpro/ui'
import { SignupForm } from './signup-form'

// T-079 — harmonisé sur AuthCard, cf. /login et /reset-password.
export default function SignupPage() {
  return (
    <AuthCard
      title="MonprojetPro"
      description="Créer votre compte"
      footer={
        <p className="text-sm text-gray-400">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-white underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthCard>
  )
}
