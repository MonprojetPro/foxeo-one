// TEMPORARY: Dev-only login route — remove before production
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'mikl@monprojet-pro.com',
    password: 'MonprojetPro2026!',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/', 'http://localhost:3002'))
}
