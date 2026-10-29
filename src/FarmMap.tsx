// Схема фермы: показатели и события видны прямо на картинке.
import type { Scar, Stats, Zone } from './game'

type Props = {
  stats: Stats
  incidentZone: Zone | null
  engineerZone: Zone | null
  // Сколько событий смены уже позади — столько ящиков в кузове
  loaded: number
  totalLoads: number
  // Следы прошлых решений и текущее событие (для эффектов)
  scars: Scar[]
  eventId: string | null
}

const ZONE_X: Record<Zone, number> = {
  field: 126,
  greenhouse: 301,
  barn: 406,
  dock: 506,
  water: 591,
  server: 668,
}

const ZONE_LABEL: Record<Zone, string> = {
  field: 'Поле',
  greenhouse: 'Теплица',
  barn: 'Коровник',
  dock: 'Отгрузка',
  water: 'Вода',
  server: 'Сервер',
}

const GROUND = 168
const PLANTS = 24

export function FarmMap({ stats, incidentZone, engineerZone, loaded, totalLoads, scars, eventId }: Props) {
  const has = (scar: Scar) => scars.includes(scar)
  const healthy = Math.round((stats.crop / 100) * PLANTS)
  const leds = 5
  const greenLeds = Math.round((stats.systems / 100) * leds)
  const tankHeight = 70
  const waterLevel = (stats.water / 100) * tankHeight
  const greenhouseHot = incidentZone === 'greenhouse' || has('greenhouse_burn')
  const cowWorried = incidentZone === 'barn' || has('cow_hungry')
  const truckAlert = incidentZone === 'dock'
  const serverAlarm = incidentZone === 'server'
  // Ящики в кузове: сколько отгружено и в каком состоянии урожай
  const crates = Math.min(6, Math.round((loaded / totalLoads) * 6))
  const crateColor = stats.crop >= 60 ? '#c9a15a' : stats.crop >= 35 ? '#a7834a' : '#7a5a36'

  return (
    <svg className="farm-map" viewBox="0 0 720 210" role="img" aria-label="Схема фермы">
      {/* Земля */}
      <rect x="0" y={GROUND} width="720" height="42" fill="#1a2e20" />

      {/* Поле: зелёные ростки — сохранённый урожай, бурые — потерянный */}
      <rect x="16" y="96" width="220" height={GROUND - 96} rx="6" fill="#203826" />
      {Array.from({ length: PLANTS }, (_, i) => {
        const col = i % 8
        const row = Math.floor(i / 8)
        const x = 32 + col * 26
        const y = 118 + row * 20
        const alive = i < healthy
        return (
          <path
            key={i}
            d={alive ? `M${x} ${y} q5 -14 10 0 M${x + 5} ${y} v-8` : `M${x} ${y} q3 -8 10 -2 M${x + 2} ${y} v-4`}
            stroke={alive ? '#6cc56c' : '#9a6a3a'}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            className="plant"
          />
        )
      })}

      {/* Теплица: при перегреве краснеет и над ней идёт жар */}
      <g className={greenhouseHot ? 'greenhouse hot' : 'greenhouse'}>
        <path
          d={`M256 ${GROUND} V112 L301 84 L346 112 V${GROUND} Z`}
          fill={greenhouseHot ? '#4a2a22' : '#24402d'}
          stroke={greenhouseHot ? '#f08a6c' : '#8fd18f'}
          strokeWidth="2"
        />
        <path d={`M301 84 V${GROUND} M256 136 H346`} stroke={greenhouseHot ? '#f08a6c' : '#8fd18f'} strokeWidth="1.2" opacity="0.5" />
        {[270, 292, 314, 334].map((x, i) => {
          const alive = stats.crop >= 25 * (i + 1) - 10
          return (
            <path
              key={x}
              d={`M${x - 5} ${GROUND - 4} q5 -14 10 0 M${x} ${GROUND - 4} v-10`}
              stroke={alive ? (greenhouseHot ? '#d9a35a' : '#6cc56c') : '#9a6a3a'}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          )
        })}
        {greenhouseHot &&
          [282, 301, 320].map((x, i) => (
            <path
              key={x}
              className="heat"
              style={{ animationDelay: `${i * 0.3}s` }}
              d={`M${x} 76 q4 -5 0 -10 q-4 -5 0 -10`}
              stroke="#f08a6c"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          ))}
      </g>

      {/* Коровник */}
      <path d={`M366 ${GROUND} V118 L406 94 L446 118 V${GROUND} Z`} fill="#3a2a22" stroke="#c98d6a" strokeWidth="2" />
      <rect x="388" y="128" width="36" height={GROUND - 128} fill="#1e1511" stroke="#c98d6a" strokeWidth="1.5" />
      {/* Корова в воротах: при сбое кормораздатчика волнуется */}
      <g className={cowWorried ? 'cow worried' : 'cow'}>
        <rect x="392" y="148" width="28" height="14" rx="6" fill="#ece6da" />
        <circle cx="400" cy="154" r="3" fill="#3a2f2a" />
        <circle cx="413" cy="157" r="2.5" fill="#3a2f2a" />
        <rect x="395" y="160" width="3" height="8" fill="#ece6da" />
        <rect x="414" y="160" width="3" height="8" fill="#ece6da" />
        <ellipse cx="406" cy="141" rx="8" ry="7" fill="#ece6da" />
        <ellipse cx="406" cy="145" rx="5" ry="3" fill="#e8b4a6" />
        <path d="M398 136 l-4 -3 M414 136 l4 -3" stroke="#d6c7a8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="403" cy="139" r="1.2" fill="#1a1411" />
        <circle cx="409" cy="139" r="1.2" fill="#1a1411" />
      </g>
      {cowWorried && (
        <g className="moo">
          <rect x="420" y="106" width="34" height="16" rx="8" fill="#ece6da" />
          <text x="437" y="118" textAnchor="middle" className="moo-text">
            Му?!
          </text>
        </g>
      )}

      {/* Отгрузка: кузов наполняется ящиками по ходу смены */}
      {Array.from({ length: crates }, (_, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        return (
          <g key={i} className="crate">
            <rect x={468 + col * 16} y={134 - row * 13} width="14" height="12" rx="1.5" fill={crateColor} stroke="#5a4426" strokeWidth="1" />
            <path d={`M${468 + col * 16} ${140 - row * 13} h14`} stroke="#5a4426" strokeWidth="1" />
          </g>
        )
      })}
      <rect x="464" y="146" width="54" height="10" rx="2" fill="#2c3b33" stroke="#9fb6a8" strokeWidth="2" />
      <path d="M518 156 V132 h14 l12 12 v12 z" fill="#2c3b33" stroke="#9fb6a8" strokeWidth="2" />
      <path d="M522 136 h9 l8 8 h-17 z" fill="#5f8fb0" opacity="0.6" />
      <circle cx="543" cy="150" r="2.5" className={truckAlert ? 'hazard' : ''} fill={truckAlert ? '#f0b54a' : '#5f7d6a'} />
      <circle cx="482" cy="161" r="6" fill="#0e1611" stroke="#9fb6a8" strokeWidth="2" />
      <circle cx="530" cy="161" r="6" fill="#0e1611" stroke="#9fb6a8" strokeWidth="2" />

      {/* Бак: уровень воды */}
      <rect x="566" y={GROUND - tankHeight - 8} width="50" height={tankHeight} rx="4" fill="#15241c" stroke="#5f8fb0" strokeWidth="2" />
      <rect
        x="568"
        y={GROUND - 8 - waterLevel}
        width="46"
        height={Math.max(0, waterLevel - 2)}
        rx="2"
        fill={stats.water < 25 ? '#e0684b' : '#4f9fd6'}
        className="tank-water"
      />
      <path d={`M576 ${GROUND - 8} v8 M606 ${GROUND - 8} v8`} stroke="#5f8fb0" strokeWidth="3" />

      {/* Сервер: зелёные индикаторы — работающие системы */}
      <rect x="640" y="92" width="56" height={GROUND - 92} rx="4" fill="#1b2721" stroke="#5f7d6a" strokeWidth="2" />
      {Array.from({ length: leds }, (_, i) => (
        <g key={i} className={serverAlarm ? 'server-alarm' : ''} style={{ animationDelay: `${i * 0.12}s` }}>
          <rect x="648" y={100 + i * 13} width="40" height="8" rx="1" fill="#26352c" />
          <circle cx="682" cy={104 + i * 13} r="2.5" fill={i < greenLeds ? '#6cc56c' : '#e0684b'} />
        </g>
      ))}

      {/* ---------- Следы прошлых решений ---------- */}

      {/* Лужа на поле: датчик врёт, вода утекает */}
      {has('puddle') && (
        <g opacity="0.85">
          <ellipse cx="90" cy="162" rx="34" ry="5" fill="#4f9fd6" opacity="0.6" />
          <ellipse cx="170" cy="164" rx="22" ry="4" fill="#4f9fd6" opacity="0.5" />
        </g>
      )}
      {/* Колея от трактора */}
      {has('tracks') && (
        <path d="M20 150 C 80 140, 150 160, 236 146 M20 158 C 80 148, 150 168, 236 154" stroke="#4a3626" strokeWidth="3" strokeDasharray="6 4" fill="none" opacity="0.9" />
      )}
      {/* Следы града */}
      {has('hail_damage') &&
        [40, 70, 98, 130, 160, 190, 214, 55, 120, 178].map((x, i) => (
          <circle key={x} cx={x} cy={104 + (i % 3) * 22} r="2.2" fill="#e8f0ff" opacity="0.85" />
        ))}
      {/* Защитные сетки над полем */}
      {has('nets') && (
        <g stroke="#cfd9d2" strokeWidth="1" opacity="0.45">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${16 + i * 20} 96 l40 72 M${56 + i * 20 - 40} 96 l-40 72`} />
          ))}
        </g>
      )}
      {/* Вредители на поле без наблюдения */}
      {has('pests') &&
        [60, 132, 196].map((x, i) => (
          <g key={x} className="pest" style={{ animationDelay: `${i * 0.4}s` }}>
            <ellipse cx={x} cy={122 + i * 14} rx="4" ry="3" fill="#2a1d17" />
            <path d={`M${x - 4} ${122 + i * 14} l-3 -2 M${x + 4} ${122 + i * 14} l3 -2`} stroke="#2a1d17" strokeWidth="1" />
          </g>
        ))}
      {/* Сломанный дрон кружит криво и дымит */}
      {has('drone_broken') && (
        <g className="drone-broken" transform="translate(196 70) rotate(-14)">
          <rect x="-12" y="-3" width="24" height="6" rx="3" fill="#5f7d6a" />
          <path d="M-18 -6 h12 M6 -6 h12" stroke="#9fb6a8" strokeWidth="2" />
          <circle cx="0" cy="0" r="2" fill="#e0684b" />
          <circle cx="10" cy="-14" r="4" fill="#6b746f" opacity="0.6" className="smoke" />
        </g>
      )}
      {/* Запотевшая теплица после аварийного охлаждения */}
      {has('greenhouse_fog') && (
        <g>
          <path d={`M258 ${GROUND - 1} V113 L301 86 L344 113 V${GROUND - 1} Z`} fill="#dfeef5" opacity="0.18" />
          {[268, 284, 318, 334, 296, 326].map((x, i) => (
            <circle key={x} cx={x} cy={118 + (i % 3) * 12} r="1.8" fill="#bfe3f5" opacity="0.8" />
          ))}
        </g>
      )}
      {/* Голодная корова: пустая кормушка */}
      {has('cow_hungry') && (
        <g>
          <path d={`M366 ${GROUND - 2} h18 l-3 -8 h-12 z`} fill="#5a4426" stroke="#c98d6a" strokeWidth="1" />
        </g>
      )}
      {/* Тюк сена после ручного кормления */}
      {has('hay') && (
        <g>
          <rect x="430" y={GROUND - 14} width="20" height="14" rx="3" fill="#d9b25f" />
          <path d={`M434 ${GROUND - 14} v14 M446 ${GROUND - 14} v14`} stroke="#a5843f" strokeWidth="1.5" />
        </g>
      )}
      {/* Бумажные накладные у грузовика */}
      {has('papers') && (
        <g transform={`translate(452 ${GROUND - 12})`}>
          <rect x="0" y="2" width="12" height="9" fill="#e8e2d0" transform="rotate(-10)" />
          <rect x="2" y="0" width="12" height="9" fill="#f5f0e2" />
          <path d="M4 3 h8 M4 5.5 h8 M4 8 h5" stroke="#8a8270" strokeWidth="0.8" />
        </g>
      )}
      {/* Перекрытая дорога */}
      {has('road_block') &&
        [452, 556].map((x) => (
          <g key={x}>
            <path d={`M${x - 5} ${GROUND} l5 -14 l5 14 z`} fill="#f08a3a" />
            <path d={`M${x - 3} ${GROUND - 5} h6`} stroke="#fff" strokeWidth="2" />
          </g>
        ))}
      {/* Утечка из бака */}
      {has('leak') && (
        <g>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={584 + i * 9} cy={GROUND - 6} r="2" fill="#4f9fd6" className="drip" style={{ animationDelay: `${i * 0.35}s` }} />
          ))}
          <ellipse cx="591" cy={GROUND + 3} rx="22" ry="3" fill="#4f9fd6" opacity="0.5" />
        </g>
      )}
      {/* Дым из сервера */}
      {(has('server_smoke') || eventId === 'server_down') &&
        [0, 1, 2].map((i) => (
          <circle key={i} cx={660 + i * 10} cy="86" r="6" fill="#6b746f" className="smoke" style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
      {/* Предупреждение безопасности на сервере */}
      {has('server_warning') && (
        <g transform="translate(646 76)">
          <path d="M0 14 L8 0 L16 14 Z" fill="#f0b54a" />
          <path d="M8 5 v4 M8 11 v1" stroke="#1a140a" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}

      {/* ---------- Эффекты текущего события ---------- */}

      {/* Датчик влажности показывает 140% */}
      {(eventId === 'humidity' || eventId === 'controller_dead') && (
        <g>
          <path d="M220 168 V112" stroke="#9fb6a8" strokeWidth="2" />
          <rect x="198" y="96" width="44" height="18" rx="3" fill="#0e1611" stroke="#e0684b" strokeWidth="1.5" />
          <text x="220" y="109" textAnchor="middle" className="sensor-text blink-text">
            {eventId === 'humidity' ? '140%' : 'ERR'}
          </text>
        </g>
      )}
      {/* Туча с градом над полем */}
      {eventId === 'hail' && (
        <g>
          <path d="M70 46 q0 -16 18 -16 q6 -12 22 -8 q16 -6 24 8 q16 0 16 16 z" fill="#4a5a66" />
          {[84, 104, 124, 140].map((x, i) => (
            <circle key={x} cx={x} cy="52" r="2.5" fill="#e8f0ff" className="hail" style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </g>
      )}
      {/* Потерявшийся дрон над лесополосой */}
      {eventId === 'drone' && (
        <g transform="translate(206 66)">
          <g className="drone-lost">
          <rect x="-12" y="-3" width="24" height="6" rx="3" fill="#5f7d6a" />
          <path d="M-18 -6 h12 M6 -6 h12" stroke="#9fb6a8" strokeWidth="2" />
          <circle cx="0" cy="0" r="2.5" fill="#e0684b" className="blink-dot" />
          <text x="16" y="-10" className="sensor-text">?</text>
          </g>
        </g>
      )}
      {/* Дрон в пруду: пузыри возле бака */}
      {eventId === 'drone_pond' &&
        [0, 1, 2].map((i) => (
          <circle key={i} cx={578 + i * 12} cy={GROUND - 30} r="3" fill="none" stroke="#bfe3f5" strokeWidth="1.5" className="bubble-up" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
      {/* Утечка в магистрали: брызги у бака */}
      {eventId === 'leak' &&
        [0, 1, 2, 3].map((i) => (
          <circle key={i} cx={560 - i * 6} cy={GROUND - 4} r="2" fill="#4f9fd6" className="drip" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      {/* Застрявший робот-сборщик */}
      {eventId === 'robot' && (
        <g className="robot-stuck" transform="translate(150 150)">
          <rect x="-10" y="-10" width="20" height="12" rx="3" fill="#9fb6a8" />
          <circle cx="-6" cy="4" r="3.5" fill="#2c3b33" />
          <circle cx="6" cy="4" r="3.5" fill="#2c3b33" />
          <circle cx="0" cy="-13" r="2.5" fill="#e0684b" className="blink-dot" />
        </g>
      )}
      {/* Сосед перекрыл дорогу трактором */}
      {eventId === 'neighbor_blocks' && (
        <g transform={`translate(440 ${GROUND - 4})`}>
          <rect x="-14" y="-16" width="20" height="10" rx="2" fill="#b5523b" />
          <rect x="-6" y="-26" width="10" height="10" fill="none" stroke="#b5523b" strokeWidth="2" />
          <circle cx="-9" cy="-3" r="5" fill="#2c3b33" />
          <circle cx="5" cy="-2" r="3.5" fill="#2c3b33" />
        </g>
      )}

      {/* Подписи участков */}
      {(Object.keys(ZONE_X) as Zone[]).map((zone) => (
        <text
          key={zone}
          x={ZONE_X[zone]}
          y="196"
          textAnchor="middle"
          className={`zone-label ${zone === incidentZone ? 'active' : ''}`}
        >
          {ZONE_LABEL[zone]}
        </text>
      ))}

      {/* Где сейчас проблема */}
      {incidentZone && (
        <g className="incident" transform={`translate(${ZONE_X[incidentZone]} 52)`}>
          <circle r="16" className="incident-pulse" />
          <circle r="11" fill="#e0684b" />
          <text y="5" textAnchor="middle" className="incident-mark">
            !
          </text>
        </g>
      )}

      {/* Где сейчас инженер */}
      {engineerZone && (
        <g transform={`translate(${ZONE_X[engineerZone] + (engineerZone === incidentZone ? 32 : 0)} 38) scale(1.3)`}>
          <circle cy="0" r="6" fill="#f0b54a" />
          <path d="M-8 22 q8 -18 16 0 z" fill="#f0b54a" />
          <rect x="-7" y="-8" width="14" height="4" rx="2" fill="#ffd27a" />
        </g>
      )}
    </svg>
  )
}
