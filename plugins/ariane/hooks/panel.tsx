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
// ---------- Ce que le panneau lit dans .ariane/state.json ----------

type Story = { id: string; title?: string; lot?: string; status?: string }
type Lot = { id: string; title?: string; goal?: string; stories?: string[]; status?: string }
type Step = { date?: string; agent?: string; event?: string }
type ProjectState = {
  project?: { name?: string }
  phase?: string
  phases?: Record<string, string>
  gates?: Record<string, string | null>
  lots?: Lot[]
  current_lot?: string | null
  stories?: Story[]
  history?: Step[]
}

const PHASE_LABEL: Record<string, string> = {
  onboarding: 'Accueil',
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
  await loadIdeas($)
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
const pending = (text: string | null): number => {
  if (text === null) return 0
  const start = text.indexOf('## À explorer')
  if (start < 0) return 0
  const end = text.indexOf('\n## ', start + 1)
  const section = end < 0 ? text.slice(start) : text.slice(start, end)
  return section.split('\n').filter(line => line.startsWith('- ')).length
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

function watch($: Dollar) {
  void load($)
  if (!timer) timer = $.clock.every(EVERY_MS, () => void load($))
}

// ---------- Le module ----------

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    watch($)
    if (await $.fs.exists(STATE_FILE)) {
      void $.ui.open({ id: PANE, title: 'Ariane' })
    }

    return next(e)
  })

  // Chaque commande d'Ariane (/ariane:start, /ariane:next, /ariane:update…)
  // rouvre le panneau s'il a été fermé, que l'utilisateur la tape…
  on('command.run', async ($, e, next) => {
    if (e.command.startsWith('ariane:')) {
      watch($)
      void $.ui.open({ id: PANE, title: 'Ariane' })
    }

    return next(e)
  }).catch((_, e, next) => next(e))

  // … ou que le modèle la lance lui-même, par l'outil Skill.
  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    const skill = (e as { skill?: unknown }).skill
    if (typeof skill === 'string' && skill.startsWith('ariane:')) {
      watch($)
      void $.ui.open({ id: PANE, title: 'Ariane' })
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
    const state = parse(await read($, raw))
    const waitingIdeas = pending(await read($, ideas))
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
    const perPair = inner >= 50 ? 2 : 1
    const pairW = Math.max(18, Math.floor((inner - 1 - (perPair - 1) * 3) / perPair) - 4)
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
    const phase = state.phase ?? 'onboarding'
    const lots = state.lots ?? []
    const stories = state.stories ?? []
    const lot = lots.find(one => one.id === state.current_lot)
    const lotIndex = lot ? lots.findIndex(one => one.id === lot.id) + 1 : 0
    const lotStories = lot ? stories.filter(s => lot.stories?.includes(s.id)) : []
    const readyCount = lotStories.filter(s => s.status === 'in_lot' || s.status === 'done').length
    const history = state.history ?? []
    const waiting = Object.keys(phases).find(p => phases[p] === 'waiting_validation')
    const inDemo = lots.find(one => one.status === 'demo')
    const working = lotStories.find(s => s.status === 'in_progress')
    const readyText = `${readyCount} sur ${lotStories.length} prête${readyCount > 1 ? 's' : ''}`

    const stageState = (stage: Stage): 'done' | 'current' | 'todo' => {
      const statuses = stage.phases.map(p => phases[p] ?? 'todo')
      if (statuses.every(s => s === 'done')) return 'done'
      if (stage.phases.includes(phase) || statuses.some(s => s !== 'todo')) return 'current'
      return 'todo'
    }
    const doneStages = STAGES.filter(s => stageState(s) === 'done').length

    // Une ligne par phase, ou, pour « Construire », une ligne par lot.
    const lines = (stage: Stage): { label: string; status: string }[] =>
      stage.name === 'Construire' && lots.length > 0
        ? lots.map(one => ({
            label: `Lot ${one.id}`,
            status: one.status === 'done' ? 'done' : one.status === 'todo' || !one.status ? 'todo' : 'in_progress',
          }))
        : stage.phases.map(p => ({ label: PHASE_LABEL[p] ?? p, status: phases[p] ?? 'todo' }))

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
      if (lots.length > 0 && done === lots.length) return { text: 'Tous les lots validés', color: 'success', mark: '✓' }
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
    } else if (lot) {
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
    const press = () => void $.prompt.submit({ text: '/ariane:next' })
    const pressStatus = () => void $.prompt.submit({ text: '/ariane:status' })
    const hasButtons = phase !== 'done'

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
    const pairH = (a: number, b: number) => (perPair === 2 ? Math.max(a, b) : a + b + 3 * U)
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
        if (d.lot === 'goal') parts.push(FRAME + L_BODY + (lot.goal ? L_FOOT : 0) + U + rowsFull)
        else if (d.lot === 'full') parts.push(FRAME + L_BODY + U + rowsFull)
        else if (d.lot === 'single') parts.push(FRAME + L_BODY + U + n * L_FOOT)
        else if (d.lot === 'summary') parts.push(FRAME + L_BODY)
      }
      if (d.idea) parts.push(FRAME + L_BODY + U + 36)
      if (d.foot === 'full4') parts.push(FRAME + pairH(L_FOOT + U + Math.min(4, history.length) * L_FOOT, suiteH))
      else if (d.foot === 'full2') parts.push(FRAME + pairH(L_FOOT + U + Math.min(2, history.length) * L_FOOT, suiteH))
      else if (d.foot === 'suite') parts.push(FRAME + L_FOOT + (hasButtons ? U + BUTTONS : 0))
      else if (d.foot === 'buttons' && hasButtons) parts.push(BUTTONS)
      return parts.reduce((sum, part) => sum + part, 0) + (parts.length - 1) * gap
    }

    let level = 0
    while (level < LEVELS.length - 1 && height(level) > avail) level += 1
    const cfg = LEVELS[level]

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
            <Text weight="semibold">Ariane</Text>
            <Text dimColor size="footnote" wrap="truncate-end">{sentence}</Text>
          </Box>
          {cols >= 40 && badge}
        </Box>
      ) : (
        <Box flexDirection="row" alignItems="center" gap={1}>
          {chip('A', 'clay')}
          <Box flexGrow={1} flexShrink={1}>
            <Text size="footnote" wrap="truncate-end">{sentence}</Text>
          </Box>
          {cols >= 40 && badge}
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
              {state.project?.name || 'Projet sans nom'} · {subtitle}
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

    const lotBlock = !lot || cfg.lot === 'none' ? null : cfg.lot === 'goal' || cfg.lot === 'full' ? (
      <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1} gap={1}>
        <Box flexDirection="column">
          {header(`Lot ${lot.id} · ${lot.title ?? ''}`, chip(readyText, 'info'))}
          {cfg.lot === 'goal' && lot.goal && <Text dimColor size="footnote" wrap="truncate-end">{lot.goal}</Text>}
        </Box>
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
        {header(`Lot ${lot.id} · ${lot.title ?? ''}`, chip(readyText, 'info'))}
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
        {header(`Lot ${lot.id} · ${lot.title ?? ''}`, chip(readyText, 'info'))}
      </Box>
    )

    // La boîte à idées : une zone pour en écrire une, sans quitter le panneau.
    const ideaBlock =
      cfg.idea && Input ? (
        <Box flexDirection="column" borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1} gap={1}>
          {header(
            'Boîte à idées',
            waitingIdeas > 0 ? chip(`${waitingIdeas} en attente`, 'neutral') : undefined,
          )}
          <Input
            key="idea"
            placeholder="Note une idée pour plus tard…"
            submitLabel="noter"
            value={draft}
            onInput={(value: string) => {
              draft = value
            }}
            onSubmit={(value: string) => {
              void addIdea($, value, subtitle.toLowerCase())
            }}
          />
        </Box>
      ) : null

    const buttons = hasButtons ? (
      <Box flexDirection="row" gap={1}>
        <Button key="next" variant="primary" label={nextLabel} onPress={press} />
        <Button key="status" variant="secondary" label="Où on en est" onPress={pressStatus} />
      </Box>
    ) : null

    const nextText =
      phase === 'done' ? 'Rien à faire, c’est en ligne.' : `Prochaine étape : ${PHASE_LABEL[phase] ?? phase}.`
    const steps = history.slice(cfg.foot === 'full4' ? -4 : -2).reverse()

    const footer = cfg.foot === 'full4' || cfg.foot === 'full2' ? (
      <Box flexDirection="row" flexWrap="wrap" gap={3} borderStyle="round" borderColor={frameBorder} backgroundColor={frameBg} paddingX={1} paddingY={1}>
        {steps.length > 0 && (
          <Box flexDirection="column" width={pairW} flexGrow={1} gap={1}>
            <Text dimColor size="footnote">Les derniers pas</Text>
            <Box flexDirection="column">
              {steps.map(step => (
                <Box flexDirection="row" gap={1}>
                  <Text dimColor size="caption">{day(step.date)}</Text>
                  <Text size="footnote" wrap="truncate-end">
                    {step.agent ? `${step.agent} · ` : ''}
                    {step.event}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <Box flexDirection="column" width={pairW} flexGrow={1} gap={1}>
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

    return (
      <Box flexDirection="column" gap={level === 0 ? 2 : 1}>
        {top}
        {project}
        {lotBlock}
        {ideaBlock}
        {footer}
      </Box>
    )
  })
}
