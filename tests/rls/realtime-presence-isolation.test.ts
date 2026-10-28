// @vitest-environment node
/**
 * Isolation de la presence Realtime — T-064 (faille C-01, revue CERBERE du 2026-10-27).
 *
 * Avant le correctif, tous les clients d'un operateur partageaient le canal PUBLIC
 * `presence:operator:{operatorId}` : chacun recevait l'identifiant et l'heure de connexion
 * des autres. Ces scenarios prouvent, sur une vraie instance Realtime, que :
 *   - un client ne recoit JAMAIS la presence d'un autre client, meme du meme operateur ;
 *   - un client ne peut pas publier une fausse presence de l'operateur ;
 *   - un abonne PUBLIC au meme sujet ne voit rien des canaux prives (et inversement),
 *     ce qui permet de laisser « Allow public access » active pendant la bascule ;
 *   - un autre operateur ne voit pas les clients qui ne sont pas les siens.
 *
 * Chaque scenario negatif a son temoin positif : on prouve d'abord que la presence circule
 * bien, puis qu'elle n'arrive pas la ou elle ne doit pas arriver.
 *
 * PREREQUIS : Supabase local (`npx supabase start`) et les variables d'environnement de
 * l'instance locale (`npx supabase status -o env`). Sans elles, le fichier est ignore.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const isSupabaseAvailable = SUPABASE_ANON_KEY !== '' && SUPABASE_SERVICE_ROLE_KEY !== ''

// Garde-fou : ce fichier cree des comptes et des clients. Il refuse toute instance non locale.
const isLocalInstance = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(SUPABASE_URL)
if (isSupabaseAvailable && !isLocalInstance) {
  throw new Error(`Test d'isolation Realtime refuse sur une instance non locale : ${SUPABASE_URL}`)
}

const IDS = {
  operatorP: '64000000-0000-4000-8000-000000000001',
  operatorQ: '64000000-0000-4000-8000-000000000002',
  clientP1: '64000000-0000-4000-8000-000000000011',
  clientP2: '64000000-0000-4000-8000-000000000012',
} as const

const EMAILS = {
  operatorP: 'rls-presence-operator-p@monprojetpro.test',
  operatorQ: 'rls-presence-operator-q@monprojetpro.test',
  clientP1: 'rls-presence-client-p1@monprojetpro.test',
  clientP2: 'rls-presence-client-p2@monprojetpro.test',
} as const

const PASSWORD = 'TestPassword123!'
const JOIN_TIMEOUT_MS = 8_000
/** Temps laisse a une presence pour (ne pas) arriver, une fois le temoin positif confirme */
const OBSERVATION_MS = 3_000

const clientTopic = (clientId: string) => `presence:client:${clientId}`
const operatorTopic = (operatorId: string) => `presence:operator:${operatorId}`

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitUntil(predicate: () => boolean, timeoutMs = JOIN_TIMEOUT_MS): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true
    await sleep(100)
  }
  return predicate()
}

interface JoinedChannel {
  channel: RealtimeChannel
  status: string
  trackResult?: string
  keys: () => string[]
}

async function joinPresence(
  supabase: SupabaseClient,
  topic: string,
  options: { private: boolean; trackKey?: string }
): Promise<JoinedChannel> {
  await supabase.realtime.setAuth()

  const channel = supabase.channel(topic, {
    config: options.trackKey
      ? { private: options.private, presence: { key: options.trackKey } }
      : { private: options.private },
  })
  // Une ecoute presence est necessaire pour que le serveur active la presence sur ce canal.
  channel.on('presence', { event: 'sync' }, () => undefined)

  const status = await new Promise<string>((resolve) => {
    const timer = setTimeout(() => resolve('TIMEOUT'), JOIN_TIMEOUT_MS)
    channel.subscribe((state) => {
      if (state === 'SUBSCRIBED' || state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
        clearTimeout(timer)
        resolve(state)
      }
    })
  })

  let trackResult: string | undefined
  if (status === 'SUBSCRIBED' && options.trackKey) {
    trackResult = await channel.track({
      user_id: options.trackKey,
      user_type: 'client',
      online_at: new Date().toISOString(),
    })
  }

  return { channel, status, trackResult, keys: () => Object.keys(channel.presenceState()) }
}

async function signIn(email: string): Promise<SupabaseClient> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`Connexion impossible pour ${email} : ${error.message}`)
  return supabase
}

