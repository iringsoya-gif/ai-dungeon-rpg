import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { api } from '../lib/api'
import { useStream } from '../hooks/useStream'
import { useBGM } from '../hooks/useBGM'
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

/* JSON 블록 제거 — streaming=true면 블록 시작부터 잘라냄 (닫는 ``` 미도달 대비) */
function stripJson(text, streaming = false) {
  if (!text) return ''
  if (streaming) {
    const idx = text.indexOf('```json')
    return idx === -1 ? text : text.slice(0, idx).trimEnd()
  }
  return text.replace(/```json[\s\S]*?```/g, '').trim()
}

/* GM 텍스트를 서술 / NPC 대화 파트로 분리 */
function parseGmContent(text) {
  const parts = []
  // [NPC이름] "대사" 형식 감지
  const regex = /\[([^\]]+)\]\s*"([^"]*)"/g
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim()
    if (before) parts.push({ type: 'narrative', text: before })
    parts.push({ type: 'dialogue', name: match[1].trim(), text: match[2] })
    lastIndex = match.index + match[0].length
  }
  const remaining = text.slice(lastIndex).trim()
  if (remaining) parts.push({ type: 'narrative', text: remaining })
  return parts.length ? parts : [{ type: 'narrative', text }]
}

/* GM 완성 메시지 렌더링 (NPC 대화 블록 포함) */
function GmContent({ raw, fontSize, FONT_SIZE }) {
  const text = stripJson(raw)
  const parts = parseGmContent(text)
  return (
    <>
      {parts.map((part, i) =>
        part.type === 'dialogue' ? (
          <div key={i} style={{
            margin: '0.75rem 0',
            paddingLeft: '0.875rem',
            borderLeft: '2px solid rgba(201,168,76,0.55)',
            background: 'rgba(201,168,76,0.03)',
            borderRadius: '0 0.375rem 0.375rem 0',
            paddingTop: '0.35rem',
            paddingBottom: '0.35rem',
          }}>
            <div style={{
              fontSize: '0.58rem', color: '#c9a84c',
              letterSpacing: '0.1em', fontFamily: 'monospace',
              fontWeight: 700, marginBottom: '0.2rem',
              textTransform: 'uppercase',
            }}>
              {part.name}
            </div>
            <div style={{
              fontSize: FONT_SIZE[fontSize], color: '#f0e8d0',
              lineHeight: 1.85, fontFamily: "'Noto Serif KR', serif",
              fontStyle: 'italic',
            }}>
              "{part.text}"
            </div>
          </div>
        ) : (
          <p key={i} style={{
            fontSize: FONT_SIZE[fontSize], color: '#ddd8f0',
            lineHeight: 1.95, margin: '0.3rem 0',
            whiteSpace: 'pre-wrap', fontFamily: "'Noto Serif KR', serif",
          }}>
            {part.text}
          </p>
        )
      )}
    </>
  )
}

