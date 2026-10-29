import { useEffect, useState } from 'react'
import './App.css'
import { FarmMap } from './FarmMap'
import { SpeakerBubble } from './Characters'
import {
  ACHIEVEMENTS,
  STAT_KEYS,
  getEarnedAchievements,
  SHIFT_TIMES,
  STAT_LABELS,
  createGame,
  RESERVE_LEVEL,
  getRating,
  getScore,
  isChoiceAvailable,
  makeChoice,
  type Achievement,
  type Choice,
  type Effect,
  type GameState,
  type Stats,
} from './game'

type Screen = 'menu' | 'game'

const BEST_KEY = 'agro-shift:best'

// Внутри iframe на чужом сайте браузер может запретить localStorage.
// Тогда игра работает как обычно, просто не запоминает рекорд и достижения.
function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // хранилище недоступно — молча пропускаем
  }
}

function loadBest(): number | null {
  const raw = storageGet(BEST_KEY)
  return raw === null ? null : Number(raw)
}

const ACH_KEY = 'agro-shift:achievements'

function loadAchievements(): string[] {
  try {
    return JSON.parse(storageGet(ACH_KEY) ?? '[]')
  } catch {
    return []
  }
}

// Строка изменений для журнала смены: «Урожай −8, Вода +3»
function DeltaList({ delta }: { delta: Stats }) {
  const effect = Object.fromEntries(STAT_KEYS.map((k) => [k, delta[k]])) as Effect
  return hasEffect(effect) ? <EffectList effect={effect} /> : <span className="muted">без изменений</span>
}

