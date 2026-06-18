// Harnais QA — fait dialoguer un CLIENT simulé (piégeur) avec chaque vrai agent Élio,
// via la vraie Edge Function elio-chat, en assemblant le prompt EXACTEMENT comme en prod
// (COACH_GUARDRAILS + system_prompt de l'agent + STEP_SUBMISSION_INVITATION).
// Écrit un transcript Markdown par agent dans scripts/elio-qa/transcripts/.
//
// Usage : node scripts/elio-qa/run.mjs

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AGENTS_DIR = join(__dirname, '..', '..', 'packages', 'modules', 'elio', 'agents', 'lab')
const OUT_DIR = join(__dirname, 'transcripts')

const ELIO_CHAT_URL = 'https://mpgpwcpeqfwknohhqdmd.supabase.co/functions/v1/elio-chat'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ3B3Y3BlcWZ3a25vaGhxZG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTY2NTEsImV4cCI6MjA4ODczMjY1MX0.s1qgsw_duwUyiajUnNu09uaYF3Wm0fAbg8wPzC24n_k'
const TURNS = 8
const CLIENT_MODEL = 'claude-haiku-4-5-20251001'

// === Strings de prod (copie EXACTE de step-elio-chat.tsx) ===
const COACH_GUARDRAILS = `=== POSTURE DE COACH (règles permanentes, prioritaires) ===
- AVANT de répondre ou de poser une question, RELIS toute la conversation. Repère ce que le client a DÉJÀ dit et ne le redemande jamais. Reprends ses mots et ses chiffres EXACTS ; s'il vient de répondre, tiens-en compte immédiatement (ne demande pas « par rapport à quoi ? » sur une réponse qui répond à TA propre question précédente).
- INTERDICTION DE REPORTER. Quand le client soulève une idée, une préoccupation ou une piste (ex : échantillons, taille du marché, un canal de vente, une remise), tu la TRAITES MAINTENANT, dans la foulée, dès qu'elle touche de près ou de loin à l'objectif de l'étape. Tu ne dis JAMAIS « on y reviendra plus tard », « on creusera ça séparément », « dans une prochaine étape », « garde ça en tête pour la suite ». Si une idée est vraiment hors-sujet, tu l'intègres quand même en UNE phrase utile ou tu fais le lien avec l'étape — jamais un simple renvoi à plus tard.
- CHALLENGE AVANT DE VALIDER. Tu n'es PAS un béni-oui-oui. Devant une décision risquée, une affirmation floue ou une hypothèse non vérifiée (quitter un emploi, une cible « tout le monde » / trop large, un chiffre sorti de nulle part, un signal social faible type « ma mère adore »), tu CREUSES au moins une fois avec une question concrète AVANT de valider ou d'encourager. Valider sans challenger une décision importante est une faute. Tu restes tactful et bienveillant, mais tu fais réfléchir et tu proposes d'autres angles.
- VA AU BOUT DU CALCUL. Si l'étape a un objectif chiffré (un revenu visé, un volume…), tu ne te contentes pas d'empiler des informations : tu poses le calcul qui répond à la question centrale de l'étape (ex : « combien faut-il en vendre par mois pour atteindre cet objectif ? ») avant toute conclusion.
- DÉMARRAGE SANS FRICTION. Ne propose le « menu » de format (1. une par une / 2. les grandes dimensions / 3. des options) QUE si tu n'as aucune indication. Si le client a déjà dit comment il veut avancer (« guide-moi », « une question à la fois »), démarre directement sans lui imposer ce choix.
- Tu ne conclus pas, ne résumes pas et ne proposes pas de générer/soumettre le document tant qu'un sujet est en cours d'exploration ou qu'un point reste à creuser. Explorer est le mode par défaut ; conclure est l'exception.
=== FIN POSTURE DE COACH ===

`

const STEP_SUBMISSION_INVITATION = `

---
FIN D'ÉTAPE (consigne, à n'appliquer QUE si le client signale lui-même qu'il a terminé) : si — et seulement si — le client dit explicitement qu'il n'a plus rien à ajouter ou qu'il veut finaliser, alors tu peux l'inviter chaleureusement à générer puis soumettre son document via le bouton « Générer mon document » situé sous la conversation. Tant que le client réfléchit, pose des questions ou explore un sujet : tu n'évoques JAMAIS le bouton ni la soumission, tu continues à l'accompagner.`

const ELIO_FORMATTING_INSTRUCTION =
  "\n\n---\nINSTRUCTIONS DE FORMATAGE (obligatoires) : sauts de ligne entre les paragraphes. TOUJOURS numéroter les choix (1. 2. 3.) — jamais de puces. Sois concis."