export default function Game() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { game, histories, streamText, setGame } = useGameStore()
  const { streaming, streamError, lastAction, sendAction, retry, cancel } = useStream()
  const { enabled: bgmEnabled, toggle: bgmToggle, start: bgmStart, setMood } = useBGM()
  const bgmStarted = useRef(false)
  const [input, setInput]         = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [copied, setCopied]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [fontSize, setFontSize]   = useState(() => localStorage.getItem('rpg-font-size') || 'md')
  const bottomRef = useRef(null)

  const FONT_SIZE = { sm: '0.82rem', md: '0.9rem', lg: '1.05rem' }

  const copyStoryLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/story/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cycleFontSize = () => {
    const next = fontSize === 'sm' ? 'md' : fontSize === 'md' ? 'lg' : 'sm'
    setFontSize(next)
    localStorage.setItem('rpg-font-size', next)
  }

  // 훅보다 먼저 정의해야 TDZ 에러 없음 (game은 null일 수 있으므로 optional chaining)
  const isDead = game?.status === 'dead' || game?.status === 'completed'

  useEffect(() => () => cancel(), [])

  useEffect(() => {
    api.getGame(id).then(setGame).catch(() => navigate('/dashboard'))
  }, [id, navigate, setGame])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [histories, streamText])

  // 저장 완료 피드백
  const prevStreaming = useRef(false)
  useEffect(() => {
    if (prevStreaming.current && !streaming && !streamError) {
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(t)
    }
    prevStreaming.current = streaming
  }, [streaming, streamError])

  // BGM mood: switch by battle state
  useEffect(() => {
    if (!bgmStarted.current || !game?.character) return
    if (isDead) { setMood('gameover'); return }
    setMood(game.character.in_battle ? 'battle' : 'calm')
  }, [game?.character?.in_battle, isDead, setMood])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || streaming) return
    // Start BGM on first user interaction (autoplay policy)
    if (!bgmStarted.current) {
      bgmStarted.current = true
      bgmStart(game?.character?.in_battle ? 'battle' : 'calm')
    }
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

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a10' }}>

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

        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontFamily: 'monospace', transition: 'color 0.3s', color: saved ? '#22c55e' : '#3a3a50' }}>
          {saved ? '✓ 저장됨' : `T-${game.turn_count}`}
        </span>

        {/* 폰트 크기 조절 */}
        <button
          onClick={cycleFontSize}
          title={`폰트 크기: ${fontSize === 'sm' ? '소' : fontSize === 'md' ? '중' : '대'} (클릭으로 변경)`}
          style={{ fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a50', padding: '0.1rem 0.2rem', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#9d7fe8'}
          onMouseLeave={e => e.currentTarget.style.color = '#3a3a50'}
        >
          {fontSize === 'sm' ? 'A' : fontSize === 'md' ? 'A' : 'A'}
          <sup style={{ fontSize: '0.55rem' }}>{fontSize === 'sm' ? '소' : fontSize === 'md' ? '중' : '대'}</sup>
        </button>

        {/* BGM toggle */}
        <button
          onClick={bgmToggle}
          title={bgmEnabled ? 'BGM 끄기' : 'BGM 켜기'}
          style={{
            fontSize: '0.85rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: bgmEnabled ? '#9d7fe8' : '#3a3a50',
            padding: '0.1rem 0.2rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = bgmEnabled ? '#c0a0ff' : '#5a5a70'}
          onMouseLeave={e => e.currentTarget.style.color = bgmEnabled ? '#9d7fe8' : '#3a3a50'}
        >
          {bgmEnabled ? '♪' : '♩'}
        </button>

        {isDead && (
          <button
            onClick={copyStoryLink}
            className="hidden md:block"
            style={{ fontSize: '0.7rem', color: copied ? '#22c55e' : '#9d7fe8', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(157,127,232,0.25)'}`, borderRadius: '0.375rem', padding: '0.2rem 0.55rem', background: 'transparent', cursor: 'pointer' }}
          >
            {copied ? '✓ 복사됨' : '🔗 공유'}
          </button>
        )}

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
                      <GmContent raw={h.content} fontSize={fontSize} FONT_SIZE={FONT_SIZE} />
                    </div>
                  </div>
                )
              ))}

              {/* 스타터 액션 칩 — 첫 턴에만 표시 */}
              {histories.length === 1 && histories[0]?.role === 'gm' && !streaming && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingLeft: '2.625rem' }}>
                  {[
                    '**주변을 둘러본다**',
                    '**가장 가까운 사람에게 말을 건다**',
                    '**앞으로 나아간다**',
                    '**장비를 확인한다**',
                  ].map(action => (
                    <button
                      key={action}
                      onClick={() => setInput(action)}
                      style={{
                        fontSize: '0.72rem', color: '#c9a84c',
                        background: 'rgba(201,168,76,0.06)',
                        border: '1px solid rgba(201,168,76,0.25)',
                        borderRadius: '9999px', padding: '0.3rem 0.75rem',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.14)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.06)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)' }}
                    >
                      {action.replace(/\*\*/g, '')}
                    </button>
                  ))}
                </div>
              )}

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
                    <div style={{ fontSize: FONT_SIZE[fontSize], color: '#ddd8f0', lineHeight: 1.95, whiteSpace: 'pre-wrap', fontFamily: "'Noto Serif KR', serif" }}>
                      <StreamText text={stripJson(streamText, true)} isStreaming={true} />
                      <span className="cursor-blink" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error + retry */}
              {streamError && (
                <div style={{
                  background: 'rgba(80,10,10,0.5)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '0.75rem', padding: '0.75rem 1rem',
                  fontSize: '0.8rem', color: '#fca5a5',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                }}>
                  <span>⚠ {streamError}</span>
                  {lastAction && (
                    <button
                      onClick={retry}
                      style={{
                        flexShrink: 0, fontSize: '0.75rem', fontWeight: 700,
                        color: '#fca5a5', background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.5rem',
                        padding: '0.25rem 0.7rem', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      ↺ 다시 시도
                    </button>
                  )}
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
            <div style={{ borderTop: '1px solid #1a1a28', background: 'rgba(10,10,16,0.98)', flexShrink: 0, padding: '0.875rem 1rem 0.5rem', paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
              <div style={{ maxWidth: '46rem', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.625rem' }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value.slice(0, 500))}
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

                {/* 입력 길이 카운터 */}
                {input.length > 400 && (
                  <p style={{ textAlign: 'right', fontSize: '0.62rem', color: input.length >= 500 ? '#ef4444' : '#4a4a60', marginTop: '0.25rem' }}>
                    {input.length}/500
                  </p>
                )}

                {/* 행동 칩 */}
                {game.character?.in_battle ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                    {[
                      ...(game.character.inventory?.slice(0, 2).map(item => `**${item}를 사용한다**`) || []),
                      '**공격한다**', '**방어 자세를 취한다**', '**도망친다**',
                    ].map(action => (
                      <button
                        key={action}
                        onClick={() => setInput(action)}
                        style={{
                          fontSize: '0.67rem', color: '#fca5a5',
                          background: 'rgba(239,68,68,0.06)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '9999px', padding: '0.2rem 0.6rem',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                      >
                        {action.replace(/\*\*/g, '')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#2e2e45', marginTop: '0.5rem', letterSpacing: '0.03em' }}>
                    <span style={{ color: '#c9a84c', opacity: 0.6 }}>**행동**</span>
                    {' '}으로 행동 지시 &nbsp;·&nbsp; 대사는 그냥 입력
                  </p>
                )}
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
