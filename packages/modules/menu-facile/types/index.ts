// ---------------------------------------------------------------------------
// Types du contrat du guichet « admin-api » de MenuFacile.
// Source unique de vérité côté Hub — alignés sur la réponse JSON de l'API.
// ---------------------------------------------------------------------------

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Course = 'entree' | 'plat' | 'dessert' | 'apero'
export type RecipeType = 'complete' | 'simple'
export type MealType = 'lunch' | 'dinner' | 'both'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Budget = 'low' | 'medium' | 'high'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'acted'
export type ContactStatus = 'new' | 'read' | 'resolved'
export type ContactTopic = 'bug' | 'improvement' | 'other'

// --- GET /metrics ----------------------------------------------------------

export interface TopRecipe {
  id: string
  name: string
  copy_count: number
  rating_count: number
}

export interface MenuFacileMetrics {
  generated_at: string
  users: { total: number; new_7d: number; banned: number }
  households: { total: number; official: number; members: number }
  recipes: {
    total: number
    public: number
    official: number
    hidden: number
    new_7d: number
    total_copies: number
  }
  moderation: { reports_pending: number; reports_total: number }
  ratings: { total: number }
  friendships: { total: number }
  top_recipes: TopRecipe[]
  /** Boîte Aide & Contact (v6) — optionnel pour rester rétro-compatible. */
  contact?: { new: number; total: number }
}

// --- GET /metrics/timeseries -----------------------------------------------

/**
 * Un point de la série temporelle (une journée civile). Les champs Priorité 2/3
 * (DAU, temps de session) sont optionnels : le guichet peut ne pas encore les
 * fournir, le cockpit s'adapte et n'affiche la courbe que si la donnée existe.
 */
export interface MenuFacileTimeseriesPoint {
  date: string // YYYY-MM-DD
  new_users: number
  new_recipes: number
  recipe_copies: number
  active_users?: number | null
  avg_session_minutes?: number | null
}

export interface MenuFacileTimeseries {
  range: { from: string; to: string; days: number }
  series: MenuFacileTimeseriesPoint[]
}

// --- GET /households -------------------------------------------------------

/**
 * Statut d'un foyer, dérivé côté guichet :
 * `banned` si tous les membres sont bannis, sinon `dormant` si aucune activité
 * depuis plus de 30 jours, sinon `active`.
 */
export type HouseholdStatus = 'active' | 'dormant' | 'banned'

/** Filtre d'activité de la liste des foyers. */
export type ActivityFilter = 'all' | '7d' | '30d' | 'dormant'

/** Colonnes triables de la liste des foyers. */
export type HouseholdSort =
  | 'last_activity_at'
  | 'created_at'
  | 'name'
  | 'members_count'
  | 'recipes_count'

export type SortOrder = 'asc' | 'desc'

/**
 * Une ligne de la liste des foyers.
 *
 * ⚠️ Convention du guichet : une valeur `null` signifie « non calculable »,
 * jamais « zéro ». Le cockpit affiche « — » sur `null` et le chiffre réel sur 0.
 * Les compteurs sont donc `number | null` et ne doivent JAMAIS être ramenés à 0
 * par un `?? 0` à l'affichage.
 */
export interface HouseholdListItem {
  id: string
  name: string
  created_at: string
  last_activity_at: string | null
  members_count: number | null
  recipes_count: number | null
  planned_meals_count: number | null
  friendships_count: number | null
  is_official: boolean
  status: HouseholdStatus
}

/** Enveloppe paginée renvoyée par le guichet (`{ items, total, limit, offset }`). */
export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

/** Paramètres de `GET /households`. Tous optionnels. */
export interface HouseholdsQuery {
  limit?: number
  offset?: number
  search?: string
  sort?: HouseholdSort
  order?: SortOrder
  activity?: ActivityFilter
  official?: boolean
}

// --- GET /households/:id ---------------------------------------------------

/** Un membre du foyer. `role` distingue le créateur des invités. */
export interface HouseholdMember {
  id: string
  email: string | null
  display_name: string | null
  role: 'owner' | 'member'
  joined_at: string | null
  last_sign_in_at: string | null
  is_banned: boolean
}

/** Une semaine de planning. `week_start` = lundi, format `YYYY-MM-DD`. */
export interface HouseholdPlanning {
  week_start: string
  meals_filled: number | null
  updated_at: string | null
}

/**
 * Fiche complète d'un foyer : les champs de la liste + les blocs de détail.
 * Tous les blocs sont optionnels — le guichet peut ne pas encore les fournir,
 * l'UI masque alors la section au lieu d'afficher une liste vide trompeuse.
 */
export interface HouseholdDetail extends HouseholdListItem {
  members?: HouseholdMember[]
  recent_plannings?: HouseholdPlanning[]
  reports?: {
    emitted?: MenuFacileReport[]
    received?: MenuFacileReport[]
  }
}

// --- GET /users ------------------------------------------------------------

/** Colonnes triables de la liste des utilisateurs. */
export type UserSort = 'last_sign_in_at' | 'created_at' | 'email' | 'recipes_count'

/** Filtre de statut de la liste des utilisateurs. */
export type UserStatusFilter = 'all' | 'active' | 'banned'

/**
 * Une ligne de la liste des utilisateurs.
 *
 * Même convention que les foyers : `null` = « non calculable », jamais « zéro ».
 * `sign_ins_30d` est aujourd'hui `null` côté guichet (l'historique de connexions
 * n'est pas conservé) ; `active_days_30d` le remplace quand il est disponible.
 */