// === Persona client piégeur ===
function clientSystem(agentName, description) {
  return `Tu JOUES un ENTREPRENEUR (cliente : Sophie, projet de crème cosmétique artisanale faite maison qu'elle veut vendre) qui teste l'agent d'accompagnement « ${agentName} ». Domaine de l'agent : ${description}

Ton but : évaluer l'agent en te comportant comme un VRAI client humain, imparfait et piégeur. Tu écris UNIQUEMENT le message du client (court, naturel, 1 à 4 phrases), jamais de méta-commentaire.

Glisse NATURELLEMENT des pièges au fil de la conversation (pas tous d'un coup) :
- Donne parfois des réponses vagues ou "je sais pas trop".
- Donne un chiffre, puis plus tard un chiffre différent, pour voir s'il suit.
- Réponds à une question qu'il vient de poser de façon laconique (ex: juste "2€") pour voir s'il garde le fil.
- Soulève une idée adjacente au sujet (ex: échantillons gratuits, remises, un 2e produit) pour voir s'il l'explore ou la balaie.
- Propose une idée un peu bancale ou un raisonnement faux pour voir s'il te challenge gentiment ou s'il dit oui à tout (béni-oui-oui).
- À un moment, demande "on peut générer le document ?" alors que vous n'avez pas fini, pour voir s'il te pousse à conclure trop vite.
- Pose une question carrément hors-sujet pour voir comment il recentre.
- Montre un peu d'émotion / de doute ("j'y connais rien", "ça me stresse les chiffres").

Reste cohérent avec ton projet (crème cosmétique). Sois bref et crédible.`
}

function parseAgent(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!m) return null
  const fm = m[1]
  const body = m[2].trim()
  const pick = (k) => {
    const r = fm.match(new RegExp(`${k}:\\s*(.+)`))
    return r ? r[1].trim() : null
  }
  return {
    name: pick('name') ?? 'Élio',
    model: pick('model') ?? 'claude-sonnet-4-6',
    temperature: Math.min(parseFloat(pick('temperature') ?? '1') || 1, 1), // clamp ≤ 1 (API Claude)
    description: pick('description') ?? '',
    body,
  }
}

async function callElio({ systemPrompt, message, history, model, temperature, maxTokens }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(ELIO_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ systemPrompt, message, history, model, temperature, maxTokens }),
      })
      const j = await r.json()
      if (j.content) return j.content
      if (attempt === 2) return `[ERREUR elio-chat: ${JSON.stringify(j).slice(0, 300)}]`
    } catch (e) {
      if (attempt === 2) return `[EXCEPTION: ${String(e).slice(0, 200)}]`
    }
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)))
  }
  return '[ERREUR inconnue]'
}

async function runConversation(agent) {
  const agentPrompt = COACH_GUARDRAILS + agent.body + STEP_SUBMISSION_INVITATION + ELIO_FORMATTING_INSTRUCTION
  const cSys = clientSystem(agent.name, agent.description)

  const agentHist = [] // {role:user=client / assistant=agent}
  const clientHist = [] // {role:user=agent / assistant=client}
  const transcript = []

  // 1er message client
  let clientMsg = await callElio({
    systemPrompt: cSys,
    message: "[Démarre la conversation : présente brièvement ton projet et lance le premier échange avec l'agent.]",
    history: clientHist,
    model: CLIENT_MODEL,
    temperature: 0.9,
    maxTokens: 400,
  })
  clientHist.push({ role: 'user', content: '[Démarre la conversation]' }, { role: 'assistant', content: clientMsg })

  for (let t = 0; t < TURNS; t++) {
    transcript.push({ role: 'CLIENT', content: clientMsg })

    const agentReply = await callElio({
      systemPrompt: agentPrompt,
      message: clientMsg,
      history: agentHist,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: 800,
    })
    transcript.push({ role: 'ÉLIO', content: agentReply })
    agentHist.push({ role: 'user', content: clientMsg }, { role: 'assistant', content: agentReply })

    if (t === TURNS - 1) break

    clientMsg = await callElio({
      systemPrompt: cSys,
      message: agentReply,
      history: clientHist,
      model: CLIENT_MODEL,
      temperature: 0.9,
      maxTokens: 400,
    })
    clientHist.push({ role: 'user', content: agentReply }, { role: 'assistant', content: clientMsg })
  }

  return transcript
}

function slugify(name) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const onlySlugs = process.argv.slice(2) // ex: node run.mjs elio-cible elio-vision → ne teste que ceux-là
  const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'))
  let agents = files.map((f) => parseAgent(readFileSync(join(AGENTS_DIR, f), 'utf8'))).filter(Boolean)
  if (onlySlugs.length > 0) {
    agents = agents.filter((a) => onlySlugs.includes(slugify(a.name)))
  }

  console.log(`[QA] ${agents.length} agents à tester : ${agents.map((a) => a.name).join(', ')}`)

  const results = await Promise.all(
    agents.map(async (agent) => {
      const t0 = Date.now()
      const transcript = await runConversation(agent)
      const md =
        `# Transcript QA — ${agent.name}\n\n` +
        `- Modèle : ${agent.model} (temp ${agent.temperature})\n` +
        `- Domaine : ${agent.description}\n` +
        `- Tours : ${TURNS}\n\n---\n\n` +
        transcript.map((m) => `**${m.role}** :\n\n${m.content}\n`).join('\n---\n\n')
      const out = join(OUT_DIR, `${slugify(agent.name)}.md`)
      writeFileSync(out, md, 'utf8')
      console.log(`[QA] ✓ ${agent.name} — ${transcript.length} messages — ${Math.round((Date.now() - t0) / 1000)}s`)
      return agent.name
    }),
  )

  console.log(`[QA] Terminé : ${results.length} transcripts dans ${OUT_DIR}`)
}

main().catch((e) => {
  console.error('[QA] FATAL', e)
  process.exit(1)
})
