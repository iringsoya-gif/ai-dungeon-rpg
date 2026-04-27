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
    <div className="hero-bg min-h-screen flex flex-col items-center justify-center text-white px-4 relative overflow-hidden">

      {/* Decorative floating orbs */}
      <div
        className="orb-float absolute top-24 left-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)' }}
      />
      <div
        className="orb-float-slow absolute bottom-32 right-12 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(120,40,160,0.1) 0%, transparent 70%)' }}
      />
      <div
        className="orb-float absolute top-1/3 right-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{ animationDelay: '3s', background: 'radial-gradient(circle, rgba(30,60,120,0.12) 0%, transparent 70%)' }}
      />

      {/* Hero content */}
      <div className="relative z-10 text-center max-w-2xl">

        {/* Crown / emblem icon */}
        <div
          className="text-7xl mb-6 inline-block"
          style={{ filter: 'drop-shadow(0 0 24px rgba(201,168,76,0.6))' }}
        >
          ⚔️
        </div>

        {/* Title */}
        <h1
          className="text-gold-glow mb-4"
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5rem)',
            fontWeight: 800,
            letterSpacing: '0.04em',
            lineHeight: 1.1,
          }}
        >
          AI Dungeon RPG
        </h1>

        {/* Subtitle */}
        <p
          className="mb-2"
          style={{ color: '#a89880', fontSize: '1.15rem', fontStyle: 'italic', letterSpacing: '0.02em' }}
        >
          Claude가 당신만의 이야기를 만들어갑니다
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }} className="mb-10">
          매 선택이 전설이 되는 곳 — 무한한 어둠의 서사가 기다립니다
        </p>

        {/* Decorative divider */}
        <div className="flex items-center gap-4 mb-10 justify-center">
          <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to right, transparent, var(--gold))' }} />
          <span style={{ color: 'var(--gold)', fontSize: '0.75rem', letterSpacing: '0.15em' }}>✦ ✦ ✦</span>
          <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to left, transparent, var(--gold))' }} />
        </div>

        {/* Feature highlights */}
        <div className="flex justify-center gap-4 mb-10 flex-wrap">
          {[
            { icon: '⚔️', title: '무한한 세계관', desc: '판타지·SF·공포 등 끝없는 배경' },
            { icon: '🤖', title: 'AI 게임마스터', desc: 'Claude가 즉흥적으로 서사를 생성' },
            { icon: '📜', title: '당신만의 이야기', desc: '모든 선택이 전설로 기록됩니다' },
          ].map(f => (
            <div
              key={f.title}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '0.875rem',
                padding: '1.25rem 1.5rem',
                minWidth: '160px',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(201,168,76,0.1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div style={{ color: 'var(--gold-light)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{f.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Google Login Button */}
        <button
          onClick={() => window.location.href = api.loginUrl()}
          className="btn-gold-glow flex items-center gap-3 mx-auto"
          style={{
            padding: '0.875rem 2.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--gold)',
            borderRadius: '0.875rem',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: 'var(--gold-light)',
            letterSpacing: '0.03em',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(201,168,76,0.12)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--surface)'
            e.currentTarget.style.color = 'var(--gold-light)'
          }}
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />
          Google로 모험 시작
        </button>

        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '1rem' }}>
          가입 시 캐릭터 1명 무료 · 언제든 업그레이드 가능
        </p>
      </div>

      {/* Bottom vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(10,10,15,0.8), transparent)' }}
      />
    </div>
  )
}