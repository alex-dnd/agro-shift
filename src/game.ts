// Игровая логика «Пятница. Релиз. Урожай».
// Здесь нет ничего про интерфейс: только типы и правила.
// Сами события лежат в events.ts.
import { EVENT_POOL, FINALE, FOLLOW_UPS } from './events'

export type StatKey = 'crop' | 'water' | 'systems'
export type Stats = Record<StatKey, number>
export type Effect = Partial<Stats>

// Участок фермы, где происходит событие (для схемы на экране)
export type Zone = 'field' | 'greenhouse' | 'water' | 'server' | 'barn' | 'dock'

// Следы неудачных (и не только) решений на схеме фермы — остаются до конца смены
export type Scar =
  | 'puddle'
  | 'papers'
  | 'greenhouse_burn'
  | 'greenhouse_fog'
  | 'drone_broken'
  | 'pests'
  | 'leak'
  | 'nets'
  | 'hail_damage'
  | 'server_smoke'
  | 'tracks'
  | 'server_warning'
  | 'cow_hungry'
  | 'hay'
  | 'road_block'

// Персонаж, который появляется с репликой во время события
export type Speaker = {
  who: 'neighbor' | 'driver' | 'worker' | 'bot'
  mood: 'calm' | 'happy' | 'worried' | 'angry'
  line: string
}

export type Ongoing = {
  label: string
  effect: Effect
  turnsLeft: number
}

export type Choice = {
  label: string
  hint: string
  effect: Effect
  outcome: string
  // На сколько следующих событий инженер будет занят
  engineerTurns?: number
  // Последствие, которое действует несколько следующих ходов
  ongoing?: Ongoing
  // Метка решения: запускает цепочки и учитывается в достижениях
  flag?: string
  // След на схеме фермы до конца смены
  scar?: Scar
  // Случайный исход: с вероятностью chance вместо обычного результата
  // срабатывают effect и outcome из risk
  risk?: { chance: number; effect: Effect; outcome: string; scar?: Scar }
}

export type GameEvent = {
  id: string
  zone: Zone
  title: string
  text: string
  choices: Choice[]
  speaker?: Speaker
  // Событие-продолжение из цепочки
  followUp?: boolean
}

export type LogEntry = {
  time: string
  title: string
  choice: string
  delta: Stats
  followUp: boolean
}

export type GameState = {
  stats: Stats
  turn: number
  engineerBusy: number
  engineerZone: Zone | null
  ongoing: Ongoing[]
  events: GameEvent[]
  flags: string[]
  scars: Scar[]
  log: LogEntry[]
  lastOutcome: string | null
  // Сообщение о том, что решение ещё аукнется
  warning: string | null
  status: 'playing' | 'finished' | 'lost'
}

export const STAT_KEYS: StatKey[] = ['crop', 'water', 'systems']

export const STAT_LABELS: Record<StatKey, string> = {
  crop: 'Урожай',
  water: 'Вода',
  systems: 'Системы',
}

export const SHIFT_LENGTH = 6
export const SHIFT_TIMES = ['16:00', '16:20', '16:45', '17:05', '17:30', '17:55']

const clamp = (value: number) => Math.max(0, Math.min(100, value))

function applyEffect(stats: Stats, effect: Effect): Stats {
  return {
    crop: clamp(stats.crop + (effect.crop ?? 0)),
    water: clamp(stats.water + (effect.water ?? 0)),
    systems: clamp(stats.systems + (effect.systems ?? 0)),
  }
}

