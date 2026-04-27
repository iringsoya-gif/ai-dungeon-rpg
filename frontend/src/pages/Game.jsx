import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { api } from '../lib/api'
import { useStream } from '../hooks/useStream'
import StreamText from '../components/ui/StreamText'
import StatusPanel from '../components/game/StatusPanel'
import CharacterSheet from '../components/game/CharacterSheet'

export default function Game() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { game, histories, streamText, setGame } = useGameStore()
  const { streaming, streamError, sendAction, cancel } = useStream()
  const [input, setInput] = useState('')
  const [showSheet, setShowSheet] = useState(false)
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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--gold)', fontSize: '2rem', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 12px rgba(201,168,76,0.5))' }}>⚔️</div>
        <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>세계를 불러오는 중...</p>
      </div>
    </div>
  )

  const isDead = game.status === 'dead' || game.status === 'completed'

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Header */}
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            color: 'var(--muted)',
            fontSize: '0.8rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-light)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          ← 대시보드
        </button>

        <span style={{ color: 'var(--border)' }}>│</span>

        <span
          style={{
            fontWeight: 700,
            color: 'var(--gold-light)',
            fontSize: '0.95rem',
            letterSpacing: '0.03em',
            textShadow: '0 0 12px rgba(201,168,76,0.3)',
          }}
        >
          {game.title}
        </span>

        {game.hardcore_mode && (
          <span
            style={{
              fontSize: '0.65rem',
              color: 'var(--red)',
              border: '1px solid rgba(239,68,68,0.4)',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              background: 'rgba(239,68,68,0.08)',
              letterSpacing: '0.05em',
            }}
          >
            ☠ 하드코어
          </span>
        )}

        <span
          className="ml-auto"
          style={{
            fontSize: '0.75rem',
            color: 'var(--muted)',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          T-{game.turn_count}
        </span>

        {!isDead && (
          <button
            onClick={async () => {
              if (!confirm('모험을 완료하시겠습니까?')) return
              try {
                const data = await api.completeGame(id)
                navigate(`/games/${id}/over`, { state: { stats: data.stats, game: data } })
              } catch {
                navigate('/dashboard')
              }
            }}
            className="hidden md:block"
            style={{
              fontSize: '0.72rem',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              padding: '0.25rem 0.625rem',
              background: 'transparent',
              cursor: 'pointer',
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
            완료
          </button>
        )}

        <button
          onClick={() => setShowSidebar(s => !s)}
          className="md:hidden"
          style={{
            fontSize: '0.72rem',
            color: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            padding: '0.25rem 0.625rem',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          {showSidebar ? '닫기' : '상태'}
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            {histories.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: h.role === 'player' ? 'flex-end' : 'flex-start',
                }}
              >
                {h.role === 'player' ? (
                  /* Player bubble — right, dark blue */
                  <div
                    style={{
                      maxWidth: '38rem',
                      background: 'rgba(30,50,100,0.5)',
                      border: '1px solid rgba(50,80,150,0.4)',
                      borderRadius: '1rem 1rem 0.25rem 1rem',
                      padding: '0.75rem 1rem',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.65rem',
                        color: 'rgba(120,160,220,0.7)',
                        marginBottom: '0.375rem',
                        letterSpacing: '0.06em',
                      }}
                    >
                      ◈ 모험가
                    </span>
                    <p style={{ fontSize: '0.875rem', color: '#c8d8f0', whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                      {h.content}
                    </p>
                  </div>
                ) : (
                  /* GM bubble — left, gold accent */
                  <div
                    style={{
                      maxWidth: '44rem',
                      background: 'var(--surface)',
                      borderLeft: '3px solid var(--gold)',
                      borderTop: '1px solid rgba(201,168,76,0.2)',
                      borderBottom: '1px solid rgba(201,168,76,0.2)',
                      borderRight: '1px solid var(--border)',
                      borderRadius: '0 1rem 1rem 0',
                      padding: '0.875rem 1.125rem',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.65rem',
                        color: 'rgba(201,168,76,0.7)',
                        marginBottom: '0.375rem',
                        letterSpacing: '0.1em',
                        fontFamily: 'monospace',
                      }}
                    >
                      ✦ GAME MASTER
                    </span>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.8, fontStyle: 'italic' }}>
                      {h.content}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming GM message */}
            {streaming && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '44rem',
                    background: 'var(--surface)',
                    borderLeft: '3px solid var(--gold)',
                    borderTop: '1px solid rgba(201,168,76,0.2)',
                    borderBottom: '1px solid rgba(201,168,76,0.2)',
                    borderRight: '1px solid var(--border)',
                    borderRadius: '0 1rem 1rem 0',
                    padding: '0.875rem 1.125rem',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.65rem',
                      color: 'rgba(201,168,76,0.7)',
                      marginBottom: '0.375rem',
                      letterSpacing: '0.1em',
                      fontFamily: 'monospace',
                    }}
                  >
                    ⚔ GM
                  </span>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.8, fontStyle: 'italic' }}>
                    <StreamText text={streamText} isStreaming={true} />
                    <span className="cursor-blink" />
                  </div>
                </div>
              </div>
            )}

            {/* Stream error */}
            {streamError && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '44rem',
                    background: 'rgba(100,10,10,0.4)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: '0.875rem',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: '#fca5a5',
                  }}
                >
                  ⚠️ {streamError}
                </div>
              </div>
            )}

            {/* Game over state */}
            {isDead && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div
                  style={{
                    fontSize: '3.5rem',
                    marginBottom: '1rem',
                    filter: 'grayscale(0.2) drop-shadow(0 0 16px rgba(239,68,68,0.4))',
                  }}
                >
                  💀
                </div>
                <p style={{ color: 'var(--red)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  모험이 종료되었습니다
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '2rem', fontStyle: 'italic' }}>
                  당신의 전설은 역사에 기록될 것입니다
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={() => navigate('/new-game')}
                    className="btn-gold-glow"
                    style={{
                      padding: '0.625rem 1.5rem',
                      background: 'linear-gradient(135deg, #8a6820, var(--gold), #8a6820)',
                      color: '#0a0805',
                      borderRadius: '0.75rem',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    새 모험 시작
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const data = await api.completeGame(id)
                        navigate(`/games/${id}/over`, { state: { stats: data.stats, game: data } })
                      } catch {
                        navigate(`/games/${id}/over`)
                      }
                    }}
                    style={{
                      padding: '0.625rem 1.5rem',
                      background: 'var(--surface2)',
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.75rem',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'color 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--text)'
                      e.currentTarget.style.borderColor = '#4a4a60'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--muted)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    결과 보기
                  </button>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          {!isDead && (
            <form
              onSubmit={handleSubmit}
              style={{
                borderTop: '1px solid var(--border)',
                padding: '0.875rem 1rem',
                display: 'flex',
                gap: '0.75rem',
                background: 'var(--surface)',
                flexShrink: 0,
              }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={streaming}
                placeholder="무엇을 하시겠습니까? — 자유롭게 입력하세요"
                style={{
                  flex: 1,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.875rem',
                  padding: '0.75rem 1rem',
                  color: 'var(--text)',
                  outline: 'none',
                  fontSize: '0.9rem',
                  fontStyle: 'italic',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  opacity: streaming ? 0.5 : 1,
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(201,168,76,0.6)'
                  e.target.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.12)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: streaming || !input.trim()
                    ? 'var(--surface2)'
                    : 'linear-gradient(135deg, #8a6820, var(--gold), #8a6820)',
                  color: streaming || !input.trim() ? 'var(--muted)' : '#0a0805',
                  borderRadius: '0.875rem',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  minWidth: '3.25rem',
                }}
              >
                {streaming ? '⋯' : '↵'}
              </button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col`}>
          <StatusPanel character={game.character} onOpenSheet={() => setShowSheet(true)} />
        </div>
      </div>

      {showSheet && <CharacterSheet character={game?.character} onClose={() => setShowSheet(false)} />}
    </div>
  )
}