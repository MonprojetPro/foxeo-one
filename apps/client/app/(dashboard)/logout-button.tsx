'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { logoutAction } from '../(auth)/actions/auth'

export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      const result = await logoutAction()
      if (!result.error) {
        router.push('/login')
        router.refresh()
      }
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      title="Se déconnecter"
      className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b7280] hover:text-[#f9fafb] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
    >
      <LogOut size={16} />
    </button>
  )
}
