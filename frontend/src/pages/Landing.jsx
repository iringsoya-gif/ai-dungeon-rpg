import { useAuthStore } from '../store/authStore'
import { useNavigate, Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'

const DEMO_SCRIPT = [
  { role: 'gm',     text: '어둠 속 낡은 철문이 삐걱거립니다. 횃불 빛에 드러난 세 갈림길 — 왼쪽엔 **핏자국**, 오른쪽엔 *황금빛 빛*이 새어나옵니다.' },
  { role: 'player', text: '**오른쪽 통로를 조심스럽게 살핀다**' },
  { role: 'gm',     text: '통로 끝, 먼지 쌓인 제단 위에 **고대의 검**이 빛나고 있습니다. [수상한 상인] "그 검은... 저주받았소이다."' },
]

function TypedText({ text, onDone }) {
  const [displayed, setDisplayed] = useState('')
  const rafRef = useRef(null)
  const lenRef = useRef(0)

  useEffect(() => {
    lenRef.current = 0
    setDisplayed('')
    const animate = () => {
      const next = Math.min(lenRef.current + 2, text.length)
      lenRef.current = next
      setDisplayed(text.slice(0, next))
      if (next < text.length) {
        rafRef.current = setTimeout(() => { rafRef.current = requestAnimationFrame(animate) }, 18)
      } else {
        onDone?.()
      }
    }
    const t = setTimeout(() => { rafRef.current = requestAnimationFrame(animate) }, 400)
    return () => {
      clearTimeout(t)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); clearTimeout(rafRef.current) }
    }
  }, [text])

  return <>{displayed}</>
}

function DemoPreview() {
  const [phase, setPhase] = useState(0)
  const [visible, setVisible] = useState([])

  useEffect(() => {
    if (phase >= DEMO_SCRIPT.length) {
      const t = setTimeout(() => { setPhase(0); setVisible([]) }, 3500)
      return () => clearTimeout(t)
    }
    setVisible(v => [...v, phase])
  }, [phase])

  return (
    <div style={{
      background: '#0c0c18', border: '1px solid #1e1e30', borderRadius: '0.875rem',
      padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem',
      minHeight: '9rem', textAlign: 'left',
    }}>
      <p style={{ fontSize: '0.6rem', color: '#3a3a50', letterSpacing: '0.12em', fontFamily: 'monospace' }}>
        LIVE DEMO · AI GAME MASTER
      </p>
      {visible.map(idx => {
        const line = DEMO_SCRIPT[idx]
        const isLast = idx === phase
        return line.role === 'gm' ? (
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #1a1430, #2a1f50)', border: '1px solid #3a2e60', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#9d7fe8', flexShrink: 0 }}>✦</div>
            <div style={{ background: '#111120', border: '1px solid #1e1e30', borderRadius: '0.25rem 0.875rem 0.875rem 0.875rem', padding: '0.5rem 0.75rem', flex: 1 }}>
              <p style={{ fontSize: '0.6rem', color: '#5a4a80', letterSpacing: '0.1em', fontFamily: 'monospace', marginBottom: '0.25rem' }}>GAME MASTER</p>
              <p style={{ fontSize: '0.78rem', color: '#ddd8f0', lineHeight: 1.7, fontFamily: "'Noto Serif KR', serif" }}>
                {isLast
                  ? <TypedText text={line.text} onDone={() => setTimeout(() => setPhase(p => p + 1), 900)} />
                  : line.text
                }
                {isLast && <span style={{ display: 'inline-block', width: '2px', height: '0.85em', background: '#c9a84c', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }} />}
              </p>
            </div>
          </div>
        ) : (
          <div key={idx} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ background: '#131828', border: '1px solid #1e2a42', borderRadius: '0.875rem 0.875rem 0.25rem 0.875rem', padding: '0.5rem 0.75rem', maxWidth: '80%' }}>
              <p style={{ fontSize: '0.78rem', color: '#c8d8f0', lineHeight: 1.6 }}>
                {isLast
                  ? <TypedText text={line.text} onDone={() => setTimeout(() => setPhase(p => p + 1), 700)} />
                  : line.text
                }
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Landing() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '400px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(157,127,232,0.06) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '32rem', width: '100%' }}>

        {/* Icon */}
        <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem', opacity: 0.9 }}>⚔</div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(2rem, 6vw, 3.25rem)',
          fontWeight: 800,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          marginBottom: '0.875rem',
          color: 'var(--text)',
        }}>
          AI Dungeon RPG
        </h1>

        <p style={{ color: 'var(--text-dim)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          AI 게임마스터가 이끄는 나만의 이야기.<br />
          매 선택이 전설이 되는 인터랙티브 웹소설 RPG.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          {['판타지 · SF · 공포', 'AI 게임마스터', '실시간 스트리밍', '하드코어 모드'].map(f => (
            <span key={f} style={{
              fontSize: '0.75rem', color: 'var(--text-dim)',
              border: '1px solid var(--border2)', borderRadius: '9999px',
              padding: '0.3rem 0.75rem', background: 'var(--surface)',
            }}>
              {f}
            </span>
          ))}
        </div>

        {/* Google Login Button */}
        <button
          onClick={() => window.location.href = api.loginUrl()}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            margin: '0 auto',
            padding: '0.75rem 2rem',
            background: 'linear-gradient(135deg, #6a3fa0, var(--purple))',
            color: '#fff',
            borderRadius: '9999px',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(157,127,232,0.25)',
            transition: 'box-shadow 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 0 36px rgba(157,127,232,0.4)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 0 24px rgba(157,127,232,0.25)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <img src="https://www.google.com/favicon.ico" style={{ width: '1rem', height: '1rem' }} alt="" />
          Google로 시작하기
        </button>

        <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '1rem' }}>
          가입 시 캐릭터 1명 무료 · 언제든 업그레이드 가능
        </p>

        {/* Live demo */}
        <div style={{ marginTop: '2.5rem' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
            실제 플레이 미리보기
          </p>
          <DemoPreview />
        </div>

        {/* Gallery link */}
        <div style={{ marginTop: '1.5rem' }}>
          <Link
            to="/stories"
            style={{
              fontSize: '0.75rem', color: 'var(--muted)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-dim)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            다른 모험가들의 기록 보기 →
          </Link>
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(7rem, 1fr))', gap: '0.75rem', marginTop: '1.5rem' }}>
          {[
            { icon: '✦', title: '무한한 세계관', desc: '원하는 배경 어디든' },
            { icon: '◈', title: 'AI 게임마스터', desc: '즉흥적 서사 생성' },
            { icon: '◆', title: '나만의 전설', desc: '모든 선택이 기록됨' },
          ].map(f => (
            <div key={f.title} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '0.875rem',
              padding: '1rem 0.75rem',
            }}>
              <div style={{ fontSize: '1rem', color: 'var(--purple)', marginBottom: '0.5rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)', marginBottom: '0.2rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
