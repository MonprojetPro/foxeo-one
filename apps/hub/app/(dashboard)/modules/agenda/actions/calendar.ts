'use server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

export interface GoogleAccount {
  label: string
  color: string
  email?: string
}

export interface IcalFeed {
  label: string
  color: string
  url: string
}

export interface CalendarStatus {
  googleAccounts: GoogleAccount[]
  calcom: boolean
  calcomUrl?: string
  icalFeeds: IcalFeed[]
}

export interface ExternalCalendarEvent {
  id: string
  title: string
  subtitle?: string
  startTime: string
  endTime: string
  source: 'google' | 'calcom' | 'ical'
  customColor?: string
  attendeeName?: string
}

// --- Status ---

export async function getCalendarStatus(): Promise<{ data: CalendarStatus | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { data: null, error: 'Non authentifié' }

    const { data: integrations } = await supabase
      .from('calendar_integrations')
      .select('provider, connected, label, color, metadata')
      .eq('user_id', user.id)
      .eq('connected', true)

    const googleAccounts: GoogleAccount[] = (integrations ?? [])
      .filter(i => i.provider === 'google')
      .map(i => ({
        label: i.label ?? 'Google',
        color: i.color ?? '#06b6d4',
        email: (i.metadata as { email?: string })?.email,
      }))

    const calcomRow = integrations?.find(i => i.provider === 'calcom')

    const icalFeeds: IcalFeed[] = (integrations ?? [])
      .filter(i => i.provider === 'ical')
      .map(i => ({
        label: i.label ?? 'iCal',
        color: i.color ?? '#a855f7',
        url: (i.metadata as { url?: string })?.url ?? '',
      }))

    return {
      data: {
        googleAccounts,
        calcom: !!calcomRow,
        calcomUrl: (calcomRow?.metadata as { url?: string })?.url,
        icalFeeds,
      },
      error: null,
    }
  } catch (err) {
    console.error('[CALENDAR:STATUS]', err)
    return { data: null, error: 'Erreur inattendue' }
  }
}

// --- Google Calendar events ---

interface GoogleEvent {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

async function refreshGoogleTokenIfNeeded(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  label: string,
  integration: { access_token: string | null; refresh_token: string | null; token_expires_at: string | null }
): Promise<string | null> {
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null
  const needsRefresh = !expiresAt || expiresAt < new Date(Date.now() + 60_000)
  if (!needsRefresh) return integration.access_token

  if (!integration.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) return null
  const tokens = await res.json()
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('calendar_integrations')
    .update({ access_token: tokens.access_token, token_expires_at: newExpiry })
    .eq('user_id', userId)
    .eq('provider', 'google')
    .eq('label', label)

  return tokens.access_token as string
}

async function fetchEventsForAccount(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  account: GoogleAccount,
  from: string,
  to: string
): Promise<{ events: ExternalCalendarEvent[]; error: string | null }> {
  const { data: integration } = await supabase
    .from('calendar_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .eq('label', account.label)
    .eq('connected', true)
    .maybeSingle()

  if (!integration) return { events: [], error: null }

  const accessToken = await refreshGoogleTokenIfNeeded(supabase, userId, account.label, integration)
  if (!accessToken) return { events: [], error: `Token expiré pour "${account.label}" — reconnectez votre compte Google` }

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', from)
  url.searchParams.set('timeMax', to)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '50')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[CALENDAR:GOOGLE:${account.label}] API error ${res.status}:`, body)
    if (res.status === 403) return { events: [], error: `Permissions insuffisantes pour "${account.label}" — déconnectez puis reconnectez ce compte pour autoriser l'accès au calendrier` }
    if (res.status === 401) return { events: [], error: `Session expirée pour "${account.label}" — reconnectez votre compte Google` }
    return { events: [], error: `Erreur Google Calendar ${res.status} pour "${account.label}"` }
  }

  const json = await res.json()
  return {
    events: (json.items as GoogleEvent[])
      .filter(e => e.start.dateTime || e.start.date)
      .map(e => ({
        id: `google-${account.label}-${e.id}`,
        title: e.summary ?? 'Sans titre',
        startTime: e.start.dateTime ?? `${e.start.date}T00:00:00`,
        endTime: e.end.dateTime ?? `${e.end.date}T00:00:00`,
        source: 'google' as const,
        customColor: account.color,
      })),
    error: null,
  }
}

export async function getGoogleCalendarEvents(
  from: string,
  to: string,
  accounts: GoogleAccount[]
): Promise<{ data: ExternalCalendarEvent[]; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { data: [], error: 'Non authentifié' }

    const results = await Promise.all(
      accounts.map(account => fetchEventsForAccount(supabase, user.id, account, from, to))
    )

    const firstError = results.find(r => r.error)?.error ?? null
    return { data: results.flatMap(r => r.events), error: firstError }
  } catch (err) {
    console.error('[CALENDAR:GOOGLE]', err)
    return { data: [], error: 'Erreur inattendue lors du chargement des événements Google' }
  }
}

