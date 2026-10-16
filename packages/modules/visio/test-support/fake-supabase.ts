/**
 * Faux client Supabase pour les tests du module visio.
 *
 * Pourquoi ce fichier plutôt que des `vi.fn()` empilés : les mocks en escalier
 * (`mockLimit` qui rend `mockSingle`…) cassent dès qu'on ajoute une table ou
 * qu'on change `single()` en `maybeSingle()`. On ne teste alors plus le code,
 * on teste la forme du mock. Ici, on déclare ce que la base RÉPOND, et toutes
 * les écritures sont enregistrées pour être vérifiées.
 *
 * Ce fichier n'est importé par aucun code de production (absent d'`index.ts`).
 */

export interface FakeResponse {
  data?: unknown
  error?: { message?: string; code?: string } | null
}

export interface RecordedOperation {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  payload?: unknown
  filters: Array<[string, unknown]>
}

export interface FakeSupabaseOptions {
  /** Réponses par clé `table.op`, ex. `'meetings.select'`. */
  responses?: Record<string, FakeResponse | FakeResponse[]>
  /** Réponse de `storage.from(...).upload()`. */
  upload?: { data?: unknown; error?: { message: string } | null }
  /** Réponse de `storage.from(...).createSignedUrl()`. */
  signedUrl?: { data?: { signedUrl: string } | null; error?: { message: string } | null }
  user?: { id: string } | null
}

class FakeQuery implements PromiseLike<FakeResponse> {
  private op: RecordedOperation['op'] = 'select'
  private payload: unknown
  private filters: Array<[string, unknown]> = []
  private recorded = false

  constructor(
    private readonly table: string,
    private readonly ctx: FakeSupabaseContext
  ) {}

  private record() {
    if (this.recorded) return
    this.recorded = true
    this.ctx.operations.push({
      table: this.table,
      op: this.op,
      payload: this.payload,
      filters: this.filters,
    })
  }

  private resolve(): FakeResponse {
    this.record()
    return this.ctx.next(`${this.table}.${this.op}`)
  }

  select(): this {
    if (this.op === 'select') this.op = 'select'
    return this
  }
  insert(payload: unknown): this {
    this.op = 'insert'
    this.payload = payload
    return this
  }
  update(payload: unknown): this {
    this.op = 'update'
    this.payload = payload
    return this
  }
  delete(): this {
    this.op = 'delete'
    return this
  }
  eq(column: string, value: unknown): this {
    this.filters.push([column, value])
    return this
  }
  is(column: string, value: unknown): this {
    this.filters.push([column, value])
    return this
  }
  order(): this {
    return this
  }
  limit(): this {
    return this
  }
  single(): Promise<FakeResponse> {
    return Promise.resolve(this.resolve())
  }
  maybeSingle(): Promise<FakeResponse> {
    return Promise.resolve(this.resolve())
  }
  then<R1 = FakeResponse, R2 = never>(
    onfulfilled?: ((value: FakeResponse) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected)
  }
}

class FakeSupabaseContext {
  readonly operations: RecordedOperation[] = []
  readonly uploads: Array<{ path: string; size: number; contentType?: string }> = []
  readonly removed: string[][] = []
  private readonly cursors = new Map<string, number>()

  constructor(private readonly options: FakeSupabaseOptions) {}

  next(key: string): FakeResponse {
    const configured = this.options.responses?.[key]
    if (!configured) return { data: null, error: null }
    if (!Array.isArray(configured)) return configured
    const index = this.cursors.get(key) ?? 0
    this.cursors.set(key, index + 1)
    return configured[Math.min(index, configured.length - 1)] ?? { data: null, error: null }
  }
}

export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const ctx = new FakeSupabaseContext(options)

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.user === undefined ? { id: 'op-auth-1' } : options.user },
        error: options.user === null ? { message: 'no session' } : null,
      }),
    },
    from: (table: string) => new FakeQuery(table, ctx),
    storage: {
      from: () => ({
        upload: async (path: string, body: Uint8Array, opts?: { contentType?: string }) => {
          ctx.uploads.push({ path, size: body.byteLength, contentType: opts?.contentType })
          return options.upload ?? { data: { path }, error: null }
        },
        remove: async (paths: string[]) => {
          ctx.removed.push(paths)
          return { data: null, error: null }
        },
        createSignedUrl: async (path: string) =>
          options.signedUrl ?? { data: { signedUrl: `https://signed.test/${path}` }, error: null },
      }),
    },
  }

  return {
    client,
    operations: ctx.operations,
    uploads: ctx.uploads,
    removed: ctx.removed,
    /** Dernière écriture sur une table, pour les assertions. */
    lastWrite(table: string, op: 'insert' | 'update') {
      return [...ctx.operations].reverse().find((o) => o.table === table && o.op === op)
    },
  }
}
