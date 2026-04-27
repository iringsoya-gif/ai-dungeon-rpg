import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { api } from '../lib/api'
import { useStream } from '../hooks/useStream'
import StreamText from '../components/ui/StreamText'
import StatusPanel from '../components/game/StatusPanel'
import CharacterSheet from '../components/game/CharacterSheet'

/* **행동** → gold italic / 일반 텍스트 → 대사 */
function renderPlayerMsg(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <em key={i} style={{ color: '#d4a843', fontStyle: 'italic', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </em>
      )
    }
    return <span key={i}>{part}</span>
  })
}

/* JSON 블록 제거 */
function stripJson(text) {
  return (text || '').replace(/```json[\s\S]*?```/g, '').trim()
}

export default function Game() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { game, histories, streamText, setGame } = useGameStore()
  const { streaming, streamError, sendAction, cancel } = useStream()
  const [input, setInput]       = useState('')
  const [showSheet, setShowSheet]   = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => () => cancel(), [])

  useEffect(() => {
    api.getGame(id).then(setGame).catch(() => navigate('/dashboard'))
  }, [id, navigate, setGame])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [histories, streamText])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || streaming) return
    const text = input.trim()
    setInput('')
    await sendAction(id, text)
  }

  if (!game) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a10' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.6 }}>⚔</div>
        <p style={{ color: '#4a4a60', fontSize: '0.85rem' }}>불러오는 중...</p>
      </div>
    </div>
  )

  const isDead = game.status === 'dead' || game.status === 'completed'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a10' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.625rem 1.25rem',
        background: 'rgba(10,10,16,0.95)',
        borderBottom: '1px solid #1e1e2e',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ color: '#4a4a60', fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#c9a84c'}
          onMouseLeave={e => e.currentTarget.style.color = '#4a4a60'}
        >
          ← 대시보드
        </button>

        <span style={{ color: '#1e1e2e' }}>│</span>

        <span style={{ fontWeight: 700, color: '#e8e4f8', fontSize: '0.9rem', letterSpacing: '0.02em' }}>
          {game.title}
        </span>

        {game.hardcore_mode && (
          <span style={{ fontSize: '0.6rem', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)', padding: '0.1rem 0.45rem', borderRadius: '9999px', background: 'rgba(239,68,68,0.06)' }}>
            ☠ HC
          </span>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#3a3a50', fontFamily: 'monospace' }}>
          T-{game.turn_count}
        </span>

        {!isDead && (
          <button
            onClick={async () => {
              if (!confirm('모험을 완료하시겠습니까?')) return
              try {
                const data = await api.completeGame(id)
                navigate(`/games/${id}/over`, { state: { stats: data.stats, game: data } })
              } catch { navigate('/dashboard') }
            }}
            className="hidden md:block"
            style={{ fontSize: '0.7rem', color: '#4a4a60', border: '1px solid #1e1e2e', borderRadius: '0.375rem', padding: '0.2rem 0.55rem', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c9a84c'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#4a4a60'; e.currentTarget.style.borderColor = '#1e1e2e' }}
          >
            완료
          </button>
        )}

        <button
          onClick={() => setShowSidebar(s => !s)}
          className="md:hidden"
          style={{ fontSize: '0.7rem', color: '#4a4a60', border: '1px solid #1e1e2e', borderRadius: '0.375rem', padding: '0.2rem 0.55rem', background: 'transparent', cursor: 'pointer' }}
        >
          {showSidebar ? '닫기' : '상태'}
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Chat ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
            <div style={{ maxWidth: '46rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {histories.map((h, i) => (
                h.role === 'player' ? (
                  /* ── Player bubble ── */
                  <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '28rem',
                      background: '#131828',
                      border: '1px solid #1e2a42',
                      borderRadius: '1.25rem 1.25rem 0.25rem 1.25rem',
                      padding: '0.75rem 1rem',
                    }}>
                      <p style={{ fontSize: '0.875rem', lineHeight: 1.7, margin: 0, color: '#c8d8f0' }}>
                        {renderPlayerMsg(h.content)}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* ── GM bubble ── */
                  <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #1a1430, #2a1f50)',
                      border: '1px solid #3a2e60',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', color: '#9d7fe8', marginTop: '0.125rem',
                    }}>
                      ✦
                    </div>
                    <div style={{
                      flex: 1,
                      background: '#111120',
                      border: '1px solid #1e1e30',
                      borderRadius: '0.25rem 1.25rem 1.25rem 1.25rem',
                      padding: '0.875rem 1.125rem',
                    }}>
                      <span style={{ fontSize: '0.6rem', color: '#5a4a80', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                        GAME MASTER
                      </span>
                      <p style={{ fontSize: '0.9rem', color: '#ddd8f0', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-wrap' }}>
                        {stripJson(h.content)}
                      </p>
                    </div>
                  </div>
                )
              ))}

              {/* Streaming */}
              {streaming && (
                <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #1a1430, #2a1f50)',
                    border: '1px solid #3a2e60',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', color: '#9d7fe8',
                  }}>
                    ✦
                  </div>
                  <div style={{
                    flex: 1, background: '#111120', border: '1px solid #1e1e30',
                    borderRadius: '0.25rem 1.25rem 1.25rem 1.25rem', padding: '0.875rem 1.125rem',
                  }}>
                    <span style={{ fontSize: '0.6rem', color: '#5a4a80', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                      GAME MASTER
                    </span>
                    <div style={{ fontSize: '0.9rem', color: '#ddd8f0', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                      <StreamText text={stripJson(streamText)} isStreaming={true} />
                      <span className="cursor-blink" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {streamError && (
                <div style={{
                  background: 'rgba(80,10,10,0.5)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '0.75rem', padding: '0.75rem 1rem',
                  fontSize: '0.8rem', color: '#fca5a5',
                }}>
                  ⚠ {streamError}
                </div>
              )}

              {/* Game over */}
              {isDead && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.8 }}>💀</div>
                  <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>모험이 종료되었습니다</p>
                  <p style={{ color: '#4a4a60', fontSize: '0.8rem', marginBottom: '2rem' }}>당신의 전설은 역사에 기록될 것입니다</p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => navigate('/new-game')}
                      style={{ padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #8a6820, #c9a84c)', color: '#0a0805', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
                    >
                      새 모험 시작
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const data = await api.completeGame(id)
                          navigate(`/games/${id}/over`, { state: { stats: data.stats, game: data } })
                        } catch { navigate(`/games/${id}/over`) }
                      }}
                      style={{ padding: '0.6rem 1.5rem', background: '#111120', color: '#6b6b90', border: '1px solid #1e1e30', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                    >
                      결과 보기
                    </button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Input ── */}
          {!isDead && (
            <div style={{ borderTop: '1px solid #1a1a28', background: 'rgba(10,10,16,0.98)', flexShrink: 0, padding: '0.875rem 1rem 0.5rem' }}>
              <div style={{ maxWidth: '46rem', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.625rem' }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={streaming}
                    placeholder={streaming ? 'GM이 서술하는 중...' : '행동이나 대사를 입력하세요'}
                    style={{
                      flex: 1,
                      background: '#111120',
                      border: '1px solid #1e1e30',
                      borderRadius: '1.5rem',
                      padding: '0.75rem 1.25rem',
                      color: '#e8e4f8',
                      outline: 'none',
                      fontSize: '0.9rem',
                      transition: 'border-color 0.2s',
                      opacity: streaming ? 0.5 : 1,
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(157,127,232,0.5)'}
                    onBlur={e => e.target.style.borderColor = '#1e1e30'}
                  />
                  <button
                    type="submit"
                    disabled={streaming || !input.trim()}
                    style={{
                      padding: '0.75rem 1.125rem',
                      background: streaming || !input.trim()
                        ? '#111120'
                        : 'linear-gradient(135deg, #6a3fa0, #9d7fe8)',
                      color: streaming || !input.trim() ? '#3a3a50' : '#fff',
                      borderRadius: '1.5rem',
                      fontWeight: 700, fontSize: '1rem',
                      border: '1px solid #1e1e30',
                      cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s', minWidth: '3rem',
                    }}
                  >
                    {streaming ? '⋯' : '↵'}
                  </button>
                </form>

                {/* Format hint */}
                <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#2e2e45', marginTop: '0.5rem', letterSpacing: '0.03em' }}>
                  <span style={{ color: '#c9a84c', opacity: 0.6 }}>**행동**</span>
                  {' '}으로 행동 지시 &nbsp;·&nbsp; 대사는 그냥 입력
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col`}>
          <StatusPanel character={game.character} onOpenSheet={() => setShowSheet(true)} />
        </div>
      </div>

      {showSheet && <CharacterSheet character={game?.character} onClose={() => setShowSheet(false)} />}
    </div>
  )
}