// --- Cal.com bookings ---

export async function getCalcomBookings(
  from: string,
  to: string
): Promise<{ data: ExternalCalendarEvent[]; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { data: [], error: 'Non authentifié' }

    const { data: bookings } = await supabase
      .from('calcom_bookings')
      .select('calcom_booking_id, title, start_time, end_time, attendee_name, status')
      .gte('start_time', from)
      .lte('start_time', to)
      .in('status', ['confirmed', 'rescheduled'])
      .order('start_time')

    if (!bookings) return { data: [], error: null }

    return {
      data: bookings.map(b => ({
        id: `calcom-${b.calcom_booking_id}`,
        title: b.title,
        subtitle: b.attendee_name ?? undefined,
        startTime: b.start_time,
        endTime: b.end_time,
        source: 'calcom' as const,
        attendeeName: b.attendee_name ?? undefined,
      })),
      error: null,
    }
  } catch (err) {
    console.error('[CALENDAR:CALCOM]', err)
    return { data: [], error: 'Erreur inattendue' }
  }
}

// --- Création d'un événement Google Calendar ---

export interface CreateGoogleEventInput {
  label: string        // compte Google (label dans calendar_integrations)
  title: string
  date: string         // YYYY-MM-DD
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  timeZone?: string    // ex: 'Europe/Paris' — défaut si absent
}

export async function createGoogleCalendarEvent(
  input: CreateGoogleEventInput
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { data: null, error: 'Non authentifié' }

    const { data: integration } = await supabase
      .from('calendar_integrations')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('label', input.label)
      .eq('connected', true)
      .maybeSingle()

    if (!integration) return { data: null, error: 'Compte Google non trouvé' }

    const accessToken = await refreshGoogleTokenIfNeeded(supabase, user.id, input.label, integration)
    if (!accessToken) return { data: null, error: 'Token expiré — reconnectez ce compte Google' }

    const pad = (n: number) => String(n).padStart(2, '0')
    const startDateTime = `${input.date}T${pad(input.startHour)}:${pad(input.startMinute)}:00`
    const endDateTime = `${input.date}T${pad(input.endHour)}:${pad(input.endMinute)}:00`
    const timeZone = input.timeZone ?? 'Europe/Paris'

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.title,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[CALENDAR:CREATE]', res.status, body)
      if (res.status === 403) return { data: null, error: 'Permissions insuffisantes — reconnectez votre compte Google pour autoriser la création d\'événements' }
      return { data: null, error: `Erreur Google Calendar ${res.status}` }
    }

    const json = await res.json()
    return { data: { id: json.id }, error: null }
  } catch (err) {
    console.error('[CALENDAR:CREATE]', err)
    return { data: null, error: 'Erreur inattendue' }
  }
}

// --- Modification événement Google ---

export interface UpdateGoogleEventInput extends CreateGoogleEventInput {
  eventId: string
}

export async function updateGoogleCalendarEvent(
  input: UpdateGoogleEventInput
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { data: null, error: 'Non authentifié' }

    const { data: integration } = await supabase
      .from('calendar_integrations')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('label', input.label)
      .eq('connected', true)
      .maybeSingle()

    if (!integration) return { data: null, error: 'Compte Google non trouvé' }

    const accessToken = await refreshGoogleTokenIfNeeded(supabase, user.id, input.label, integration)
    if (!accessToken) return { data: null, error: 'Token expiré — reconnectez ce compte Google' }

    const pad = (n: number) => String(n).padStart(2, '0')
    const startDateTime = `${input.date}T${pad(input.startHour)}:${pad(input.startMinute)}:00`
    const endDateTime = `${input.date}T${pad(input.endHour)}:${pad(input.endMinute)}:00`
    const timeZone = input.timeZone ?? 'Europe/Paris'

    // Extraire le vrai ID Google (format stocké : "google-${label}-${googleId}")
    const prefix = `google-${input.label}-`
    const realEventId = input.eventId.startsWith(prefix) ? input.eventId.slice(prefix.length) : input.eventId

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${realEventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.title,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[CALENDAR:UPDATE]', res.status, body)
      return { data: null, error: `Erreur Google Calendar ${res.status}` }
    }

    const json = await res.json()
    return { data: { id: json.id }, error: null }
  } catch (err) {
    console.error('[CALENDAR:UPDATE]', err)
    return { data: null, error: 'Erreur inattendue' }
  }
}

// --- Suppression événement Google ---

export async function deleteGoogleCalendarEvent(
  eventId: string,
  label: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Non authentifié' }

    const { data: integration } = await supabase
      .from('calendar_integrations')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('label', label)
      .eq('connected', true)
      .maybeSingle()

    if (!integration) return { error: 'Compte Google non trouvé' }

    const accessToken = await refreshGoogleTokenIfNeeded(supabase, user.id, label, integration)
    if (!accessToken) return { error: 'Token expiré — reconnectez ce compte Google' }

    // Extraire le vrai ID Google (format stocké : "google-${label}-${googleId}")
    const prefix = `google-${label}-`
    const realEventId = eventId.startsWith(prefix) ? eventId.slice(prefix.length) : eventId

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${realEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok && res.status !== 410) {
      return { error: `Erreur Google Calendar ${res.status}` }
    }

    return { error: null }
  } catch (err) {
    console.error('[CALENDAR:DELETE]', err)
    return { error: 'Erreur inattendue' }
  }
}

