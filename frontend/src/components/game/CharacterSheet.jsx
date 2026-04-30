const STAT_LABELS = {
  hp: 'HP', max_hp: null, mp: 'MP', max_mp: null,
  strength: '힘', intelligence: '지능', agility: '민첩', charisma: '카리스마',
}
const STAT_COLORS = {
  hp: '#ef4444', mp: '#818cf8',
  strength: '#f97316', intelligence: '#a78bfa',
  agility: '#34d399', charisma: '#fbbf24',
}

function StatBar({ label, value, max, color }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : null
  return (
    <div style={{ background: '#0a0a10', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid #1e1e30' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: pct != null ? '0.3rem' : 0 }}>
        <span style={{ fontSize: '0.65rem', color: '#5a5570', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600, color }}>
          {max != null ? `${value}/${max}` : value}
        </span>
      </div>
      {pct != null && (
        <div style={{ height: '3px', background: '#1e1e30', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '9999px', transition: 'width 0.3s', boxShadow: `0 0 4px ${color}80` }} />
        </div>
      )}
    </div>
  )
}

export default function CharacterSheet({ character, visitedLocations = [], onClose }) {
  if (!character) return null
  const { name, class: cls, background, level, xp, xp_to_next, stats, inventory, quests, quest_details, status_effects, location } = character
  const xpPct = Math.min(100, ((xp || 0) / (xp_to_next || 100)) * 100)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111120', border: '1px solid #2a2a40',
          borderRadius: '1.25rem', width: '100%', maxWidth: '26rem',
          maxHeight: '88vh', overflowY: 'auto', padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 40px rgba(157,127,232,0.06)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontWeight: 800, color: '#e8e4f8', fontSize: '1.1rem', letterSpacing: '0.02em' }}>{name}</h2>
              <span style={{ fontSize: '0.6rem', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.35)', padding: '0.1rem 0.45rem', borderRadius: '9999px' }}>
                Lv.{level || 1}
              </span>
            </div>
            <p style={{ color: '#9d7fe8', fontSize: '0.72rem', marginTop: '0.2rem' }}>{cls}</p>
            {background && (
              <p style={{ color: '#4a4a60', fontSize: '0.65rem', marginTop: '0.25rem', lineHeight: 1.4, maxWidth: '18rem' }}>{background}</p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#3a3a50', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: '0.1rem' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e8e4f8'}
            onMouseLeave={e => e.currentTarget.style.color = '#3a3a50'}
          >×</button>
        </div>

        <div style={{ height: '1px', background: '#1e1e30' }} />

        {/* Stats */}
        <div>
          <p style={{ fontSize: '0.6rem', color: '#5a5570', letterSpacing: '0.1em', marginBottom: '0.625rem' }}>◈ 능력치</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <StatBar label="HP" value={stats?.hp ?? 0} max={stats?.max_hp} color="#ef4444" />
            <StatBar label="MP" value={stats?.mp ?? 0} max={stats?.max_mp} color="#818cf8" />
            <StatBar label="힘" value={stats?.strength ?? 0} color="#f97316" />
            <StatBar label="지능" value={stats?.intelligence ?? 0} color="#a78bfa" />
            <StatBar label="민첩" value={stats?.agility ?? 0} color="#34d399" />
            <StatBar label="카리스마" value={stats?.charisma ?? 0} color="#fbbf24" />
          </div>
        </div>

        {/* XP */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.6rem', color: '#5a5570', letterSpacing: '0.08em' }}>경험치</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'rgba(201,168,76,0.8)' }}>{xp || 0} / {xp_to_next || 100}</span>
          </div>
          <div style={{ height: '4px', background: '#0a0a10', borderRadius: '9999px', overflow: 'hidden', border: '1px solid #1e1e30' }}>
            <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, #8a6820, #c9a84c)', borderRadius: '9999px', transition: 'width 0.3s', boxShadow: '0 0 6px rgba(201,168,76,0.4)' }} />
          </div>
        </div>

        {/* Location */}
        <div>
          <p style={{ fontSize: '0.6rem', color: '#5a5570', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>◈ 현재 위치</p>
          <p style={{ color: '#a09ab8', fontSize: '0.8rem', fontStyle: 'italic' }}>{location || '???'}</p>
          {visitedLocations.length > 1 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.58rem', color: '#3a3a50', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>방문한 장소 ({visitedLocations.length})</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {visitedLocations.map((loc, i) => (
                  <span key={i} style={{
                    fontSize: '0.62rem', color: loc === location ? '#c9a84c' : '#4a4a60',
                    background: loc === location ? 'rgba(201,168,76,0.08)' : 'transparent',
                    border: `1px solid ${loc === location ? 'rgba(201,168,76,0.3)' : '#1e1e30'}`,
                    borderRadius: '0.25rem', padding: '0.1rem 0.4rem',
                  }}>
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status effects */}
        {status_effects?.length > 0 && (
          <div>
            <p style={{ fontSize: '0.6rem', color: '#5a5570', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>✦ 상태이상</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {status_effects.map((e, i) => (
                <span key={i} style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '0.375rem', padding: '0.15rem 0.5rem', fontSize: '0.65rem' }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Inventory */}
        {inventory?.length > 0 && (
          <div>
            <p style={{ fontSize: '0.6rem', color: '#5a5570', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>◈ 인벤토리 ({inventory.length})</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
              {inventory.map((item, i) => (
                <div key={i} title={item} style={{
                  background: '#0a0a10', border: '1px solid #1e1e30', borderRadius: '0.5rem',
                  padding: '0.4rem 0.625rem', fontSize: '0.72rem', color: '#a89880',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quests */}
        {quests?.length > 0 && (
          <div>
            <p style={{ fontSize: '0.6rem', color: '#5a5570', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>◆ 퀘스트 ({quests.length})</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {quests.map((q, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                  <span style={{ color: '#c9a84c', flexShrink: 0, marginTop: '0.05rem', fontSize: '0.7rem' }}>▸</span>
                  <div>
                    <span style={{ color: '#e8e4f8', fontSize: '0.78rem', lineHeight: 1.4 }}>{q}</span>
                    {quest_details?.[q] && (
                      <p style={{ color: '#5a5570', fontSize: '0.65rem', marginTop: '0.15rem', lineHeight: 1.4 }}>{quest_details[q]}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
