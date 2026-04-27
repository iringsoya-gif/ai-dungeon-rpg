import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../lib/api'

function CheckItem({ children, gold }) {
  return (
    <li className="flex items-start gap-2 text-sm" style={{ color: gold ? 'var(--text)' : '#a89880' }}>
      <span style={{ color: gold ? 'var(--gold)' : 'var(--muted)', marginTop: '1px', flexShrink: 0 }}>✓</span>
      {children}
    </li>
  )
}

export default function Pricing() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    if (!user) { window.location.href = api.loginUrl(); return }
    setLoading(true)
    try {
      const { checkout_url } = await api.checkout()
      window.location.href = checkout_url
    } catch {
      alert('결제 페이지 이동 중 오류가 발생했습니다')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="self-start mb-8 text-sm transition"
        style={{ color: 'var(--muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-light)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
      >
        ← 뒤로
      </button>

      {/* Header */}
      <div className="text-center mb-3">
        <p style={{ color: 'var(--gold)', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          ✦ 요금제 ✦
        </p>
        <h1
          className="text-gold-glow"
          style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1 }}
        >
          당신의 모험을 무한히 확장하세요
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.75rem', fontSize: '0.95rem' }}>
          모험 스타일에 맞는 플랜을 선택하세요
        </p>
      </div>

      {/* Decorative divider */}
      <div className="flex items-center gap-3 mb-12">
        <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to right, transparent, var(--border))' }} />
        <span style={{ color: 'var(--gold)', fontSize: '0.65rem', letterSpacing: '0.15em' }}>✦</span>
        <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to left, transparent, var(--border))' }} />
      </div>

      <div className="flex gap-6 flex-wrap justify-center items-stretch">

        {/* Free tier — "모험가" */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid #3a3a50',
            borderRadius: '1.25rem',
            padding: '2rem',
            width: '17rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '1.25rem' }}>🗡️</span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c0bdb8' }}>모험가</h2>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Free Tier</p>
          <p style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.25rem', color: 'var(--text)' }}>$0</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '1.75rem' }}>영원히 무료</p>

          <ul className="space-y-3 mb-8" style={{ listStyle: 'none', padding: 0, flex: 1 }}>
            <CheckItem>활성 캐릭터 1명</CheckItem>
            <CheckItem>무제한 턴 플레이</CheckItem>
            <CheckItem>하드코어 모드</CheckItem>
            <CheckItem>자동 저장</CheckItem>
          </ul>

          {user?.plan === 'free' ? (
            <div
              style={{
                textAlign: 'center',
                fontSize: '0.85rem',
                color: '#a89880',
                border: '1px solid #3a3a50',
                borderRadius: '0.75rem',
                padding: '0.625rem',
              }}
            >
              현재 플랜
            </div>
          ) : (
            <div style={{ height: '2.625rem' }} />
          )}
        </div>

        {/* Paid tier — "영웅" */}
        <div
          className="card-gold-border"
          style={{
            padding: '2rem',
            width: '17rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* 추천 badge */}
          <div
            style={{
              position: 'absolute',
              top: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(90deg, #a07828, #e8c96a, #a07828)',
              color: '#1a1206',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.3rem 1rem',
              borderRadius: '9999px',
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}
          >
            ✨ 추천
          </div>

          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '1.25rem', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.6))' }}>👑</span>
            <h2 className="text-gold-glow" style={{ fontSize: '1.1rem', fontWeight: 700 }}>영웅</h2>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>Adventurer Tier</p>

          <p
            style={{
              fontSize: '2.75rem',
              fontWeight: 800,
              lineHeight: 1,
              marginBottom: '0.25rem',
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            $9
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '1.75rem' }}>1회 결제 · 영구 이용</p>

          <ul className="space-y-3 mb-8" style={{ listStyle: 'none', padding: 0, flex: 1 }}>
            <CheckItem gold>활성 캐릭터 <strong style={{ color: 'var(--gold-light)' }}>무제한</strong></CheckItem>
            <CheckItem gold>무제한 턴 플레이</CheckItem>
            <CheckItem gold>하드코어 모드</CheckItem>
            <CheckItem gold>자동 저장</CheckItem>
            <CheckItem gold>⚡ 우선 AI 응답</CheckItem>
          </ul>

          {user?.plan === 'paid' ? (
            <div
              style={{
                textAlign: 'center',
                fontSize: '0.85rem',
                color: 'var(--gold)',
                border: '1px solid rgba(201,168,76,0.4)',
                borderRadius: '0.75rem',
                padding: '0.625rem',
              }}
            >
              현재 플랜 ✓
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className={loading ? 'btn-loading' : 'btn-gold-glow'}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #a07828, #c9a84c, #a07828)',
                color: '#0a0805',
                borderRadius: '0.75rem',
                fontWeight: 800,
                fontSize: '1rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                letterSpacing: '0.02em',
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? '이동 중...' : '지금 구매하기 →'}
            </button>
          )}
        </div>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '2.5rem', textAlign: 'center' }}>
        결제는 Polar를 통해 안전하게 처리됩니다 · 환불 정책 적용
      </p>
    </div>
  )
}