export interface UserListItem {
  id: string
  email: string | null
  display_name: string | null
  household_id: string | null
  household_name: string | null
  created_at: string
  last_sign_in_at: string | null
  is_banned: boolean
  email_verified: boolean | null
  recipes_count: number | null
  sign_ins_30d: number | null
  /** Jours distincts avec au moins une action sur 30 jours (ajout du guichet). */
  active_days_30d?: number | null
}

/** Paramètres de `GET /users`. Tous optionnels. */
export interface UsersQuery {
  limit?: number
  offset?: number
  search?: string
  sort?: UserSort
  order?: SortOrder
  status?: UserStatusFilter
  verified?: boolean
}

// --- GET /contact-messages -------------------------------------------------

export interface ContactMessage {
  id: string
  user_id: string
  household_id: string
  topic: ContactTopic
  message: string
  user_agent: string | null
  created_at: string
  status: ContactStatus
  resolved_at: string | null
  user_email: string | null
  household_name: string | null
}

// --- GET /contact-messages/:id (fil complet, v7) ---------------------------

export interface ContactThreadMessage {
  sender: 'user' | 'admin'
  body: string
  created_at: string
}

export interface ContactThread {
  id: string
  user_id: string
  household_id: string
  topic: ContactTopic
  status: ContactStatus
  created_at: string
  resolved_at: string | null
  user_email: string | null
  household_name: string | null
  messages: ContactThreadMessage[]
}

// --- GET /reports ----------------------------------------------------------

/**
 * Aperçu de la recette signalée, embarqué dans GET /reports (Option B).
 * Tous les champs sont optionnels : le Hub fonctionne même si MenuFacile ne
 * l'envoie pas encore (rétro-compatible).
 */
export interface ReportedRecipePreview {
  id: string
  name?: string
  photo_url?: string | null
  is_public?: boolean
  is_hidden?: boolean
  author_id?: string | null
  author_name?: string | null
}

export interface MenuFacileReport {
  id: string
  recipe_id: string
  reported_by: string
  /** Nom lisible du signaleur (foyer/utilisateur) — optionnel, fallback sur l'UUID. */
  reporter_name?: string | null
  reason: string
  details: string | null
  status: ReportStatus
  resolved_at: string | null
  created_at: string
  /** Aperçu enrichi (Option B) — présent dès que MenuFacile l'expose. */
  recipe?: ReportedRecipePreview | null
}

// --- GET /official-recipes -------------------------------------------------

export interface OfficialRecipeListItem {
  id: string
  name: string
  course: Course
  recipe_type: RecipeType
  meal_type: MealType
  visibility: string
  is_hidden: boolean
  copy_count: number
  rating_count: number
  created_at: string
}

export interface RecipeIngredientInput {
  name: string
  quantity?: number
  unit?: string
  aisle?: string
  position?: number
}

export interface RecipeStepInput {
  text: string
  photo_url?: string
  position?: number
}

/**
 * Détail complet d'une recette officielle, renvoyé par GET /official-recipes/:id.
 * Permet de pré-remplir intégralement le formulaire d'édition. Champs tolérants
 * (null/undefined) pour rester robuste aux variations de la réponse.
 */
export interface OfficialRecipeDetail {
  id: string
  name: string
  seasons?: Season[]
  course?: Course
  recipe_type?: RecipeType
  meal_type?: MealType
  prep_minutes?: number | null
  cook_minutes?: number | null
  rest_minutes?: number | null
  portions?: number | null
  is_vegetarian?: boolean
  is_gluten_free?: boolean
  is_lactose_free?: boolean
  difficulty?: Difficulty | null
  budget?: Budget | null
  photo_url?: string | null
  notes?: string | null
  variants_tips?: string | null
  source_url?: string | null
  is_hidden?: boolean
  visibility?: string
  copy_count?: number
  rating_count?: number
  created_at?: string
  ingredients?: RecipeIngredientInput[]
  steps?: RecipeStepInput[]
}

// --- GET/PUT /home-banner (Encart libre d'accueil) -------------------------

export type BannerTextColor = 'light' | 'dark'

/**
 * Encart libre affiché en tête de l'accueil de l'appli MenuFacile.
 * - AVEC `image_url` → grande bannière (image en fond + voile réglable + texte).
 * - SANS `image_url` → bloc coloré dégradé vert→tangerine (le voile et
 *   `text_color` sont alors ignorés côté appli).
 * Contrat aligné sur le guichet admin-api : GET renvoie l'objet complet,
 * PUT accepte un corps PARTIEL (seuls les champs modifiés).
 */
export interface HomeBanner {
  enabled: boolean
  title: string
  body: string
  image_url: string
  link_url: string
  link_label: string
  /** Intensité du voile 0–100 (défaut 65). N'agit que sur la bannière image. */
  overlay_strength: number
  /** Couleur du texte sur bannière image (défaut « light »). */
  text_color: BannerTextColor
  updated_at?: string
}

/** Corps PUT /home-banner — partiel : uniquement les champs modifiés. */
export type HomeBannerInput = Partial<Omit<HomeBanner, 'updated_at'>>

/** Corps POST /official-recipes (name + seasons requis) et PATCH (tout optionnel). */
export interface OfficialRecipeInput {
  name: string
  seasons: Season[]
  course?: Course
  recipe_type?: RecipeType
  meal_type?: MealType
  prep_minutes?: number
  cook_minutes?: number
  rest_minutes?: number
  portions?: number
  is_vegetarian?: boolean
  is_gluten_free?: boolean
  is_lactose_free?: boolean
  difficulty?: Difficulty
  budget?: Budget
  photo_url?: string
  notes?: string
  variants_tips?: string
  source_url?: string
  ingredients?: RecipeIngredientInput[]
  steps?: RecipeStepInput[]
}