// --- iCal ---

/** Parse une date iCal (YYYYMMDD ou YYYYMMDDTHHmmssZ ou YYYYMMDDTHHmmss) */
function parseIcsDate(value: string): Date {
  const v = value.replace(/[TZ]/g, ' ').trim().replace(' ', 'T')
  if (v.length === 8) {
    // All-day YYYYMMDD
    return new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T00:00:00`)
  }
  // YYYYMMDDTHHmmss → ISO
  return new Date(
    `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T${v.slice(9, 11)}:${v.slice(11, 13)}:${v.slice(13, 15)}${value.endsWith('Z') ? 'Z' : ''}`
  )
}

interface IcsEvent { id: string; title: string; start: Date; end: Date }

function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = []
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // Unfold continuation lines
    .replace(/\n[ \t]/g, '')
    .split('\n')

  let current: Partial<IcsEvent> | null = null
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { current = {}; continue }
    if (line === 'END:VEVENT') {
      if (current?.id && current.title && current.start && current.end) {
        events.push(current as IcsEvent)
      }
      current = null
      continue
    }
    if (!current) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).split(';')[0].toUpperCase()
    const val = line.slice(colonIdx + 1).trim()

    if (key === 'UID') current.id = val
    else if (key === 'SUMMARY') current.title = val || 'Sans titre'
    else if (key === 'DTSTART') {
      try { current.start = parseIcsDate(val) } catch { /* ignore */ }
    } else if (key === 'DTEND') {
      try { current.end = parseIcsDate(val) } catch { /* ignore */ }
    }
  }
  return events
}

export async function connectIcal(
  url: string,
  label: string,
  color: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Non authentifié' }

    // Valider que l'URL est accessible
    const normalized = url.replace(/^webcal:\/\//i, 'https://')
    const test = await fetch(normalized, { method: 'HEAD' }).catch(() => null)
    if (!test?.ok) {
      // HEAD peut échouer sur certains serveurs, on tente GET
      const test2 = await fetch(normalized).catch(() => null)
      if (!test2?.ok) return { error: 'URL inaccessible — vérifie que le lien est correct et public' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('calendar_integrations')
      .upsert({
        user_id: user.id,
        provider: 'ical',
        label,
        color,
        connected: true,
        metadata: { url: normalized },
      }, { onConflict: 'user_id,provider,label' })

    return { error: null }
  } catch (err) {
    console.error('[CALENDAR:ICAL:CONNECT]', err)
    return { error: 'Erreur inattendue' }
  }
}

export async function getIcalEvents(
  from: string,
  to: string,
  feeds: IcalFeed[]
): Promise<{ data: ExternalCalendarEvent[]; error: string | null }> {
  if (feeds.length === 0) return { data: [], error: null }

  const fromDate = new Date(from)
  const toDate = new Date(to)
  const results: ExternalCalendarEvent[] = []

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, { next: { revalidate: 300 } })
      if (!res.ok) continue
      const text = await res.text()
      const events = parseIcs(text)

      for (const e of events) {
        if (e.end < fromDate || e.start > toDate) continue
        results.push({
          id: `ical-${feed.label}-${e.id}`,
          title: e.title,
          startTime: e.start.toISOString(),
          endTime: e.end.toISOString(),
          source: 'ical',
          customColor: feed.color,
        })
      }
    } catch (err) {
      console.error(`[CALENDAR:ICAL:FETCH] ${feed.label}`, err)
    }
  }

  return { data: results, error: null }
}

// --- Déconnexion ---

export async function disconnectCalendar(
  provider: 'google' | 'calcom' | 'ical',
  label?: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { data: false, error: 'Non authentifié' }

    let query = supabase
      .from('calendar_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (label) query = query.eq('label', label)

    const { error } = await query
    if (error) return { data: false, error: error.message }
    return { data: true, error: null }
  } catch (err) {
    console.error('[CALENDAR:DISCONNECT]', err)
    return { data: false, error: 'Erreur inattendue' }
  }
}

// --- Connexion Cal.com ---

export async function connectCalcom(
  url: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { data: false, error: 'Non authentifié' }

    const { error } = await supabase
      .from('calendar_integrations')
      .upsert({
        user_id: user.id,
        provider: 'calcom',
        label: 'default',
        color: '#a855f7',
        connected: true,
        metadata: { url },
      }, { onConflict: 'user_id,provider,label' })

    if (error) return { data: false, error: error.message }
    return { data: true, error: null }
  } catch (err) {
    console.error('[CALENDAR:CALCOM:CONNECT]', err)
    return { data: false, error: 'Erreur inattendue' }
  }
}