// Случайно выбирает события смены. rng можно подменить в тестах.
export function pickEvents(rng: () => number = Math.random): GameEvent[] {
  const pool = [...EVENT_POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return [...pool.slice(0, SHIFT_LENGTH - 1), FINALE]
}

export function createGame(events: GameEvent[] = pickEvents()): GameState {
  return {
    stats: { crop: 100, water: 45, systems: 40 },
    turn: 0,
    engineerBusy: 0,
    engineerZone: null,
    ongoing: [],
    events,
    flags: [],
    scars: [],
    log: [],
    lastOutcome: null,
    warning: null,
    status: 'playing',
  }
}

export function isChoiceAvailable(state: GameState, choice: Choice): boolean {
  return !choice.engineerTurns || state.engineerBusy === 0
}

// Ставит продолжение цепочки через одно-два события, но не на место финала
// и не поверх другого продолжения.
function scheduleFollowUp(events: GameEvent[], turn: number, followUp: GameEvent): GameEvent[] | null {
  const last = events.length - 1
  for (const index of [turn + 2, turn + 1]) {
    if (index < last && !events[index].followUp) {
      const next = [...events]
      next[index] = followUp
      return next
    }
  }
  return null
}

export function makeChoice(
  state: GameState,
  choice: Choice,
  rng: () => number = Math.random,
): GameState {
  if (state.status !== 'playing' || !isChoiceAvailable(state, choice)) return state
  const event = state.events[state.turn]

  // 1. Прямой эффект выбора (с учётом случайного исхода)
  const unlucky = choice.risk ? rng() < choice.risk.chance : false
  let stats = applyEffect(state.stats, choice.effect)
  if (unlucky && choice.risk) stats = applyEffect(stats, choice.risk.effect)
  const outcome = unlucky && choice.risk ? choice.risk.outcome : choice.outcome

  // 2. Продолжающиеся последствия прошлых решений
  for (const item of state.ongoing) stats = applyEffect(stats, item.effect)
  const ongoing = state.ongoing
    .map((item) => ({ ...item, turnsLeft: item.turnsLeft - 1 }))
    .filter((item) => item.turnsLeft > 0)
  if (choice.ongoing) ongoing.push({ ...choice.ongoing })

  // 3. Занятость инженера
  const engineerBusy = choice.engineerTurns ?? Math.max(0, state.engineerBusy - 1)
  const engineerZone = choice.engineerTurns
    ? event.zone
    : engineerBusy > 0
      ? state.engineerZone
      : null

  // 4. Следы на схеме фермы
  const newScar = unlucky && choice.risk?.scar ? choice.risk.scar : choice.scar
  const scars = newScar && !state.scars.includes(newScar) ? [...state.scars, newScar] : state.scars

  // 5. Цепочки последствий
  const flags = choice.flag ? [...state.flags, choice.flag] : state.flags
  let events = state.events
  let warning: string | null = null
  const followUp = choice.flag ? FOLLOW_UPS[choice.flag] : undefined
  if (followUp) {
    const scheduled = scheduleFollowUp(events, state.turn, followUp)
    if (scheduled) {
      events = scheduled
      warning = 'Это решение ещё аукнется до конца смены.'
    }
  }

  // 6. Запись в журнал смены
  const log: LogEntry[] = [
    ...state.log,
    {
      time: SHIFT_TIMES[state.turn] ?? '',
      title: event.title,
      choice: choice.label,
      delta: {
        crop: stats.crop - state.stats.crop,
        water: stats.water - state.stats.water,
        systems: stats.systems - state.stats.systems,
      },
      followUp: Boolean(event.followUp),
    },
  ]

  const turn = state.turn + 1
  const lost = stats.crop === 0 || stats.water === 0 || stats.systems === 0
  const status = lost ? 'lost' : turn >= events.length ? 'finished' : 'playing'

  return {
    stats,
    turn,
    engineerBusy,
    engineerZone,
    ongoing,
    events,
    flags,
    scars,
    log,
    lastOutcome: outcome,
    warning,
    status,
  }
}

// Запас воды и систем ниже этого уровня штрафует итог:
// ферма должна дожить до понедельника, а не только отгрузить урожай.
export const RESERVE_LEVEL = 25

export function getScore(stats: Stats): { score: number; penalty: number } {
  const penalty =
    Math.max(0, RESERVE_LEVEL - stats.water) + Math.max(0, RESERVE_LEVEL - stats.systems)
  return { score: Math.max(0, stats.crop - penalty), penalty }
}

export function getRating(stats: Stats): { title: string; text: string } {
  const { score } = getScore(stats)
  if (score >= 85) return { title: 'Идеальная смена', text: 'Урожай отгружен почти полностью, ферма в порядке. Можно спокойно уходить на выходные.' }
  if (score >= 65) return { title: 'Хорошая смена', text: 'Были потери, но ферма справилась.' }
  if (score >= 40) return { title: 'Тяжёлая пятница', text: 'Отгрузка состоялась, но в понедельник будет разбор полётов.' }
  return { title: 'Инцидент', text: 'Большая часть урожая потеряна или ферма едва держится. Пора писать постмортем.' }
}

// ---------- Достижения ----------

export type Achievement = {
  id: string
  title: string
  text: string
  check: (state: GameState) => boolean
}

const QUICKFIX_FLAGS = ['quickfix', 'controller_hack', 'drone_reflash', 'self_signed', 'logs_ignored']

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'no_friday_deploy',
    title: 'Пятница без деплоя',
    text: 'Не выкатывать прошивку в пятницу вечером',
    check: (s) => s.status === 'finished' && !s.flags.includes('friday_deploy'),
  },
  {
    id: 'yolo',
    title: 'Деплой в пятницу',
    text: 'Выкатить прошивку в 17:55 и пережить последствия',
    check: (s) => s.status === 'finished' && s.flags.includes('friday_deploy'),
  },
  {
    id: 'good_neighbor',
    title: 'Добрый сосед',
    text: 'Поделиться водой с соседним хозяйством',
    check: (s) => s.flags.includes('neighbor_helped'),
  },
  {
    id: 'quickfix_master',
    title: 'Мастер костылей',
    text: 'Принять три быстрых решения за смену',
    check: (s) => s.flags.filter((f) => QUICKFIX_FLAGS.includes(f)).length >= 3,
  },
  {
    id: 'chain_reaction',
    title: 'Цепная реакция',
    text: 'Столкнуться с последствиями собственного решения',
    check: (s) => s.log.some((entry) => entry.followUp),
  },
  {
    id: 'full_harvest',
    title: 'Всё до последнего ящика',
    text: 'Закончить смену с урожаем 95 и выше',
    check: (s) => s.status === 'finished' && s.stats.crop >= 95,
  },
  {
    id: 'reserves',
    title: 'Запас на выходные',
    text: 'Закончить смену с водой и системами не ниже 35',
    check: (s) => s.status === 'finished' && s.stats.water >= 35 && s.stats.systems >= 35,
  },
  {
    id: 'postmortem',
    title: 'Постмортем',
    text: 'Провалить смену',
    check: (s) => s.status === 'lost',
  },
]

export function getEarnedAchievements(state: GameState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(state))
}
