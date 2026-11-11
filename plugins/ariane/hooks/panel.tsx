import { atom, read, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

type Dollar = Parameters<Hook<'session.start'>>[0]

const PANE = 'ariane-panel'
const STATE_FILE = '.ariane/state.json'
const IDEAS_FILE = '.ariane/ideas.md'
const EVERY_MS = 2500

// Change the tag when what is stored changes: it declines what an earlier
// version left, which outlives a reload.
const raw = atom({ plugin: 'ariane', key: 'raw' } as const, null, {
  shape: 'raw-1',
})
const ideas = atom({ plugin: 'ariane', key: 'ideas' } as const, null, {
  shape: 'ideas-1',
})
// La liste des idées en attente est-elle dépliée ?
const ideasOpen = atom({ plugin: 'ariane', key: 'ideasOpen' } as const, false, {
  shape: 'ideas-open-1',
})
// La démo de test : affichée ou non, quel jeu d'essai, quel niveau forcé.
// La fenêtre des accès rapides est-elle ouverte ?
const linksOpen = atom({ plugin: 'ariane', key: 'linksOpen' } as const, false, {
  shape: 'links-open-1',
})
// L'heure qu'il est, arrondie à la minute : le panneau se redessine quand elle
// change, pour que « il y a 15 min » reste juste.
const minute = atom({ plugin: 'ariane', key: 'minute' } as const, 0, {
  shape: 'minute-1',
})
// La commande qu'un bouton vient de lancer (« ariane:next »…), ou '' : son
// bouton tourne tant qu'elle n'est pas partie dans la conversation. « frame »
// est le cran du petit rond qui tourne.
const launching = atom({ plugin: 'ariane', key: 'launching' } as const, { command: '', frame: 0 }, {
  shape: 'launching-1',
})
const SPIN = ['◐', '◓', '◑', '◒']
const SPIN_MS = 160 // un cran du rond
const SPIN_MAX_MS = 20000 // au-delà, on arrête de tourner quoi qu'il arrive

const demo = atom({ plugin: 'ariane', key: 'demo' } as const, { on: false, fixture: 1, level: null }, {
  shape: 'demo-1',
})

// ---------- Ce que le panneau lit dans .ariane/state.json ----------

type Story = { id: string; title?: string; lot?: string; status?: string }
type Lot = { id: string; title?: string; goal?: string; stories?: string[]; status?: string; step?: string | null }

// Le parcours d'un lot, du développement à la version stable. Ariane note où
// il en est dans `lots[].step` ; sans cette note (lots anciens), on le déduit
// du statut.
const LOT_STEPS = [
  { key: 'stories', label: 'Stories' },
  { key: 'test', label: 'Test du lot' },
  { key: 'demo', label: 'Démo' },
  { key: 'wiki', label: 'Documentation' },
  { key: 'merge', label: 'Version stable' },
] as const
type Step = { date?: string; agent?: string; event?: string; short?: string }
type ProjectState = {
  project?: { name?: string }
  phase?: string
  phases?: Record<string, string>
  gates?: Record<string, string | null>
  lots?: Lot[]
  current_lot?: string | null
  stories?: Story[]
  history?: Step[]
  cycle?: { version?: string } | null
  repo?: { url?: string | null }
  environments?: {
    supabase_test?: string | null
    supabase_prod?: string | null
    vercel_project?: string | null
    production_url?: string | null
  }
  wiki?: { url?: string | null }
}

const PHASE_LABEL: Record<string, string> = {
  onboarding: 'Accueil',
  ideation: 'Préparer la version',
  maturity: 'Niveau du projet',
  brief: 'Brief',
  prd: 'Cahier des charges',
  ux: 'Écrans',
  architecture: 'Fondations',
  planning: 'Découpage en lots',
  build: 'Construction',
  wiki: 'Documentation',
  release: 'Mise en ligne',
}

// ---------- La démo de test, dans le dépôt d'Ariane seulement ----------
// Ouvert dans le dépôt d'Ariane lui-même (reconnu à la source du plugin), sans
// projet en cours, le panneau montre un projet fictif pour être essayé et
// réglé. Le titre le dit, un bandeau donne les mesures et deux boutons font
// défiler les jeux d'essai et les niveaux de densité. Ailleurs, rien ne change.
const HOME_MARKER = 'plugins/ariane/.claude-plugin/plugin.json'
const DEMO_TITLE = 'Ariane · démo de test'

const DEMO_PHASES = (over: Record<string, string>) => ({
  onboarding: 'done', maturity: 'done', brief: 'todo', prd: 'todo', ux: 'todo',
  architecture: 'todo', planning: 'todo', build: 'todo', wiki: 'todo', release: 'todo', ...over,
})
const DEMO_BUILD = DEMO_PHASES({
  brief: 'done', prd: 'done', ux: 'done', architecture: 'done', planning: 'done', build: 'in_progress',
})
const DEMO_HISTORY: Step[] = [
  { date: '2026-11-02', agent: 'Socrate', event: 'Brief rédigé et relu avec l’utilisateur' },
  { date: '2026-11-03', agent: 'Maxime', event: 'Cahier des charges prêt pour la validation' },
  { date: '2026-11-04', agent: 'Iris', event: 'Maquettes des cinq écrans du MVP terminées' },
  { date: '2026-11-05', agent: 'Poucet', event: 'Découpage en trois lots et neuf stories' },
  { date: '2026-11-08', agent: 'Ada', event: 'Story 004 implémentée avec ses tests unitaires et fonctionnels' },
  { date: '2026-11-09', agent: 'Thomas', event: 'Story 004 vérifiée sur l’environnement de test en ligne' },
]
const DEMO_LOTS = (second: string): Lot[] => [
  { id: '01', title: 'Comptes et connexion', goal: 'On peut créer un compte et se connecter.', stories: ['001', '002', '003'], status: 'done' },
  { id: '02', title: 'Réserver un créneau', goal: 'Un client réserve un créneau et reçoit une confirmation.', stories: ['004', '005', '006', '007'], status: second },
  { id: '03', title: 'Tableau de bord', goal: 'Le gérant voit ses réservations de la semaine.', stories: ['008', '009'], status: 'todo' },
]
const DEMO_STORIES = (second: string[]): Story[] => [
  ...['001', '002', '003'].map(id => ({ id, title: `Story ${id}`, lot: '01', status: 'done' })),
  { id: '004', title: 'Choisir un créneau dans le calendrier', lot: '02', status: second[0] },
  { id: '005', title: 'Confirmer la réservation', lot: '02', status: second[1] },
  { id: '006', title: 'E-mail de confirmation', lot: '02', status: second[2] },
  { id: '007', title: 'Annuler une réservation', lot: '02', status: second[3] },
  { id: '008', title: 'Liste des réservations', lot: '03', status: 'todo' },
  { id: '009', title: 'Filtre par semaine', lot: '03', status: 'todo' },
]
const DEMO_ENV = {
  repo: { url: 'https://github.com/exemple/demo' },
  environments: { supabase_test: 'abcdefghijklmnopqrst', vercel_project: 'demo' },
}
const DEMOS: { name: string; state: ProjectState }[] = [
  {
    name: 'cadrage',
    state: {
      project: { name: 'Démo' },
      phase: 'prd',
      phases: DEMO_PHASES({ brief: 'done', prd: 'waiting_validation' }),
      history: DEMO_HISTORY.slice(0, 2),
    },
  },
  {
    name: 'construction',
    state: {
      project: { name: 'Démo' },
      phase: 'build',
      phases: DEMO_BUILD,
      gates: { prd: '2026-11-03', ux: '2026-11-05', release: null },
      lots: DEMO_LOTS('in_progress'),
      current_lot: '02',
      stories: DEMO_STORIES(['on_test', 'local_ok', 'in_progress', 'todo']),
      history: DEMO_HISTORY,
      ...DEMO_ENV,
    },
  },
  {
    name: 'démo d’un lot',
    state: {
      project: { name: 'Démo' },
      phase: 'build',
      phases: DEMO_BUILD,
      gates: { prd: '2026-11-03', ux: '2026-11-05', release: null },
      lots: DEMO_LOTS('demo'),
      current_lot: '02',
      stories: DEMO_STORIES(['in_lot', 'in_lot', 'in_lot', 'in_lot']),
      history: DEMO_HISTORY,
      ...DEMO_ENV,
    },
  },
  {
    name: 'projet en ligne',
    state: {
      project: { name: 'Démo' },
      phase: 'done',
      phases: DEMO_PHASES({
        brief: 'done', prd: 'done', ux: 'done', architecture: 'done', planning: 'done', build: 'done', wiki: 'done', release: 'done',
      }),
      gates: { prd: '2026-11-03', ux: '2026-11-05', release: '2026-11-11' },
      history: [...DEMO_HISTORY, { date: '2026-11-11', agent: 'Neil', event: 'Mise en production de la version 0.1.0 terminée' }],
      repo: DEMO_ENV.repo,
      environments: {
        ...DEMO_ENV.environments,
        supabase_prod: 'tsrqponmlkjihgfedcba',
        production_url: 'https://demo.vercel.app',
      },
      wiki: { url: 'https://github.com/exemple/demo/wiki' },
    },
  },
]
const DEMO_IDEAS =
  '## À explorer\n' +
  '- 2026-11-06 · Utilisateur (depuis le panneau, construction) · Un rappel par SMS la veille du rendez-vous\n' +
  '- 2026-11-08 · Utilisateur (depuis le panneau, construction) · Exporter les réservations de la semaine en PDF\n' +
  '- 2026-11-09 · Léonard · Une liste d’attente quand un créneau est complet\n'

type Stage = { name: string; phases: string[]; gate: string | null; gateLabel: string }
const STAGES: Stage[] = [
  { name: 'Cadrer', phases: ['brief', 'prd'], gate: 'prd', gateLabel: 'Cahier des charges' },
  { name: 'Concevoir', phases: ['ux', 'architecture', 'planning'], gate: 'ux', gateLabel: 'Écrans' },
  { name: 'Construire', phases: ['build'], gate: null, gateLabel: 'Démo de chaque lot' },
  { name: 'Livrer', phases: ['wiki', 'release'], gate: 'release', gateLabel: 'Mise en ligne' },
]

const STORY_LABEL: Record<string, string> = {
  todo: 'Pas commencée',
  in_progress: 'En cours',
  local_ok: 'Marche chez moi',
  on_test: 'Testée en ligne',
  in_lot: 'Prête pour la démo',
  done: 'Validée',
}
const STORY_FILLED: Record<string, number> = {
  todo: 0,
  in_progress: 1,
  local_ok: 2,
  on_test: 3,
  in_lot: 4,
  done: 5,
}
const BAR = 5

// ---------- Les teintes ----------
type Tone = { fg: string; base: string; soft: string; solid: string }
const TONE: Record<string, Tone> = {
  success: { fg: '#4caf7a', base: '#4caf7a', soft: '#4caf7a29', solid: '#2e7d57' },
  clay: { fg: '#e5896b', base: '#d97757', soft: '#d9775729', solid: '#c4623f' },
  warning: { fg: '#d9a441', base: '#d9a441', soft: '#d9a44129', solid: '#a8741a' },
  info: { fg: '#5aa0d8', base: '#378add', soft: '#378add29', solid: '#2b6f8a' },
  neutral: { fg: '#a0a0a0', base: '#8a8a8a', soft: '#8a8a8a29', solid: '#565c68' },
  danger: { fg: '#e06c6c', base: '#e24b4a', soft: '#e24b4a29', solid: '#b23b3b' },
}
const TINT_CURRENT = '#d977571a'

const STORY_TONE: Record<string, string> = {
  todo: 'neutral',
  in_progress: 'clay',
  local_ok: 'info',
  on_test: 'info',
  in_lot: 'success',
  done: 'success',
}

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Une pastille arrondie dessinée en SVG : le texte garde sa largeur naturelle.
// Un seul « A » devient l'avatar d'Ariane, un rond de 26 px.
const pill = (label: string, t: Tone) => {
  const isAvatar = label.length === 1
  const h = isAvatar ? 26 : 20
  const w = isAvatar ? 26 : Math.round(label.length * 6.6 + 22)
  const size = isAvatar ? 13 : 11
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" rx="${h / 2}" fill="${t.base}" fill-opacity="0.2"/>` +
    `<text x="${w / 2}" y="${h / 2 + 0.5}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" ` +
    `font-size="${size}" font-weight="500" fill="${t.fg}">${esc(label)}</text></svg>`
  return { source, w, h }
}

// Le trait de séparation : 2000 px de large, aplati à la place disponible.
const RULE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1" viewBox="0 0 2000 1" preserveAspectRatio="none"><rect width="2000" height="1" fill="#8a8a8a" fill-opacity="0.3"/></svg>'

// Le trait sous le titre d'une fenêtre : il se trace de gauche à droite à
// l'ouverture. L'animation est dans l'image, donc fluide.
const SWEEP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2" viewBox="0 0 2000 2" preserveAspectRatio="none">' +
  '<rect width="2000" height="2" fill="#8a8a8a" fill-opacity="0.3"/>' +
  '<rect width="0" height="2" fill="#d97757">' +
  '<animate attributeName="width" from="0" to="2000" dur="0.4s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0 0 1"/>' +
  '</rect></svg>'

// La barre en cinq segments arrondis, dessinée en SVG pour la largeur voulue.
const bar = (width: number, filled: number, current: boolean) => {
  const gap = 5
  const seg = (width - gap * (BAR - 1)) / BAR
  const rects = Array.from({ length: BAR }, (_, i) => {
    const color = i < filled ? (current ? '#e5896b' : '#4caf7a') : '#8a8a8a'
    const opacity = i < filled ? 1 : 0.3
    return `<rect x="${(i * (seg + gap)).toFixed(1)}" y="0" width="${seg.toFixed(1)}" height="6" rx="3" fill="${color}" fill-opacity="${opacity}"/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="6" viewBox="0 0 ${width} 6">${rects.join('')}</svg>`
}

// ---------- Les accès rapides ----------
// Ce que l'état garde : des adresses entières (dépôt, site, wiki) ou de simples
// références (projets Supabase, nom du projet Vercel), à compléter ici.
const web = (value: string | null | undefined, prefix = 'https://') => {
  const text = (value ?? '').trim()
  if (text === '') return null
  return /^https?:\/\//.test(text) ? text : `${prefix}${text}`
}
type ProjectLink = { label: string; about: string; href: string }
const projectLinks = (state: ProjectState): ProjectLink[] => {
  const env = state.environments ?? {}
  const supabase = 'https://supabase.com/dashboard/project/'
  const all: [string, string, string | null][] = [
    ['Site en ligne', 'L’application telle que tes utilisateurs la voient.', web(env.production_url)],
    ['GitHub', 'Le dépôt du code : branches, pull requests et historique.', web(state.repo?.url)],
    // Vercel retrouve l'équipe tout seul à partir du nom du projet.
    ['Vercel', 'L’hébergement : déploiements, journaux et domaines.', web(env.vercel_project, 'https://vercel.com/d?to=%2F%5Bteam%5D%2F')],
    ['Supabase test', 'La base de données et les comptes de l’environnement de test.', web(env.supabase_test, supabase)],
    ['Supabase production', 'La base de données et les comptes de la vraie application.', web(env.supabase_prod, supabase)],
    ['Wiki', 'La documentation du projet.', web(state.wiki?.url)],
  ]
  return all.flatMap(([label, about, href]) => (href ? [{ label, about, href }] : []))
}

// Ouvre une adresse dans le navigateur de la machine, sans passer par un
// shell : l'adresse est un argument, jamais une ligne de commande.
async function openUrl($: Dollar, href: string) {
  if (!/^https?:\/\//.test(href)) return
  const isWindows = /^[A-Za-z]:[\\/]/.test($.plugin.root)
  const tries = isWindows
    ? [['rundll32', 'url.dll,FileProtocolHandler', href]]
    : [['open', href], ['xdg-open', href]]
  for (const argv of tries) {
    try {
      const { exitCode } = await $.process.run(argv, { timeoutMs: 10000 })
      if (exitCode === 0) return
    } catch {
      // Commande absente sur cette machine : on essaie la suivante.
    }
  }
  $.ui.toast(`Impossible d’ouvrir ${href}`)
}

// Une date de l'historique, avec ou sans heure (« 2026-11-11T14:32 », heure
// locale, ou « 2026-11-11 »), lue comme un moment de la journée d'ici.
const moment = (iso?: string | null): { at: Date; hasTime: boolean } | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(iso ?? '')
  if (!m) return null
  const hasTime = m[4] !== undefined
  // Une date complète avec fuseau (« …Z », « …+01:00 ») est convertie telle quelle.
  const zoned = hasTime && /(Z|[+-]\d{2}:?\d{2})$/.test(iso ?? '') ? new Date(iso as string) : null
  const at =
    zoned && !Number.isNaN(zoned.getTime())
      ? zoned
      : new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0))
  return { at, hasTime }
}
const two = (n: number) => String(n).padStart(2, '0')
const stamp = (d: Date) =>
  `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`
const RECENT_H = 6 // en deçà, « il y a 3 h » plutôt que l'heure

// Quand un pas a eu lieu, dit comme on le dirait : « il y a 15 min », « il y a
// 3 h », « aujourd'hui à 9h05 », « hier à 18h30 », puis la date seule.
// Un pas noté sans heure n'est pas perdu pour autant : écrit après un pas
// d'aujourd'hui dont on connaît l'heure (`after`), il a moins que son âge.
const when = (iso: string | null | undefined, nowMs: number, after?: string | null): string => {
  const parsed = moment(iso)
  if (!parsed) return ''
  const { at, hasTime } = parsed
  const now = new Date(nowMs)
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((midnight(now) - midnight(at)) / 86400000)
  const clock = `${at.getHours()}h${two(at.getMinutes())}`
  if (hasTime) {
    const minutes = Math.floor((nowMs - at.getTime()) / 60000)
    if (minutes >= 0 && minutes < 1) return 'À l’instant'
    if (minutes >= 0 && minutes < 60) return `Il y a ${minutes} min`
    if (minutes >= 0 && minutes < RECENT_H * 60) return `Il y a ${Math.floor(minutes / 60)} h`
  }
  const bound = !hasTime && days === 0 ? moment(after) : null
  if (bound?.hasTime && midnight(bound.at) === midnight(at)) {
    const minutes = Math.floor((nowMs - bound.at.getTime()) / 60000)
    if (minutes >= 0 && minutes < 2) return 'À l’instant'
    if (minutes >= 0 && minutes < 60) return `Moins de ${minutes} min`
    if (minutes >= 0 && minutes < RECENT_H * 60) return `Moins de ${Math.floor(minutes / 60) + 1} h`
  }
  if (days === 0) return hasTime ? `Aujourd’hui à ${clock}` : 'Aujourd’hui'
  if (days === 1) return hasTime ? `Hier à ${clock}` : 'Hier'
  return `${two(at.getDate())}/${two(at.getMonth() + 1)}`
}

// Un pas en quelques mots : le résumé écrit par l'équipe (`short`) quand il
// existe ; sinon le début de l'événement, jusqu'à sa première précision
// (deux-points, parenthèse, point-virgule…), sans jamais le couper au hasard.
const SHORT_MAX = 48
const condense = (step: Step): string => {
  const short = (step.short ?? '').replace(/\s+/g, ' ').trim()
  const text = short || (step.event ?? '').replace(/\s+/g, ' ').trim()
  const stop = short ? -1 : text.search(/ : | ; | \(|\. | — | – /)
  const head = stop > 12 ? text.slice(0, stop) : text
  return head.length > SHORT_MAX ? `${head.slice(0, SHORT_MAX - 1).trimEnd()}…` : head
}

const day = (iso?: string | null) =>
  iso && iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : ''

const parse = (text: string | null): ProjectState | null => {
  if (text === null) return null
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' ? (value as ProjectState) : null
  } catch {
    return null
  }
}

// ---------- Les mesures, pour ne jamais dépasser en hauteur ----------
// Hauteurs en pixels, relevées sur le rendu du bureau. ROW_PX convertit les
// lignes que le panneau annonce (bodyRows) en pixels : à ajuster si le
// panneau choisit un niveau trop riche ou trop pauvre.
const ROW_PX = 20 // relevé : 29 lignes annoncées pour environ 590 px de panneau

// Les niveaux de densité, du plus riche au plus compact : ce que montre
// chaque bloc. Le panneau prend le premier qui tient dans sa hauteur.
type Density = {
  top: 'full' | 'compact'
  proj: 'cards' | 'mini' | 'list' | 'line'
  lot: 'goal' | 'full' | 'single' | 'summary' | 'none'
  foot: 'full4' | 'full2' | 'suite' | 'buttons' | 'none'
  // La zone pour écrire une idée : gardée tant qu'il reste de la place.
  idea: boolean
}
const LEVELS: Density[] = [
  { top: 'full', proj: 'cards', lot: 'goal', foot: 'full4', idea: true },
  { top: 'full', proj: 'cards', lot: 'full', foot: 'full2', idea: true },
  { top: 'full', proj: 'mini', lot: 'single', foot: 'suite', idea: true },
  { top: 'compact', proj: 'list', lot: 'full', foot: 'suite', idea: true },
  { top: 'compact', proj: 'list', lot: 'single', foot: 'buttons', idea: true },
  { top: 'compact', proj: 'line', lot: 'summary', foot: 'buttons', idea: false },
  { top: 'compact', proj: 'line', lot: 'none', foot: 'none', idea: false },
]
const U = 12 // une unité d'espacement vertical (gap ou padding de 1)
const L_BODY = 21
const L_FOOT = 19
const L_CAP = 16
const FRAME = 2 * U + 2 // padding haut et bas, plus la bordure
const BUTTONS = 34

// ---------- Lecture du fichier d'état, en continu ----------

let timer: { cancel: () => void } | undefined
let last: string | null | undefined

let isHome: boolean | undefined
async function atHome($: Dollar): Promise<boolean> {
  if (isHome === undefined) {
    try {
      isHome = Boolean(await $.fs.exists(HOME_MARKER))
    } catch {
      isHome = false
    }
  }
  return isHome
}

let lastDemoOn: boolean | undefined

async function load($: Dollar) {
  let text: string | null = null
  try {
    text = (await $.fs.read(STATE_FILE)) as string
  } catch {
    text = null
  }
  if (text !== last) {
    last = text
    await update($, raw, () => text)
  }
  const isDemoOn = text === null && (await atHome($))
  if (isDemoOn !== lastDemoOn) {
    lastDemoOn = isDemoOn
    await update($, demo, value => ({ ...value, on: isDemoOn }))
  }
  await loadIdeas($)
  const now = Math.floor((await $.clock.now()) / 60000)
  if (now !== lastMinute) {
    lastMinute = now
    await update($, minute, () => now)
  }
}
let lastMinute: number | undefined

// Ouvre le panneau, avec le titre de la démo quand c'est elle qui s'affiche.
async function openPane($: Dollar) {
  const isDemo = !(await $.fs.exists(STATE_FILE)) && (await atHome($))
  void $.ui.open({ id: PANE, title: isDemo ? DEMO_TITLE : 'Ariane' })
}

let lastIdeas: string | null | undefined
// Ce que l'utilisateur est en train d'écrire : gardé ici pour qu'un
// rafraîchissement du panneau ne l'efface pas.
let draft = ''

async function loadIdeas($: Dollar) {
  let text: string | null = null
  try {
    text = (await $.fs.read(IDEAS_FILE)) as string
  } catch {
    text = null
  }
  if (text === lastIdeas) return
  lastIdeas = text
  await update($, ideas, () => text)
}

// Les idées en attente : les lignes de la section « À explorer ».
// Chaque ligne s'écrit « - date · auteur · idée » ; une ligne écrite autrement
// est montrée telle quelle.
type Idea = { date: string; who: string; text: string; raw: string }
const pending = (text: string | null): Idea[] => {
  if (text === null) return []
  const start = text.indexOf('## À explorer')
  if (start < 0) return []
  const end = text.indexOf('\n## ', start + 1)
  const section = end < 0 ? text.slice(start) : text.slice(start, end)
  return section
    .split('\n')
    .filter(line => line.startsWith('- '))
    .map(line => {
      const parts = line.slice(2).split(' · ')
      return parts.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])
        ? { date: parts[0], who: author(parts[1]), text: parts.slice(2).join(' · '), raw: line }
        : { date: '', who: '', text: line.slice(2), raw: line }
    })
}
// Qui a eu l'idée, sans la précision entre parenthèses : « Utilisateur
// (pendant le lot 01) » devient « Toi », « Léonard » reste « Léonard ».
function author(source: string): string {
  const name = source.replace(/\s*\(.*$/, '').trim()
  return /^utilisateur/i.test(name) ? 'Toi' : name
}

const EMPTY_BOX = '# La boîte à idées\n\n## À explorer\n\n## Retenues pour la suite\n\n## Réalisées\n\n## Écartées\n'

// Note une idée dans .ariane/ideas.md, à la fin de « À explorer », sans
// passer par la conversation : le travail en cours n'est pas interrompu.
async function addIdea($: Dollar, value: string, where: string) {
  const idea = value.replace(/\s+/g, ' ').trim().slice(0, 300)
  if (idea === '') return
  let text: string
  try {
    text = (await $.fs.read(IDEAS_FILE)) as string
  } catch {
    try {
      text = (await $.fs.read(`${$.plugin.root}/templates/ideas.md`)) as string
    } catch {
      text = EMPTY_BOX
    }
  }
  const date = new Date(await $.clock.now()).toISOString().slice(0, 10)
  const line = `- ${date} · Utilisateur (depuis le panneau, ${where}) · ${idea}`
  const marker = text.indexOf('\n## Retenues pour la suite')
  const next =
    marker < 0
      ? `${text.trimEnd()}\n${line}\n`
      : `${text.slice(0, marker).trimEnd()}\n${line}\n${text.slice(marker)}`
  await $.fs.write(IDEAS_FILE, next)
  draft = ''
  lastIdeas = next
  await update($, ideas, () => next)
  $.ui.toast('Idée notée dans la boîte à idées.')
}

// Retire une idée de la liste en attente. Rien n'est effacé : sa ligne passe
// dans la section « Écartées » de .ariane/ideas.md, avec la date, comme le
// veut la boîte à idées (« quand une idée change de sort, on déplace sa ligne »).
async function dropIdea($: Dollar, raw: string) {
  let text: string
  try {
    text = ((await $.fs.read(IDEAS_FILE)) as string).replace(/\r\n/g, '\n')
  } catch {
    return
  }
  const start = text.indexOf('## À explorer')
  if (start < 0) return
  const sectionEnd = text.indexOf('\n## ', start + 1)
  const at = text.indexOf(`\n${raw}`, start)
  if (at < 0 || (sectionEnd >= 0 && at > sectionEnd)) return
  const without = text.slice(0, at) + text.slice(at + 1 + raw.length)
  const date = new Date(await $.clock.now()).toISOString().slice(0, 10)
  const moved = `${raw} · (écartée depuis le panneau le ${date})`
  const head = without.indexOf('\n## Écartées')
  let next: string
  if (head < 0) {
    next = `${without.trimEnd()}\n\n## Écartées\n\n${moved}\n`
  } else {
    const after = without.indexOf('\n## ', head + 1)
    next =
      after < 0
        ? `${without.trimEnd()}\n${moved}\n`
        : `${without.slice(0, after).trimEnd()}\n${moved}\n${without.slice(after)}`
  }
  await $.fs.write(IDEAS_FILE, next)
  lastIdeas = next
  await update($, ideas, () => next)
  $.ui.toast('Idée écartée : elle reste dans .ariane/ideas.md, section « Écartées ».')
}

function watch($: Dollar) {
  void load($)
  if (!timer) timer = $.clock.every(EVERY_MS, () => void load($))
}

// ---------- Ranger la conversation ----------
// À chaque /ariane:next, si la conversation est déjà bien remplie, Ariane la
// compacte avant de continuer : tout ce qui compte est sur le disque
// (.ariane/), la suite repart donc légère sans ouvrir une nouvelle session.
const COMPACT_FROM = 35 // pourcentage de la fenêtre de contexte
const KEEP =
  "Projet mené avec Ariane. Garde : où en est le projet (phase, lot et story en cours), ce que l'utilisateur vient de demander ou de décider et qui n'est pas encore écrit dans .ariane/, ses préférences sur la façon de lui parler, et tout blocage en cours. Résume très court le reste : le détail technique est dans .ariane/log.md, l'état dans .ariane/state.json, les décisions dans .ariane/decisions.md."

async function tidy($: Dollar) {
  try {
    const { context } = await $.session.usage()
    if ((context.percent ?? 0) < COMPACT_FROM) return
    $.ui.toast('Ariane range la conversation avant de continuer…')
    await $.session.compact({ instructions: KEEP })
  } catch {
    // Pas de compaction possible maintenant : on continue sans.
  }
}

// ---------- Le module ----------

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    watch($)
    if ((await $.fs.exists(STATE_FILE)) || (await atHome($))) {
      void openPane($)
    }

    return next(e)
  })

  // Chaque commande d'Ariane (/ariane:start, /ariane:next, /ariane:update…)
  // rouvre le panneau s'il a été fermé, que l'utilisateur la tape…
  on('command.run', async ($, e, next) => {
    if (e.command.startsWith('ariane:')) {
      watch($)
      void openPane($)
    }
    // Avant de passer à l'étape suivante : alléger la conversation si besoin.
    if (e.command === 'ariane:next') await tidy($)

    return next(e)
  }).catch((_, e, next) => next(e))

  // … ou que le modèle la lance lui-même, par l'outil Skill.
  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    const skill = (e as { skill?: unknown }).skill
    if (typeof skill === 'string' && skill.startsWith('ariane:')) {
      watch($)
      void openPane($)
    }

    return next(e)
  }).catch((_, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    // Le terminal n'a pas d'élément Svg : il dessine la barre avec des traits.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Svg = (ui as any).Svg as any
    const isRich = e.surface !== 'terminal'
    const real = parse(await read($, raw))
    const demoCfg = await read($, demo)
    const isDemo = real === null && demoCfg.on
    const fixture = DEMOS[demoCfg.fixture % DEMOS.length]
    const state = isDemo ? fixture.state : real
    const waitingList = pending(isDemo ? DEMO_IDEAS : await read($, ideas))
    const waitingIdeas = waitingList.length
    const isListOpen = waitingIdeas > 0 && (await read($, ideasOpen))
    const shownIdeas = [...waitingList].reverse()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Input = (ui as any).Input as any

    // Sur le bureau : une pastille arrondie en image. Sur le terminal : un aplat.
    const chip = (label: string, tone: string) => {
      const t = TONE[tone] ?? TONE.neutral
      if (isRich && Svg) {
        const p = pill(label, t)
        return <Svg source={p.source} alt={label} width={p.w} height={p.h} />
      }
      return (
        <Text backgroundColor={t.solid} color="#ffffff" weight="medium">
          {` ${label} `}
        </Text>
      )
    }

    if (state === null) {
      return (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" alignItems="center" gap={1}>
            {chip('A', 'clay')}
            <Text weight="semibold">Ariane</Text>
          </Box>
          <Text dimColor size="footnote">Pas encore de projet dans ce dossier.</Text>
          <Text dimColor size="footnote">Lance /ariane:start : le panneau se remplira tout seul.</Text>
        </Box>
      )
    }

    // ----- La place disponible -----
    const cols = Math.max(24, e.props.bodyColumns ?? 80)
    const rows = e.props.scroll?.bodyRows ?? e.viewport?.rows ?? 40
    const avail = rows * ROW_PX - U
    const inner = cols - 6
    const perRow = inner >= 80 ? 4 : inner >= 40 ? 2 : 1
    const cardW = Math.max(14, Math.floor((inner - 1 - (perRow - 1) * 2) / perRow) - 4)
    const barW = Math.max(60, Math.min(300, Math.round(inner * 8 * 0.4)))
    const frameBorder = isRich ? '#7a8ca373' : 'subtle'
    const frameBg = isRich ? '#7a8ca31f' : undefined
    const hr = () =>
      Svg ? (
        <Svg source={RULE} alt="séparateur" height={1} />
      ) : (
        <Text dimColor>{'─'.repeat(Math.max(8, inner - 8))}</Text>
      )

    // ----- L'état du projet -----
    const phases = state.phases ?? {}
    const lots = state.lots ?? []
    const stories = state.stories ?? []
    const lot = lots.find(one => one.id === state.current_lot)
    // Un lot en route, c'est de la construction, même si l'état dit encore
    // « écrans » ou « architecture » (le lot d'entretien d'une nouvelle version
    // part avant la fin de la conception) : l'étape en cours est « Construire ».
    const statedPhase = state.phase ?? 'onboarding'
    const lotStoriesAll = lot ? stories.filter(s => lot.stories?.includes(s.id)) : []
    // Où en est le lot : l'étape notée, sinon celle que le statut laisse deviner.
    const lotStep = (one: Lot, its: Story[]): string => {
      if (one.step && (one.step === 'done' || LOT_STEPS.some(s => s.key === one.step))) return one.step
      if (one.status === 'done') return 'done'
      if (one.status === 'demo') return 'demo'
      if (one.status === 'in_progress') {
        return its.length > 0 && its.every(s => s.status === 'in_lot' || s.status === 'done') ? 'test' : 'stories'
      }
      return 'todo'
    }
    const step = lot ? lotStep(lot, lotStoriesAll) : 'todo'
    // Le lot est en route tant qu'il n'est pas versé dans la version stable :
    // la documentation et la fusion, après la validation, en font partie.
    const lotActive = !!lot && step !== 'todo' && step !== 'done'
    const building = lotActive && !['build', 'done', 'stopped'].includes(statedPhase)
    const phase = building ? 'build' : statedPhase
    const lotIndex = lot ? lots.findIndex(one => one.id === lot.id) + 1 : 0
    const lotStories = lotStoriesAll
    const readyCount = lotStories.filter(s => s.status === 'in_lot' || s.status === 'done').length
    const nowMs = ((await read($, minute)) || Math.floor((await $.clock.now()) / 60000)) * 60000
    // Dans la démo, les derniers pas sont datés par rapport à maintenant, pour
    // montrer chaque façon de dire quand.
    const DEMO_AGO = [12, 3 * 60, 9 * 60, 26 * 60, 4 * 24 * 60] // minutes, du plus récent
    const history = (state.history ?? []).map((step, i, all) => {
      const back = DEMO_AGO[all.length - 1 - i]
      return isDemo && back !== undefined ? { ...step, date: stamp(new Date(nowMs - back * 60000)) } : step
    })
    const whenWidth = (labels: string[]) => Math.ceil(Math.max(0, ...labels.map(l => l.length)) * 0.8) + 1
    const waiting = Object.keys(phases).find(p => phases[p] === 'waiting_validation')
    const inDemo = lots.find(one => one.status === 'demo' && (!one.step || one.step === 'demo'))
    const working = lotStories.find(s => s.status === 'in_progress')
    const readyText = `${readyCount} sur ${lotStories.length} prête${readyCount > 1 ? 's' : ''}`

    // Après le MVP, « Cadrer » commence par la préparation de la version.
    const phasesOf = (stage: Stage) =>
      stage.name === 'Cadrer' && phases.ideation !== undefined ? ['ideation', 'prd'] : stage.phases
    const stageState = (stage: Stage): 'done' | 'current' | 'todo' => {
      const statuses = phasesOf(stage).map(p => phases[p] ?? 'todo')
      if (statuses.every(s => s === 'done')) return 'done'
      // Pendant qu'un lot avance, une seule étape est « en cours » : Construire.
      if (building && !phasesOf(stage).includes('build')) return 'todo'
      if (phasesOf(stage).includes(phase) || statuses.some(s => s !== 'todo')) return 'current'
      return 'todo'
    }
    const doneStages = STAGES.filter(s => stageState(s) === 'done').length

    // Une ligne par phase, ou, pour « Construire », une ligne par lot.
    const lines = (stage: Stage): { label: string; status: string }[] =>
      stage.name === 'Construire' && lots.length > 0
        ? lots.map(one => ({
            label: `Lot ${one.id}`,
            status: (() => {
              const at = lotStep(one, stories.filter(s => one.stories?.includes(s.id)))
              return at === 'done' ? 'done' : at === 'todo' ? 'todo' : 'in_progress'
            })(),
          }))
        : phasesOf(stage).map(p => ({
            label: PHASE_LABEL[p] ?? p,
            // Une phase laissée ouverte pendant qu'un lot avance attend son tour.
            status: building && phases[p] === 'in_progress' ? 'todo' : (phases[p] ?? 'todo'),
          }))

    const gate = (stage: Stage, st: 'done' | 'current' | 'todo'): { text: string; color: string; mark: string } => {
      if (stage.gate !== null) {
        const date = state.gates?.[stage.gate]
        if (date) return { text: `Validé le ${day(date)}`, color: 'success', mark: '✓' }
        const lastPhase = stage.phases[stage.phases.length - 1]
        if (phases[lastPhase] === 'waiting_validation') {
          return { text: `${stage.gateLabel} à valider`, color: 'warning', mark: '◔' }
        }
        return { text: st === 'todo' ? 'Pas encore' : `${stage.gateLabel} à venir`, color: 'inactive', mark: '○' }
      }
      if (inDemo) return { text: `Démo du lot ${inDemo.id} à essayer`, color: 'warning', mark: '◔' }
      const done = lots.filter(one => one.status === 'done').length
      // Des lots finis avant le découpage (le lot d'entretien d'une nouvelle
      // version) : la construction n'est pas finie, le gros des lots reste à venir.
      if (lots.length > 0 && done === lots.length && phases.planning !== undefined && phases.planning !== 'done') {
        return { text: 'D’autres lots à venir', color: 'inactive', mark: '○' }
      }
      if (lots.length > 0 && done === lots.length) return { text: 'Tous les lots validés', color: 'success', mark: '✓' }
      // Étape finie sans lot à montrer (état ancien ou allégé) : rester cohérent
      // avec la pastille « Terminé ».
      if (st === 'done') return { text: 'Construction terminée', color: 'success', mark: '✓' }
      if (lot) return { text: `Démo du lot ${lot.id} à venir`, color: 'inactive', mark: '○' }
      return { text: 'Pas encore', color: 'inactive', mark: '○' }
    }

    const mark = (st: string) =>
      st === 'done' ? '✓' : st === 'current' || st === 'in_progress' ? '▸' : st === 'waiting_validation' ? '◔' : '○'
    const tone = (st: string) =>
      st === 'done' ? 'success' : st === 'current' || st === 'in_progress' ? 'claude' : st === 'waiting_validation' ? 'warning' : 'inactive'

    // ----- Le statut en cours -----
    let badge = chip('En cours', 'clay')
    let sentence = `${PHASE_LABEL[phase] ?? phase}, c’est parti.`
    if (phase === 'done') {
      badge = chip('En ligne', 'success')
      sentence = 'Ton application est en ligne.'
    } else if (phase === 'stopped') {
      badge = chip('À l’arrêt', 'danger')
      sentence = 'Le projet est à l’arrêt.'
    } else if (inDemo) {
      badge = chip('Démo prête', 'warning')
      sentence = `La démo du lot ${inDemo.id} t’attend : essaie-la.`
    } else if (waiting) {
      badge = chip('À valider', 'warning')
      sentence = `J’attends ta validation : ${(PHASE_LABEL[waiting] ?? waiting).toLowerCase()}.`
    } else if (working) {
      sentence = `En route : « ${working.title ?? working.id} ».`
    } else if (lot && step === 'test') {
      sentence = `Thomas teste le lot ${lot.id} en entier.`
    } else if (lot && step === 'wiki') {
      sentence = `Lot ${lot.id} validé : Diderot met la documentation à jour.`
    } else if (lot && step === 'merge') {
      sentence = `Lot ${lot.id} validé : Clio le verse dans la version stable.`
    } else if (lot && lotActive) {
      sentence = `Le lot ${lot.id} avance : ${readyText}.`
    }

    const subtitle =
      phase === 'done'
        ? 'Projet terminé'
        : phase === 'stopped'
          ? 'Projet à l’arrêt'
          : lot && phase === 'build'
            ? `${PHASE_LABEL[phase] ?? phase} · lot ${lotIndex} sur ${lots.length}`
            : (PHASE_LABEL[phase] ?? phase)

    const nextLabel = inDemo ? 'Essayer la démo' : waiting ? 'Valider' : 'Continuer'
    // Dans la démo, les boutons ne lancent rien et aucune idée n'est écrite.
    const inert = () => $.ui.toast('Démo de test : rien n’est lancé ni écrit.')
    // Lance une commande d'Ariane comme si elle était tapée. Un prompt envoyé
    // par le panneau n'est pas lu comme une commande : il faut $.command.run.
    // Notre propre crochet « command.run » ne voit pas cet appel, d'où le
    // rangement de la conversation fait ici.
    const busy = await read($, launching)
    const launch = async (command: string) => {
      if ((await read($, launching)).command) return // déjà en route
      await update($, launching, () => ({ command, frame: 0 }))
      const tick = $.clock.every(SPIN_MS, () => {
        void update($, launching, now => (now.command ? { ...now, frame: now.frame + 1 } : now))
      }) as unknown as (() => void) & { cancel?: () => void }
      let stopped = false
      const stop = () => {
        if (stopped) return
        stopped = true
        if (typeof tick?.cancel === 'function') tick.cancel()
        else if (typeof tick === 'function') tick()
        void update($, launching, () => ({ command: '', frame: 0 }))
      }
      $.clock.after(SPIN_MAX_MS, stop)
      try {
        if (command === 'ariane:next') await tidy($)
        await $.command.run({ command })
      } catch {
        const sent = await $.prompt
          .submit({ text: `Lance la commande /${command}.` })
          .catch(() => ({ drop: 'erreur' }))
        if (sent.drop) $.ui.toast(`Impossible de lancer /${command} d’ici : tape-la dans la conversation.`)
      } finally {
        stop()
      }
    }
    // Le libellé d'un bouton : précédé du rond qui tourne tant que sa commande part.
    const spun = (command: string, label: string) =>
      busy.command === command ? `${SPIN[busy.frame % SPIN.length]} ${label}` : label
    const press = () => (isDemo ? inert() : void launch('ariane:next'))
    const pressStatus = () => (isDemo ? inert() : void launch('ariane:status'))
    const hasButtons = phase !== 'done'

    const links = projectLinks(state)

    // ----- Choisir la densité : le niveau le plus riche qui tient en hauteur -----
    // 0 complet · 1 resserré · 2 cartes réduites · 3 listes · 4 résumé · 5 minimal
    const n = lotStories.length
    const lineCounts = STAGES.map(s => lines(s).length)
    const stageRows = Math.ceil(STAGES.length / perRow)
    let fullCards = 0
    for (let r = 0; r < stageRows; r += 1) {
      const maxLines = Math.max(...lineCounts.slice(r * perRow, (r + 1) * perRow))
      fullCards += 100 + L_FOOT * maxLines
    }
    fullCards += (stageRows - 1) * U
    const miniCards = stageRows * (FRAME + L_BODY + U + L_CAP) + (stageRows - 1) * U
    // Les derniers pas sur toute la largeur, un trait, puis la suite dessous.
    const pairH = (count: number, b: number) =>
      count > 0 ? L_FOOT + U + count * L_FOOT + U + 1 + U + b : b
    const suiteH = L_FOOT + U + L_FOOT + (hasButtons ? U + BUTTONS : 0)

    const height = (index: number): number => {
      const d = LEVELS[index]
      const gap = index === 0 ? 2 * U : U
      const parts: number[] = []
      parts.push(d.top === 'full' ? L_BODY + L_FOOT : 26)
      if (d.proj === 'cards') parts.push(FRAME + L_FOOT + U + fullCards)
      else if (d.proj === 'mini') parts.push(FRAME + L_FOOT + U + miniCards)
      else if (d.proj === 'list') parts.push(FRAME + STAGES.length * L_FOOT)
      else parts.push(L_FOOT)
      if (lot) {
        const rowsFull = n * (1 + U + 2 * L_FOOT) + (n - 1) * U
        if (d.lot === 'goal') parts.push(FRAME + L_BODY + (lot.goal ? L_FOOT : 0) + U + L_FOOT + U + rowsFull)
        else if (d.lot === 'full') parts.push(FRAME + L_BODY + U + L_FOOT + U + rowsFull)
        else if (d.lot === 'single') parts.push(FRAME + L_BODY + U + n * L_FOOT)
        else if (d.lot === 'summary') parts.push(FRAME + L_BODY)
      }
      // Liste dépliée : deux lignes par idée, estimation large.
      if (d.idea) parts.push(FRAME + BUTTONS + U + 36 + L_BODY)
      if (d.foot === 'full4') parts.push(FRAME + pairH(Math.min(4, history.length), suiteH))
      else if (d.foot === 'full2') parts.push(FRAME + pairH(Math.min(2, history.length), suiteH))
      else if (d.foot === 'suite') parts.push(FRAME + L_FOOT + (hasButtons ? U + BUTTONS : 0))
      else if (d.foot === 'buttons' && hasButtons) parts.push(BUTTONS)
      return parts.reduce((sum, part) => sum + part, 0) + (parts.length - 1) * gap
    }

    let level = 0
    while (level < LEVELS.length - 1 && height(level) > avail) level += 1
    const fitted = level
    if (isDemo && demoCfg.level !== null && demoCfg.level < LEVELS.length) level = demoCfg.level
    const cfg = LEVELS[level]

    // Le bandeau de débogage : ce que le panneau a mesuré et choisi.
    const debugBlock = isDemo ? (
      <Box flexDirection="column" borderStyle="round" borderColor={isRich ? '#d9a441' : 'subtle'} paddingX={1} paddingY={1} gap={1}>
        <Box flexDirection="column">
          <Text color="warning" size="caption" wrap="truncate-end">
            DÉMO DE TEST · {e.surface} · {cols} colonnes · {rows} lignes · {avail} px
          </Text>
          <Text dimColor size="caption" wrap="truncate-end">
            Niveau {level}{level !== fitted ? ` forcé (calculé : ${fitted})` : ''} · hauteurs {LEVELS.map((_, i) => height(i)).join(' / ')}
          </Text>
        </Box>
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          <Button
            key="demo-fixture"
            variant="secondary"
            label={`Jeu d’essai : ${fixture.name}`}
            onPress={() => void update($, demo, value => ({ ...value, fixture: (value.fixture + 1) % DEMOS.length }))}
          />
          <Button
            key="demo-level"
            variant="secondary"
            label={`Densité : ${demoCfg.level === null ? 'automatique' : demoCfg.level}`}
            onPress={() =>
              void update($, demo, value => ({
                ...value,
                level: value.level === null ? 0 : value.level + 1 >= LEVELS.length ? null : value.level + 1,
              }))
            }
          />
        </Box>
      </Box>
    ) : null

    // Ouvre une fenêtre par-dessus le panneau.
    const openModal = (which: 'ideas' | 'links') => {
      void update($, ideasOpen, () => which === 'ideas')
      void update($, linksOpen, () => which === 'links')
    }
    // Le petit bouton carré, à droite du statut, qui ouvre les accès rapides.
    const linksButton =
      links.length > 0 ? (
        <Button key="links-open" variant="secondary" label="↗" onPress={() => openModal('links')} />
      ) : null

    const header = (title: string, right?: unknown) => (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Text weight="semibold" wrap="truncate-end">{title}</Text>
        {right}
      </Box>
    )

    // ----- Les blocs, chacun selon le niveau -----
    const top =
      cfg.top === 'full' ? (
        <Box flexDirection="row" alignItems="center" gap={2}>
          {chip('A', 'clay')}
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Text weight="semibold">{isDemo ? DEMO_TITLE : 'Ariane'}</Text>
            <Text dimColor size="footnote" wrap="truncate-end">{sentence}</Text>
          </Box>
          {cols >= 40 && badge}
          {linksButton}
        </Box>
      ) : (
        <Box flexDirection="row" alignItems="center" gap={1}>
          {chip('A', 'clay')}
          <Box flexGrow={1} flexShrink={1}>
            <Text size="footnote" wrap="truncate-end">{sentence}</Text>
          </Box>
          {cols >= 40 && badge}
          {linksButton}
        </Box>
      )

    const stageCard = (stage: Stage, isMini: boolean) => {
      const st = stageState(stage)
      const g = gate(stage, st)
      const stageChip =
        st === 'done' ? chip('Terminé', 'success') : st === 'current' ? chip('En cours', 'clay') : chip('À venir', 'neutral')
      return (
        <Box
          flexDirection="column"
          width={cardW}
          flexGrow={1}
          borderStyle="round"
          borderColor={st === 'current' ? 'claude' : 'subtle'}
          backgroundColor={st === 'current' && isRich ? TINT_CURRENT : undefined}
          paddingX={1}
          paddingY={1}
          gap={1}
        >
          {header(stage.name, stageChip)}
          {!isMini && (
            <Box flexDirection="column" flexGrow={1}>
              {lines(stage).map(one => (
                <Box flexDirection="row" gap={1}>
                  <Text color={tone(one.status)} size="footnote">{mark(one.status)}</Text>
                  <Text dimColor={one.status === 'todo'} size="footnote" wrap="truncate-end">{one.label}</Text>
                </Box>
              ))}
            </Box>
          )}
          {!isMini && hr()}
          <Box flexDirection="row" gap={1}>
            <Text color={g.color} size="caption">{g.mark}</Text>
            <Text color={g.color} size="caption" wrap="truncate-end">{g.text}</Text>
          </Box>
        </Box>
      )
    }

    const project =
      cfg.proj === 'cards' || cfg.proj === 'mini' ? (
        <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1} gap={1}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Text dimColor size="footnote" wrap="truncate-end">
              {state.project?.name || 'Projet sans nom'}{state.cycle?.version ? ` v${state.cycle.version}` : ''} · {subtitle}
            </Text>
            {cols >= 50 && <Text dimColor size="footnote">{doneStages} sur {STAGES.length}</Text>}
          </Box>
          <Box flexDirection="row" flexWrap="wrap" gap={1}>
            {STAGES.map(stage => stageCard(stage, cfg.proj === 'mini'))}
          </Box>
        </Box>
      ) : cfg.proj === 'list' ? (
        <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1}>
          {STAGES.map(stage => {
            const st = stageState(stage)
            const g = gate(stage, st)
            return (
              <Box flexDirection="row" justifyContent="space-between" gap={1}>
                <Box flexDirection="row" gap={1}>
                  <Text color={tone(st)} size="footnote">{mark(st)}</Text>
                  <Text size="footnote" weight={st === 'current' ? 'semibold' : 'regular'} dimColor={st === 'todo'}>
                    {stage.name}
                  </Text>
                </Box>
                <Text color={g.color} size="caption" wrap="truncate-end">{g.text}</Text>
              </Box>
            )
          })}
        </Box>
      ) : (
        <Box flexDirection="row" gap={2}>
          {STAGES.map(stage => {
            const st = stageState(stage)
            return (
              <Box flexDirection="row" gap={1}>
                <Text color={tone(st)} size="footnote">{mark(st)}</Text>
                {(st === 'current' || cols >= 50) && (
                  <Text size="footnote" weight={st === 'current' ? 'semibold' : 'regular'} dimColor={st !== 'current'}>
                    {stage.name}
                  </Text>
                )}
              </Box>
            )
          })}
        </Box>
      )

    const storyBar = (s: Story, width: number) => {
      const status = s.status ?? 'todo'
      const filled = STORY_FILLED[status] ?? 0
      const isCurrent = status === 'in_progress'
      return Svg ? (
        <Svg source={bar(width, filled, isCurrent)} alt={`${filled} étapes sur ${BAR}`} width={width} height={6} />
      ) : (
        <Box flexDirection="row">
          <Text color={isCurrent ? 'claude' : 'success'}>{'━'.repeat(filled)}</Text>
          <Text color="inactive">{'━'.repeat(BAR - filled)}</Text>
        </Box>
      )
    }

    // Le parcours du lot : fait, en cours, à venir.
    const stepAt = step === 'done' ? LOT_STEPS.length : LOT_STEPS.findIndex(s => s.key === step)
    const lotTrail = (
      <Box flexDirection="row" flexWrap="wrap" gap={2}>
        {LOT_STEPS.map((one, i) => {
          const st = i < stepAt ? 'done' : i === stepAt ? 'current' : 'todo'
          return (
            <Text size="caption" color={tone(st)}>
              {mark(st)} {one.label}
            </Text>
          )
        })}
      </Box>
    )
    const lotChip =
      step === 'done'
        ? chip('Dans la version stable', 'success')
        : step === 'wiki' || step === 'merge'
          ? chip('Validé', 'success')
          : chip(readyText, 'info')

    const lotBlock = !lot || cfg.lot === 'none' ? null : cfg.lot === 'goal' || cfg.lot === 'full' ? (
      <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1} gap={1}>
        <Box flexDirection="column">
          {header(`Lot ${lot.id} · ${lot.title ?? ''}`, lotChip)}
          {cfg.lot === 'goal' && lot.goal && <Text dimColor size="footnote" wrap="truncate-end">{lot.goal}</Text>}
        </Box>
        {lotTrail}
        <Box flexDirection="column" gap={1}>
          {lotStories.map(s => {
            const status = s.status ?? 'todo'
            const t = TONE[STORY_TONE[status] ?? 'neutral']
            return (
              <Box flexDirection="column" gap={1}>
                {hr()}
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box flexDirection="column" flexShrink={1}>
                    <Text size="footnote" wrap="truncate-end">{s.title ?? s.id}</Text>
                    <Text color={t.fg} size="caption">{STORY_LABEL[status] ?? status}</Text>
                  </Box>
                  {storyBar(s, barW)}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    ) : cfg.lot === 'single' ? (
      <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1} gap={1}>
        {header(`Lot ${lot.id} · ${lot.title ?? ''}`, lotChip)}
        <Box flexDirection="column">
          {lotStories.map(s => (
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
              <Box flexShrink={1}>
                <Text size="footnote" wrap="truncate-end">{s.title ?? s.id}</Text>
              </Box>
              {storyBar(s, Math.max(60, Math.round(barW * 0.7)))}
            </Box>
          ))}
        </Box>
      </Box>
    ) : (
      <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1}>
        {header(`Lot ${lot.id} · ${lot.title ?? ''}`, lotChip)}
      </Box>
    )

    // La boîte à idées : une zone pour en écrire une, sans quitter le panneau.
    const ideaBlock =
      cfg.idea && Input ? (
        <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1} gap={1}>
          {header(
            'Boîte à idées',
            waitingIdeas > 0 ? (
              <Button
                key="ideas-toggle"
                variant="secondary"
                label={`${waitingIdeas} en attente`}
                onPress={() => openModal('ideas')}
              />
            ) : undefined,
          )}
          {/* Deux lignes, sur toute la largeur du cadre. */}
          <Box flexDirection="column" alignItems="stretch" width="100%">
            <Input
              key="idea"
              placeholder="Note une idée pour plus tard…"
              submitLabel="noter"
              rows={2}
              value={draft}
              onInput={(value: string) => {
                draft = value
              }}
              onSubmit={(value: string) => {
                if (isDemo) inert()
                else void addIdea($, value, subtitle.toLowerCase())
              }}
            />
          </Box>
        </Box>
      ) : null


    // Une fenêtre (les idées, les accès rapides) : elle prend la place du panneau
    // tant qu'elle est ouverte. Plus haute que lui, elle défile comme lui.
    const modal = (title: string, closeKey: string, close: () => void, body: unknown) => (
      <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1} gap={1}>
        {header(title, <Button key={closeKey} variant="secondary" label="Fermer" onPress={close} />)}
        {Svg ? <Svg source={SWEEP} alt="séparateur" height={2} /> : hr()}
        {body}
      </Box>
    )

    const ideasModal = isListOpen
      ? modal(
          `Boîte à idées · ${waitingIdeas} en attente`,
          'ideas-close',
          () => void update($, ideasOpen, () => false),
          <Box flexDirection="column" gap={1}>
            {Input && (
              <Box flexDirection="column" alignItems="stretch" width="100%">
                <Input
                  key="idea-modal"
                  placeholder="Note une idée pour plus tard…"
                  submitLabel="noter"
                  rows={2}
                  value={draft}
                  onInput={(value: string) => {
                    draft = value
                  }}
                  onSubmit={(value: string) => {
                    if (isDemo) inert()
                    else void addIdea($, value, subtitle.toLowerCase())
                  }}
                />
              </Box>
            )}
            {shownIdeas.map((idea, index) => (
              <Box flexDirection="column" gap={1}>
                {hr()}
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box flexDirection="column" flexShrink={1}>
                    <Text size="footnote">{idea.text}</Text>
                    <Text dimColor size="caption">
                      {[idea.who, day(idea.date)].filter(Boolean).join(' · ') || 'Sans date'}
                    </Text>
                  </Box>
                  <Button
                    key={`idea-drop-${waitingIdeas - 1 - index}`}
                    variant="secondary"
                    label="Écarter"
                    onPress={() => (isDemo ? inert() : void dropIdea($, idea.raw))}
                  />
                </Box>
              </Box>
            ))}
          </Box>,
        )
      : null

    // Les accès rapides : chaque adresse connue du projet, ce qu'on y trouve et
    // un bouton pour l'ouvrir.
    const linksModal =
      links.length > 0 && (await read($, linksOpen))
        ? modal(
            'Accès rapides',
            'links-close',
            () => void update($, linksOpen, () => false),
            <Box flexDirection="column" gap={1}>
              {links.map(one => (
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <Box flexDirection="column" flexShrink={1}>
                    <Text size="footnote" weight="semibold">{one.label}</Text>
                    <Text dimColor size="caption">{one.about}</Text>
                  </Box>
                  <Button
                    key={`link-${one.label}`}
                    variant="secondary"
                    label="Ouvrir ↗"
                    onPress={() => void openUrl($, one.href)}
                  />
                </Box>
              ))}
            </Box>,
          )
        : null

    const buttons = hasButtons ? (
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {hasButtons && <Button key="next" variant="primary" label={spun('ariane:next', nextLabel)} onPress={press} />}
        {hasButtons && <Button key="status" variant="secondary" label={spun('ariane:status', 'Où on en est')} onPress={pressStatus} />}
      </Box>
    ) : null

    const nextText =
      phase === 'done' ? 'Rien à faire, c’est en ligne.' : `Prochaine étape : ${PHASE_LABEL[phase] ?? phase}.`
    const steps = history.slice(cfg.foot === 'full4' ? -4 : -2).reverse()
    // Une colonne de même largeur pour tous, à la mesure du libellé le plus long.
    // Pour un pas sans heure : l'heure du dernier pas daté qui le précède.
    const timedBefore = (step: Step) =>
      history
        .slice(0, history.indexOf(step))
        .reverse()
        .find(one => moment(one.date)?.hasTime)?.date
    const stepWhen = (step: Step) => when(step.date, nowMs, timedBefore(step))
    const stepsWidth = whenWidth(steps.map(stepWhen))

    const footer = cfg.foot === 'full4' || cfg.foot === 'full2' ? (
      <Box flexDirection="column" gap={1} borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1}>
        {steps.length > 0 && (
          <Box flexDirection="column" gap={1}>
            <Text dimColor size="footnote">Les derniers pas</Text>
            <Box flexDirection="column">
              {steps.map(step => (
                <Box flexDirection="row" gap={1}>
                  <Box width={stepsWidth} flexShrink={0}>
                    <Text dimColor size="caption" wrap="truncate-end">{stepWhen(step)}</Text>
                  </Box>
                  <Box flexShrink={1}>
                    <Text size="footnote" wrap="truncate-end">
                      {step.agent ? `${step.agent} · ` : ''}
                      {condense(step)}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        {steps.length > 0 && hr()}
        <Box flexDirection="column" gap={1}>
          <Text dimColor size="footnote">La suite</Text>
          <Text size="footnote">{nextText}</Text>
          {buttons}
        </Box>
      </Box>
    ) : cfg.foot === 'suite' ? (
      <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1} gap={1}>
        <Text size="footnote" wrap="truncate-end">{nextText}</Text>
        {buttons}
      </Box>
    ) : cfg.foot === 'buttons' ? (
      buttons
    ) : null

    if (ideasModal) return ideasModal
    if (linksModal) return linksModal

    return (
      <Box flexDirection="column" gap={level === 0 ? 2 : 1}>
        {debugBlock}
        {top}
        {project}
        {lotBlock}
        {ideaBlock}
        {footer}
      </Box>
    )
  })
}
