import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { api } from '../lib/api'

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

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '3rem' }}>
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
