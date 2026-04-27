import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'

export default function GameOver() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [stats, setStats] = useState(location.state?.stats || null)
  const [game, setGame] = useState(location.state?.game || null)
  const [loading, setLoading] = useState(!stats)

  useEffect(() => {
    if (!stats && id) {
      api.completeGame(id)
        .then(data => { setStats(data.stats); setGame(data) })
        .catch(() => navigate('/dashboard'))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>처리 중...</p>
    </div>
  )

  const isDead = game?.status === 'dead'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.25rem',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border2)',
        borderRadius: '1.25rem',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '22rem',
        textAlign: 'center',
      }}>

        {/* Icon */}
        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.9 }}>
          {isDead ? '💀' : '✦'}
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.375rem' }}>
          {isDead ? '모험 종료' : '모험 완료'}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '1.75rem' }}>
          {game?.title}
        </p>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.75rem', textAlign: 'left' }}>
            {[
              { label: '총 턴 수', value: stats.turn_count },
              { label: '플레이 시간', value: `${stats.play_time_minutes}분` },
              { label: '최종 레벨', value: `Lv.${stats.final_level}` },
              { label: '최종 HP', value: stats.final_hp },
              { label: '완료 퀘스트', value: `${stats.quests_completed}개` },
              { label: '보유 아이템', value: `${stats.inventory_count}개` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: '#0d0d1a',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
              }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.65rem', marginBottom: '0.25rem', letterSpacing: '0.03em' }}>{label}</p>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            onClick={() => navigate('/new-game')}
            style={{
              flex: 1, padding: '0.7rem',
              background: 'linear-gradient(135deg, #6a3fa0, var(--purple))',
              color: '#fff', borderRadius: '0.75rem',
              fontWeight: 700, fontSize: '0.85rem',
              border: 'none', cursor: 'pointer',
            }}
          >
            새 모험
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              flex: 1, padding: '0.7rem',
              background: 'var(--surface2)',
              color: 'var(--text-dim)',
              border: '1px solid var(--border2)',
              borderRadius: '0.75rem',
              fontWeight: 600, fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e1e30'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface2)'}
          >
            대시보드
          </button>
        </div>
      </div>
    </div>
  )
}