// Отчёт в конце смены: хронология решений и достижения
function ShiftReport({
  game,
  unlocked,
  firstTimeIds,
}: {
  game: GameState
  unlocked: string[]
  firstTimeIds: string[]
}) {
  const earned = getEarnedAchievements(game)
  return (
    <>
      <h3>Журнал смены</h3>
      <ol className="timeline">
        {game.log.map((entry, i) => (
          <li key={i} className={entry.followUp ? 'chain' : ''}>
            <span className="time">{entry.time}</span>
            <div>
              <strong>{entry.title}</strong>
              {entry.followUp && <span className="tag">последствие</span>}
              <div className="muted">{entry.choice}</div>
              <div className="delta">
                <DeltaList delta={entry.delta} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <h3>
        Достижения смены{' '}
        <span className="muted">
          · открыто всего {unlocked.length} из {ACHIEVEMENTS.length}
        </span>
      </h3>
      {earned.length === 0 ? (
        <p className="muted">В этот раз без достижений.</p>
      ) : (
        <div className="badges">
          {earned.map((a) => (
            <div key={a.id} className="badge">
              <strong>
                {a.title}
                {firstTimeIds.includes(a.id) && <span className="new">впервые</span>}
              </strong>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function EffectList({ effect, suffix = '' }: { effect: Effect; suffix?: string }) {
  return (
    <>
      {STAT_KEYS.filter((key) => effect[key]).map((key, index) => {
        const value = effect[key] ?? 0
        return (
          <span key={key} className={value > 0 ? 'plus' : 'minus'}>
            {index > 0 && ', '}
            {STAT_LABELS[key]} {value > 0 ? '+' : '−'}
            {Math.abs(value)}
            {suffix}
          </span>
        )
      })}
    </>
  )
}

const hasEffect = (effect: Effect) => STAT_KEYS.some((key) => effect[key])

// Заставка: теплица, поле и сервер — агро и IT в одной картинке
function FarmArt() {
  return (
    <svg className="art" viewBox="0 0 320 120" role="img" aria-label="Цифровая ферма">
      <rect x="0" y="92" width="320" height="28" fill="#1f3a26" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${12 + i * 22} 104 q4 -14 8 0`} stroke="#6cc56c" strokeWidth="3" fill="none" />
      ))}
      <path d="M190 92 V58 L225 36 L260 58 V92 Z" fill="#24402d" stroke="#8fd18f" strokeWidth="2" />
      <path d="M225 36 V92 M190 70 H260" stroke="#8fd18f" strokeWidth="1.5" opacity="0.6" />
      <rect x="276" y="44" width="30" height="48" rx="3" fill="#1b2721" stroke="#5f7d6a" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="281" y={50 + i * 13} width="20" height="8" rx="1" fill="#26352c" />
          <circle cx="297" cy={54 + i * 13} r="2" fill={i === 1 ? '#f0b54a' : '#6cc56c'} />
        </g>
      ))}
      <circle cx="60" cy="30" r="14" fill="#f0b54a" opacity="0.85" />
    </svg>
  )
}

function pluralEvents(n: number): string {
  return n === 1 ? 'событие' : n < 5 ? 'события' : 'событий'
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [game, setGame] = useState(() => createGame())
  const [best, setBest] = useState<number | null>(loadBest)
  const [showRules, setShowRules] = useState(false)
  const [unlocked, setUnlocked] = useState<string[]>(loadAchievements)
  // Достижения, полученные последним решением (для всплывающего уведомления)
  const [toasts, setToasts] = useState<{ achievement: Achievement; firstTime: boolean }[]>([])
  // Достижения, открытые впервые в этой смене (для отметки в отчёте)
  const [firstTimeIds, setFirstTimeIds] = useState<string[]>([])

  // Уведомление само исчезает через 5 секунд
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => setToasts([]), 5000)
    return () => clearTimeout(timer)
  }, [toasts])

  const choose = (choice: Choice) => {
    const next = makeChoice(game, choice)
    setGame(next)

    // Какие достижения появились именно после этого решения
    const before = new Set(getEarnedAchievements(game).map((a) => a.id))
    const gained = getEarnedAchievements(next).filter((a) => !before.has(a.id))
    setToasts(gained.map((a) => ({ achievement: a, firstTime: !unlocked.includes(a.id) })))
    if (gained.length > 0) {
      const newOnes = gained.filter((a) => !unlocked.includes(a.id)).map((a) => a.id)
      if (newOnes.length > 0) {
        const merged = [...unlocked, ...newOnes]
        storageSet(ACH_KEY, JSON.stringify(merged))
        setUnlocked(merged)
        setFirstTimeIds((ids) => [...ids, ...newOnes])
      }
    }

    // Сохраняем лучший результат, когда смена успешно завершена
    if (next.status === 'finished') {
      const { score } = getScore(next.stats)
      if (best === null || score > best) {
        storageSet(BEST_KEY, String(score))
        setBest(score)
      }
    }
  }

  const restart = () => {
    setToasts([])
    setFirstTimeIds([])
    setGame(createGame())
    setScreen('game')
  }

  if (screen === 'menu') {
    return (
      <main className="app">
        <section className="card start">
          <FarmArt />
          <p className="eyebrow">Цифровая ферма · дежурство</p>
          <h1>Пятница. Релиз. Урожай</h1>
          <p>
            Ты дежурный инженер цифровой фермы. До вечерней отгрузки — 2 часа, и кто знает, что
            произойдёт за это время? Сохрани урожай, воду и работоспособность систем.
          </p>
          <div className="menu">
            <button className="primary" onClick={restart}>
              Начать смену
            </button>
            <button className="secondary" onClick={() => setShowRules((v) => !v)}>
              {showRules ? 'Скрыть правила' : 'Как играть'}
            </button>
          </div>
          {showRules && (
            <ul className="rules">
              <li>Каждая смена наполнена разными событиями, меняющими ход игры.</li>
              <li>Быстрые решения могут вернуться: через пару событий придёт их продолжение.</li>
              <li>
                У тебя есть один инженер, которого ты можешь отправить решать проблему. Пока он
                занят, ты не можешь отправлять его на другие задания.
              </li>
              <li>Некоторые решения дешёвые сейчас, но бьют по ферме потом.</li>
              <li>Если любой показатель упадёт до нуля, смена провалена.</li>
              <li>
                Ферме нужен запас на выходные: вода и системы ниже {RESERVE_LEVEL} снижают итоговый
                балл.
              </li>
            </ul>
          )}
          <p className="best">
            {best === null ? 'Лучший результат появится после первой смены' : `Лучший результат: ${best}`}
            {' · '}
            Достижения: {unlocked.length} из {ACHIEVEMENTS.length}
          </p>
        </section>
      </main>
    )
  }

  const event = game.events[game.turn]
  const isOver = game.status !== 'playing'

  return (
    <main className="app">
      {toasts.length > 0 && (
        <div className="toasts" role="status">
          {toasts.map(({ achievement, firstTime }) => (
            <div key={achievement.id} className="toast">
              <span className="toast-label">
                {firstTime ? 'Новое достижение' : 'Достижение'}
              </span>
              <strong>{achievement.title}</strong>
              <span>{achievement.text}</span>
            </div>
          ))}
        </div>
      )}
      <header className="dashboard card">
        <FarmMap
          stats={game.stats}
          incidentZone={!isOver && event ? event.zone : null}
          engineerZone={!isOver && game.engineerBusy > 0 ? game.engineerZone : null}
          loaded={game.turn}
          totalLoads={game.events.length}
          scars={game.scars}
          eventId={!isOver && event ? event.id : null}
        />
        {STAT_KEYS.map((key) => (
          <div key={key} className="stat">
            <div className="stat-head">
              <span>{STAT_LABELS[key]}</span>
              <strong>{game.stats[key]}</strong>
            </div>
            <div className="bar">
              <div
                className={`fill ${game.stats[key] < 35 ? 'danger' : ''}`}
                style={{ width: `${game.stats[key]}%` }}
              />
            </div>
          </div>
        ))}
        <div className="engineer">
          Инженер:{' '}
          {game.engineerBusy > 0 ? (
            <span className="busy">
              занят ещё {game.engineerBusy} {pluralEvents(game.engineerBusy)}
            </span>
          ) : (
            <span className="free">свободен</span>
          )}
        </div>
      </header>

      {game.ongoing.length > 0 && (
        <section className="ongoing">
          {game.ongoing.map((item) => (
            <span key={item.label} className="chip">
              {item.label}: <EffectList effect={item.effect} /> · ещё {item.turnsLeft}{' '}
              {pluralEvents(item.turnsLeft)}
            </span>
          ))}
        </section>
      )}

      {game.lastOutcome && (
        <p className="outcome">
          {game.lastOutcome}
          {game.warning && <span className="warning"> {game.warning}</span>}
        </p>
      )}

      {!isOver && event && (
        <section className="card event" key={event.id}>
          {event.speaker && <SpeakerBubble speaker={event.speaker} />}
          <p className="eyebrow">
            {SHIFT_TIMES[game.turn]}
          </p>
          <h2>
            {event.title}
            {event.followUp && <span className="tag">последствие</span>}
          </h2>
          <p>{event.text}</p>
          <div className="choices">
            {event.choices.map((choice) => {
              const available = isChoiceAvailable(game, choice)
              return (
                <button
                  key={choice.label}
                  className="choice"
                  disabled={!available}
                  onClick={() => choose(choice)}
                >
                  <strong>{choice.label}</strong>
                  <span>{available ? choice.hint : 'Инженер занят'}</span>
                  {hasEffect(choice.effect) && (
                    <small>
                      Сразу: <EffectList effect={choice.effect} />
                    </small>
                  )}
                  {choice.risk && (
                    <small>
                      С вероятностью {Math.round(choice.risk.chance * 100)}%:{' '}
                      <EffectList effect={choice.risk.effect} />
                    </small>
                  )}
                  {choice.ongoing && (
                    <small>
                      Потом: <EffectList effect={choice.ongoing.effect} /> за каждое из{' '}
                      {choice.ongoing.turnsLeft} следующих событий
                    </small>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {isOver && (
        <section className="card result">
          {game.status === 'lost' ? (
            <>
              <h2>Смена провалена</h2>
              <p>Один из показателей фермы упал до нуля.</p>
            </>
          ) : (
            <>
              <h2>{getRating(game.stats).title}</h2>
              <p>{getRating(game.stats).text}</p>
              <div className="breakdown">
                <span>Отгружено урожая</span>
                <strong>{game.stats.crop}%</strong>
                <span>Штраф за малый запас воды и систем</span>
                {getScore(game.stats).penalty > 0 ? (
                  <strong className="minus">−{getScore(game.stats).penalty}</strong>
                ) : (
                  <strong className="muted">нет</strong>
                )}
              </div>
              <p className="score">Итог смены: {getScore(game.stats).score}</p>
            </>
          )}
          {game.status === 'finished' && best !== null && (
            <p className="best">Лучший результат: {best}</p>
          )}
          <div className="menu">
            <button className="primary" onClick={restart}>
              Новая смена
            </button>
            <button className="secondary" onClick={() => setScreen('menu')}>
              В меню
            </button>
          </div>
          <ShiftReport game={game} unlocked={unlocked} firstTimeIds={firstTimeIds} />
        </section>
      )}
    </main>
  )
}

export default App