function anonymous(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Compte de test cree par l'inscription normale (cle publique), comme un vrai utilisateur.
 * L'API d'administration de l'auth n'est pas utilisee : en local, le CLI signe la cle
 * service en HS256 alors que l'auth n'accepte que sa cle ES256 (« signing method HS256 is
 * invalid »). Necessite la confirmation automatique des e-mails, active en local.
 * Si le compte existe deja (relance du test), on s'y connecte simplement.
 */
async function ensureAuthUser(email: string): Promise<string> {
  const supabase = anonymous()
  const { data, error } = await supabase.auth.signUp({ email, password: PASSWORD })
  if (!error && data.user && data.session) return data.user.id

  const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
  if (!signInError && signedIn.user) return signedIn.user.id

  throw new Error(
    `Compte de test ${email} indisponible : inscription (${error?.message ?? 'pas de session, e-mail a confirmer ?'}), ` +
      `connexion (${signInError?.message})`
  )
}

describe.skipIf(!isSupabaseAvailable)('Realtime : isolation de la presence sur canaux prives (T-064)', () => {
  let admin: SupabaseClient
  const opened: SupabaseClient[] = []

  // Connexions de reference, ouvertes une fois pour tous les scenarios
  let operatorP: SupabaseClient
  let clientP1: SupabaseClient
  let operatorSeesP1: JoinedChannel
  let p1SeesOperator: JoinedChannel

  async function keep(client: SupabaseClient) {
    opened.push(client)
    return client
  }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authP = await ensureAuthUser(EMAILS.operatorP)
    const authQ = await ensureAuthUser(EMAILS.operatorQ)
    const authP1 = await ensureAuthUser(EMAILS.clientP1)
    const authP2 = await ensureAuthUser(EMAILS.clientP2)

    const { error: operatorsError } = await admin.from('operators').upsert(
      [
        { id: IDS.operatorP, email: EMAILS.operatorP, name: 'Presence Operateur P', role: 'operator', auth_user_id: authP },
        { id: IDS.operatorQ, email: EMAILS.operatorQ, name: 'Presence Operateur Q', role: 'operator', auth_user_id: authQ },
      ],
      { onConflict: 'id' }
    )
    if (operatorsError) throw new Error(`Seed operators : ${operatorsError.message}`)

    // P1 et P2 appartiennent au MEME operateur : c'est exactement le cas de la fuite C-01.
    const { error: clientsError } = await admin.from('clients').upsert(
      [
        { id: IDS.clientP1, operator_id: IDS.operatorP, email: EMAILS.clientP1, name: 'Presence Client P1', client_type: 'complet', status: 'active', auth_user_id: authP1 },
        { id: IDS.clientP2, operator_id: IDS.operatorP, email: EMAILS.clientP2, name: 'Presence Client P2', client_type: 'complet', status: 'active', auth_user_id: authP2 },
      ],
      { onConflict: 'id' }
    )
    if (clientsError) throw new Error(`Seed clients : ${clientsError.message}`)

    operatorP = await keep(await signIn(EMAILS.operatorP))
    clientP1 = await keep(await signIn(EMAILS.clientP1))

    // P1 publie sa presence sur SON sujet, l'operateur publie sur le sien.
    const p1Own = await joinPresence(clientP1, clientTopic(IDS.clientP1), { private: true, trackKey: IDS.clientP1 })
    expect(p1Own.status).toBe('SUBSCRIBED')
    expect(p1Own.trackResult).toBe('ok')

    const operatorOwn = await joinPresence(operatorP, operatorTopic(IDS.operatorP), { private: true, trackKey: IDS.operatorP })
    expect(operatorOwn.status).toBe('SUBSCRIBED')
    expect(operatorOwn.trackResult).toBe('ok')

    // Temoins positifs : la presence circule bien entre P1 et son operateur.
    operatorSeesP1 = await joinPresence(operatorP, clientTopic(IDS.clientP1), { private: true })
    p1SeesOperator = await joinPresence(clientP1, operatorTopic(IDS.operatorP), { private: true })
  }, 60_000)

  afterAll(async () => {
    for (const client of opened) {
      await client.removeAllChannels()
      await client.auth.signOut().catch(() => undefined)
    }
    if (!admin) return
    const { error: clientsDeleteError } = await admin.from('clients').delete().in('id', [IDS.clientP1, IDS.clientP2])
    if (clientsDeleteError) console.warn(`[nettoyage] clients non supprimes : ${clientsDeleteError.message}`)
    const { error: operatorsDeleteError } = await admin.from('operators').delete().in('id', [IDS.operatorP, IDS.operatorQ])
    if (operatorsDeleteError) console.warn(`[nettoyage] operateurs non supprimes : ${operatorsDeleteError.message}`)

    // Les comptes auth ne se suppriment que par l'API d'administration. Si elle refuse la
    // cle (cas local decrit plus haut), ils restent : ils sont sans droits sans leurs lignes
    // operators / clients, et la prochaine execution s'y reconnecte.
    const { data: list, error: listError } = await admin.auth.admin.listUsers()
    if (listError) {
      console.warn(`[nettoyage] comptes de test conserves (API admin auth refusee) : ${listError.message}`)
      return
    }
    const emails = new Set<string>(Object.values(EMAILS))
    for (const user of list.users) {
      if (user.email && emails.has(user.email)) await admin.auth.admin.deleteUser(user.id)
    }
  }, 30_000)

  it('temoin : l\'operateur voit son client P1 en ligne sur le sujet prive de P1', async () => {
    expect(operatorSeesP1.status).toBe('SUBSCRIBED')
    expect(await waitUntil(() => operatorSeesP1.keys().includes(IDS.clientP1))).toBe(true)
  })

  it('temoin : le client P1 voit son operateur en ligne', async () => {
    expect(p1SeesOperator.status).toBe('SUBSCRIBED')
    expect(await waitUntil(() => p1SeesOperator.keys().includes(IDS.operatorP))).toBe(true)
  })

  it('C-01 : le client P2 (meme operateur) ne recoit JAMAIS la presence du client P1', async () => {
    const clientP2 = await keep(await signIn(EMAILS.clientP2))

    // Ses canaux legitimes : son propre sujet et celui de son operateur.
    const p2Own = await joinPresence(clientP2, clientTopic(IDS.clientP2), { private: true, trackKey: IDS.clientP2 })
    const p2SeesOperator = await joinPresence(clientP2, operatorTopic(IDS.operatorP), { private: true })
    // Tentative directe sur le sujet de P1.
    const p2OnP1 = await joinPresence(clientP2, clientTopic(IDS.clientP1), { private: true })

    // Temoin : les canaux de P2 vivent (il voit bien l'operateur).
    expect(p2Own.status).toBe('SUBSCRIBED')
    expect(await waitUntil(() => p2SeesOperator.keys().includes(IDS.operatorP))).toBe(true)
    expect(await waitUntil(() => operatorSeesP1.keys().includes(IDS.clientP1))).toBe(true)

    await sleep(OBSERVATION_MS)

    const everythingP2Saw = [...p2Own.keys(), ...p2SeesOperator.keys(), ...p2OnP1.keys()]
    expect(everythingP2Saw).not.toContain(IDS.clientP1)
    expect(p2SeesOperator.keys()).toEqual([IDS.operatorP])
  }, 30_000)

  it('C-01 : la jonction de P2 au sujet prive de P1 est refusee par la policy', async () => {
    const clientP2 = await keep(await signIn(EMAILS.clientP2))

    const p2OnP1 = await joinPresence(clientP2, clientTopic(IDS.clientP1), { private: true, trackKey: 'p2-intrus' })

    expect(p2OnP1.status).not.toBe('SUBSCRIBED')
    await sleep(OBSERVATION_MS)
    expect(operatorSeesP1.keys()).not.toContain('p2-intrus')
  }, 30_000)

  it('C-01 : un client ne peut pas publier une fausse presence de l\'operateur', async () => {
    // Connexion distincte de P1 : nouveau socket, nouveau canal.
    const spoofer = await keep(await signIn(EMAILS.clientP1))
    const clientP2 = await keep(await signIn(EMAILS.clientP2))
    const p2SeesOperator = await joinPresence(clientP2, operatorTopic(IDS.operatorP), { private: true })
    expect(await waitUntil(() => p2SeesOperator.keys().includes(IDS.operatorP))).toBe(true)

    const attempt = await joinPresence(spoofer, operatorTopic(IDS.operatorP), { private: true, trackKey: 'faux-mikl' })

    await sleep(OBSERVATION_MS)
    // La preuve est cote observateurs : le retour de track() n'est pas documente en cas de refus.
    expect(attempt.channel.topic).toContain(IDS.operatorP)
    expect(p2SeesOperator.keys()).not.toContain('faux-mikl')
    expect(p1SeesOperator.keys()).not.toContain('faux-mikl')
  }, 30_000)

  it('un abonne PUBLIC au meme sujet ne voit rien des canaux prives, et ne peut rien y injecter', async () => {
    const intruder = await keep(anonymous())

    const publicOnP1 = await joinPresence(intruder, clientTopic(IDS.clientP1), { private: false, trackKey: 'intrus-public' })
    const publicOnOperator = await joinPresence(intruder, operatorTopic(IDS.operatorP), { private: false })

    // « Allow public access » reste active : la jonction publique est acceptee...
    expect(publicOnP1.status).toBe('SUBSCRIBED')
    expect(publicOnOperator.status).toBe('SUBSCRIBED')

    await sleep(OBSERVATION_MS)

    // ... mais elle ne recoit rien des canaux prives de meme nom,
    expect(publicOnP1.keys()).not.toContain(IDS.clientP1)
    expect(publicOnOperator.keys()).not.toContain(IDS.operatorP)
    // et ce qu'elle publie n'atteint pas les abonnes prives.
    expect(operatorSeesP1.keys()).toEqual([IDS.clientP1])
  }, 30_000)

  it('un client anonyme ne peut pas rejoindre un sujet prive', async () => {
    const intruder = await keep(anonymous())

    const privateOnP1 = await joinPresence(intruder, clientTopic(IDS.clientP1), { private: true })

    expect(privateOnP1.status).not.toBe('SUBSCRIBED')
    await sleep(OBSERVATION_MS)
    expect(privateOnP1.keys()).toEqual([])
  }, 30_000)

  it('un autre operateur (Q) ne voit pas la presence d\'un client qui n\'est pas le sien', async () => {
    const operatorQ = await keep(await signIn(EMAILS.operatorQ))

    const qOnP1 = await joinPresence(operatorQ, clientTopic(IDS.clientP1), { private: true })

    expect(qOnP1.status).not.toBe('SUBSCRIBED')
    await sleep(OBSERVATION_MS)
    expect(qOnP1.keys()).not.toContain(IDS.clientP1)
  }, 30_000)
})
