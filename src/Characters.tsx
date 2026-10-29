// Персонажи, которые появляются с репликой во время событий.
// Нарисованы простыми фигурами, чтобы не зависеть от внешних картинок.
import type { Speaker } from './game'

const NAMES: Record<Speaker['who'], string> = {
  neighbor: 'Сосед Михалыч',
  driver: 'Водитель',
  worker: 'Бригадир Оля',
  bot: 'ФермаБот',
}

function Mouth({ mood, x, y }: { mood: Speaker['mood']; x: number; y: number }) {
  if (mood === 'happy') return <path d={`M${x - 5} ${y} q5 5 10 0`} stroke="#3a2a22" strokeWidth="2" fill="none" strokeLinecap="round" />
  if (mood === 'angry') return <path d={`M${x - 5} ${y + 3} q5 -4 10 0`} stroke="#3a2a22" strokeWidth="2" fill="none" strokeLinecap="round" />
  if (mood === 'worried') return <ellipse cx={x} cy={y + 1} rx="3" ry="2.5" fill="#3a2a22" />
  return <path d={`M${x - 4} ${y + 1} h8`} stroke="#3a2a22" strokeWidth="2" strokeLinecap="round" />
}

function Brows({ mood, y }: { mood: Speaker['mood']; y: number }) {
  if (mood === 'angry')
    return <path d={`M27 ${y - 2} l7 3 M53 ${y - 2} l-7 3`} stroke="#3a2a22" strokeWidth="2.2" strokeLinecap="round" />
  if (mood === 'worried')
    return <path d={`M28 ${y + 1} l6 -3 M52 ${y + 1} l-6 -3`} stroke="#3a2a22" strokeWidth="2" strokeLinecap="round" />
  return null
}

function Person({ who, mood }: { who: Exclude<Speaker['who'], 'bot'>; mood: Speaker['mood'] }) {
  const shirt = who === 'neighbor' ? '#b5523b' : who === 'driver' ? '#e08a3a' : '#4f7a5a'
  return (
    <svg viewBox="0 0 80 96" className="person">
      {/* Тело */}
      <path d="M14 96 q0 -34 26 -34 q26 0 26 34 z" fill={shirt} />
      {who === 'neighbor' && <path d="M26 66 v30 M54 66 v30 M14 80 h52" stroke="#7a2f20" strokeWidth="2" opacity="0.6" />}
      {who === 'driver' && <path d="M30 64 l10 32 l10 -32" stroke="#f3d36b" strokeWidth="4" fill="none" />}
      {/* Голова */}
      <circle cx="40" cy="40" r="17" fill="#e9c09a" />
      {who === 'neighbor' && <path d="M25 46 q15 22 30 0 q-4 8 -15 8 q-11 0 -15 -8 z" fill="#8a6a4a" />}
      <circle cx="34" cy="38" r="2" fill="#2a1d17" />
      <circle cx="46" cy="38" r="2" fill="#2a1d17" />
      <Brows mood={mood} y={33} />
      <Mouth mood={mood} x={40} y={48} />
      {/* Головной убор */}
      {who === 'neighbor' && (
        <>
          <ellipse cx="40" cy="26" rx="27" ry="6" fill="#d9b25f" />
          <path d="M26 26 q2 -16 14 -16 q12 0 14 16 z" fill="#e6c477" />
          <path d="M26 23 h28" stroke="#a5452f" strokeWidth="3" />
        </>
      )}
      {who === 'driver' && (
        <>
          <path d="M23 30 q1 -17 17 -17 q16 0 17 17 z" fill="#3b6ea5" />
          <path d="M40 29 h24 q-2 5 -10 5 h-14 z" fill="#2c5683" />
        </>
      )}
      {who === 'worker' && (
        <>
          <path d="M23 32 q0 -19 17 -19 q17 0 17 19 z" fill="#6cc56c" />
          <path d="M56 28 l10 6 l-4 -10 z" fill="#6cc56c" />
          <path d="M23 46 q-4 10 2 18 M57 46 q4 10 -2 18" stroke="#7a4a2a" strokeWidth="5" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function Bot({ mood }: { mood: Speaker['mood'] }) {
  const eye = mood === 'worried' || mood === 'angry' ? '#f08a6c' : '#8fd18f'
  return (
    <svg viewBox="0 0 80 96" className="person bot">
      <path d="M40 12 v-8" stroke="#9fb6a8" strokeWidth="2" />
      <circle cx="40" cy="4" r="3.5" fill={eye} className="bot-antenna" />
      <rect x="16" y="12" width="48" height="40" rx="10" fill="#2c3b33" stroke="#9fb6a8" strokeWidth="2" />
      <rect x="22" y="18" width="36" height="26" rx="6" fill="#0e1611" />
      {mood === 'happy' ? (
        <path d="M28 32 q4 -6 8 0 M44 32 q4 -6 8 0" stroke={eye} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <rect x="29" y="25" width="6" height={mood === 'worried' ? 10 : 7} rx="2" fill={eye} />
          <rect x="45" y="25" width="6" height={mood === 'worried' ? 10 : 7} rx="2" fill={eye} />
        </>
      )}
      <path d="M24 96 v-34 q0 -6 6 -6 h20 q6 0 6 6 v34 z" fill="#2c3b33" stroke="#9fb6a8" strokeWidth="2" />
      <circle cx="40" cy="72" r="5" fill={eye} opacity="0.8" />
    </svg>
  )
}

export function SpeakerBubble({ speaker }: { speaker: Speaker }) {
  return (
    <div className="speaker">
      <div className="bubble">
        <span className="speaker-name">{NAMES[speaker.who]}</span>
        {speaker.line}
      </div>
      <div className="speaker-figure">
        {speaker.who === 'bot' ? <Bot mood={speaker.mood} /> : <Person who={speaker.who} mood={speaker.mood} />}
      </div>
    </div>
  )
}
