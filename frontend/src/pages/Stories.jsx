import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const GENRE_ICONS = { '판타지': '🏰', 'SF': '🚀', '공포': '👻', '현대': '🌆', '커스텀': '✏️' }

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export default function Stories() {
  const navigate = useNavigate()
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('전체')

  useEffect(() => {
    api.listPublicStories(60)
      .then(setStories)
      .catch(() => setStories([]))
      .finally(() => setLoading(false))
  }, [])

  const genres = ['전체', ...Array.from(new Set(stories.map(s => s.genre).filter(Boolean)))]
  const filtered = filter === '전체' ? stories : stories.filter(s => s.genre === filter)

  return (
    <div style={{ background: '#0a0a10', minHeight: '100vh', padding: '2rem 1rem 5rem' }}>
      <div style={{ maxWidth: '54rem', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid #1e1e2e' }}>
          <p style={{ color: '#3a3a50', fontSize: '0.68rem', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>AI DUNGEON RPG</p>
          <h1 style={{ color: '#e8e4f8', fontSize: '1.7rem', fontWeight: 800, marginBottom: '0.4rem' }}>모험 기록 갤러리</h1>
          <p style={{ color: '#6b6b90', fontSize: '0.82rem', marginBottom: '1.5rem' }}>다른 모험가들이 써내려간 전설들</p>
          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                fontSize: '0.78rem', color: '#9d7fe8',
                background: 'rgba(157,127,232,0.08)', border: '1px solid rgba(157,127,232,0.25)',
                borderRadius: '0.5rem', padding: '0.4rem 1rem', cursor: 'pointer',
              }}
            >
              ⚔ 나도 모험 시작하기
            </button>
          </div>
        </div>

        {/* Genre filter */}
        {!loading && genres.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', justifyContent: 'center' }}>
            {genres.map(g => (
              <button
                key={g}
                onClick={() => setFilter(g)}
                style={{
                  fontSize: '0.73rem', padding: '0.3rem 0.875rem', borderRadius: '9999px', cursor: 'pointer',
                  background: filter === g ? 'rgba(157,127,232,0.12)' : 'transparent',
                  color: filter === g ? '#c4b0f0' : '#6b6b90',
                  border: `1px solid ${filter === g ? 'rgba(157,127,232,0.35)' : '#1e1e2e'}`,
                  transition: 'all 0.15s',
                }}
              >
                {g !== '전체' ? (GENRE_ICONS[g] || '') + ' ' : ''}{g}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#4a4a60', fontSize: '0.85rem' }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
            <div style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '1rem' }}>◈</div>
            <p style={{ color: '#4a4a60', fontSize: '0.85rem' }}>아직 공개된 모험이 없습니다</p>
            <p style={{ color: '#3a3a50', fontSize: '0.75rem', marginTop: '0.4rem' }}>완료되거나 종료된 게임이 여기에 공유됩니다</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(15.5rem, 1fr))', gap: '0.875rem' }}>
            {filtered.map(s => (
              <div
                key={s.id}
                onClick={() => navigate(`/story/${s.id}`)}
                style={{
                  background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: '0.875rem',
                  padding: '1.125rem', cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
                  display: 'flex', flexDirection: 'column', gap: '0.4rem',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(157,127,232,0.3)'
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(157,127,232,0.06)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#1e1e2e'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Genre + status row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>{GENRE_ICONS[s.genre] || '⚔'}</span>
                  <span style={{ fontSize: '0.6rem', color: '#4a4a60', flex: 1 }}>{s.genre || '모험'}</span>
                  {s.status === 'dead'
                    ? <span style={{ fontSize: '0.58rem', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.08rem 0.35rem', borderRadius: '9999px' }}>☠ 사망</span>
                    : <span style={{ fontSize: '0.58rem', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)', padding: '0.08rem 0.35rem', borderRadius: '9999px' }}>✦ 완료</span>
                  }
                </div>

                {/* Title */}
                <h3 style={{ color: '#ddd8f0', fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{s.title}</h3>

                {/* Character info */}
                <p style={{ color: '#6b6b90', fontSize: '0.68rem', margin: 0 }}>
                  {s.character?.name} · {s.character?.class} · Lv.{s.character?.level}
                </p>

                {/* Preview */}
                {s.preview && (
                  <p style={{
                    color: '#4a4a60', fontSize: '0.68rem', lineHeight: 1.5, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {s.preview}
                  </p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ color: '#3a3a50', fontSize: '0.62rem' }}>{s.turn_count}턴</span>
                  {s.created_at && <span style={{ color: '#2a2a40', fontSize: '0.62rem', marginLeft: 'auto' }}>{timeAgo(s.created_at)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
