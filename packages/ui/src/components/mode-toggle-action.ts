'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { MODE_TOGGLE_COOKIE } from './mode-toggle-constants'

/**
 * Server Action — pose le cookie `mpp_active_view` côté serveur et invalide le
 * cache RSC du layout. Le client fait ensuite un full reload vers `/` pour que
 * la requête HTTP envoie le cookie fraîchement posé au serveur (contournement
 * d'une race condition où le RSC fetch qui suit un Server Action redirect ne
 * voyait pas le nouveau cookie).
 */
export async function setActiveViewMode(mode: 'lab' | 'one'): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(MODE_TOGGLE_COOKIE, mode, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  })
  revalidatePath('/', 'layout')
}
