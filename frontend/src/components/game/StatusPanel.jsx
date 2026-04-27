export default function StatusPanel({ character, onOpenSheet }) {
  if (!character) return null
  const { stats, inventory, quests, location, level, xp, xp_to_next, in_battle, status_effects } = character
  if (!stats) return null

  const hpPct = Math.max(0, Math.min(100, (stats.hp / (stats.max_hp || 1)) * 100))
  const mpPct = Math.max(0, Math.min(100, (stats.mp / (stats.max_mp || 1)) * 100))
  const xpPct = Math.max(0, Math.min(100, ((xp || 0) / (xp_to_next || 100)) * 100))

  const hpColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#f59e0b' : '#ef4444'

  return (
    <div
      style={{
        width: '15rem',
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        overflowY: 'auto',
        fontSize: '0.78rem',
      }}
    >
      {/* Character header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: 700, color: 'var(--gold-light)', fontSize: '0.875rem', letterSpacing: '0.02em' }}>
            {character.name}
          </p>
          <p style={{ color: 'var(--muted)', marginTop: '0.15rem', fontSize: '0.7rem' }}>
            {character.class} · Lv.{level || 1}
          </p>
        </div>
        <button
          onClick={onOpenSheet}
          style={{
            fontSize: '0.65rem',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '0.2rem 0.5rem',
            background: 'transparent',
            cursor: 'pointer',
            letterSpacing: '0.03em',
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--gold)'
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--muted)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          시트
        </button>
      </div>

      {/* Battle indicator */}
      {in_battle && (
        <div
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: '0.5rem',
            padding: '0.375rem 0.625rem',
            color: '#fca5a5',
            textAlign: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            animation: 'pulse 2s infinite',
          }}
        >
          ⚔ 전투 중
        </div>
      )}

      {/* HP */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ color: 'var(--muted)', letterSpacing: '0.05em' }}>HP</span>
          <span style={{ color: hpColor, fontFamily: 'monospace', fontWeight: 600 }}>
            {stats.hp}/{stats.max_hp}
          </span>
        </div>
        <div style={{ height: '4px', background: 'var(--bg)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${hpPct}%`,
              background: hpColor,
              borderRadius: '9999px',
              transition: 'width 0.4s, background 0.4s',
              boxShadow: `0 0 6px ${hpColor}60`,
            }}
          />
        </div>
      </div>

      {/* MP */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ color: 'var(--muted)', letterSpacing: '0.05em' }}>MP</span>
          <span style={{ color: '#818cf8', fontFamily: 'monospace', fontWeight: 600 }}>
            {stats.mp}/{stats.max_mp}
          </span>
        </div>
        <div style={{ height: '4px', background: 'var(--bg)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${mpPct}%`,
              background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
              borderRadius: '9999px',
              transition: 'width 0.4s',
              boxShadow: '0 0 6px rgba(129,140,248,0.4)',
            }}
          />
        </div>
      </div>

      {/* XP */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ color: 'var(--muted)', letterSpacing: '0.05em' }}>XP</span>
          <span style={{ color: 'rgba(201,168,76,0.8)', fontFamily: 'monospace', fontWeight: 600 }}>
            {xp || 0}/{xp_to_next || 100}
          </span>
        </div>
        <div style={{ height: '4px', background: 'var(--bg)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${xpPct}%`,
              background: 'linear-gradient(90deg, #8a6820, var(--gold))',
              borderRadius: '9999px',
              transition: 'width 0.4s',
              boxShadow: '0 0 6px rgba(201,168,76,0.3)',
            }}
          />
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border)' }} />

      {/* Location */}
      <div>
        <p style={{ color: 'var(--muted)', marginBottom: '0.3rem', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
          ◈ 현재 위치
        </p>
        <p style={{ color: 'var(--text)', fontStyle: 'italic', fontSize: '0.8rem' }}>{location || '???'}</p>
      </div>

      {/* Status effects */}
      {status_effects?.length > 0 && (
        <div>
          <p style={{ color: 'var(--muted)', marginBottom: '0.375rem', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
            ✦ 상태이상
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {status_effects.map((e, i) => (
              <span
                key={i}
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139,92,246,0.35)',
                  borderRadius: '0.375rem',
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.65rem',
                }}
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Inventory */}
      {(inventory?.length > 0) && (
        <div>
          <p style={{ color: 'var(--muted)', marginBottom: '0.375rem', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
            ⚔ 인벤토리 ({inventory.length})
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {inventory.map((item, i) => (
              <li
                key={i}
                title={item}
                style={{
                  color: '#a89880',
                  background: 'var(--bg)',
                  borderRadius: '0.375rem',
                  padding: '0.3rem 0.5rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.72rem',
                  border: '1px solid var(--border)',
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quests */}
      {quests?.length > 0 && (
        <div>
          <p style={{ color: 'var(--muted)', marginBottom: '0.375rem', letterSpacing: '0.06em', fontSize: '0.65rem' }}>
            ◆ 퀘스트 ({quests.length})
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {quests.map((q, i) => (
              <li key={i} style={{ color: 'var(--text)', display: 'flex', alignItems: 'flex-start', gap: '0.375rem', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--gold)', marginTop: '0.1rem', flexShrink: 0 }}>▸</span>
                <span style={{ lineHeight: 1.4 }}>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}