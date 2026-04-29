'use server'

import { cookies } from 'next/headers'
import { MODE_TOGGLE_COOKIE } from './mode-toggle-constants'

// Pas de revalidatePath — le window.location.replace('/') côté client fait un
// full reload qui envoie le nouveau cookie au serveur. revalidatePath déclenchait
// une re-render RSC background en race avec le reload → crash client-side 1 sec.
export async function setActiveViewMode(mode: 'lab' | 'one'): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(MODE_TOGGLE_COOKIE, mode, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  })
}
