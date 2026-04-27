import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../lib/api'

function CheckItem({ children, active }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.83rem', color: active ? 'var(--text)' : 'var(--text-dim)' }}>
      <span style={{ color: active ? 'var(--purple)' : 'var(--muted)', flexShrink: 0, marginTop: '1px' }}>✓</span>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem' }}>

      {/* Nav */}
      <div style={{ maxWidth: '38rem', margin: '0 auto', width: '100%', marginBottom: '2.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ fontSize: '0.8rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          ← 뒤로
        </button>
      </div>

      <div style={{ maxWidth: '38rem', margin: '0 auto', width: '100%', flex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--purple)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>요금제</p>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.625rem' }}>모험을 무한히 확장하세요</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>플레이 스타일에 맞는 플랜을 선택하세요</p>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1rem' }}>

          {/* Free */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: '1rem',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>무료</p>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem' }}>모험가</h2>
            <p style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.25rem' }}>$0</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>영원히 무료</p>

            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1, marginBottom: '1.5rem' }}>
              <CheckItem>활성 캐릭터 1명</CheckItem>
              <CheckItem>무제한 턴 플레이</CheckItem>
              <CheckItem>하드코어 모드</CheckItem>
              <CheckItem>자동 저장</CheckItem>
            </ul>

            <div style={{
              textAlign: 'center', fontSize: '0.8rem',
              color: user?.plan === 'free' ? 'var(--text-dim)' : 'transparent',
              border: '1px solid var(--border2)', borderRadius: '0.625rem', padding: '0.6rem',
            }}>
              {user?.plan === 'free' ? '현재 플랜' : ' '}
            </div>
          </div>

          {/* Paid */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid rgba(157,127,232,0.4)',
            borderRadius: '1rem',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 0 30px rgba(157,127,232,0.08)',
          }}>
            {/* Badge */}
            <div style={{
              position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #6a3fa0, var(--purple))',
              color: '#fff', fontSize: '0.65rem', fontWeight: 700,
              padding: '0.25rem 0.875rem', borderRadius: '9999px',
              letterSpacing: '0.08em', whiteSpace: 'nowrap',
            }}>
              추천
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>프리미엄</p>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--purple)' }}>영웅</h2>
            <p style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.25rem' }}>$9</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>1회 결제 · 영구 이용</p>

            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1, marginBottom: '1.5rem' }}>
              <CheckItem active>활성 캐릭터 <strong style={{ color: 'var(--purple)' }}>무제한</strong></CheckItem>
              <CheckItem active>무제한 턴 플레이</CheckItem>
              <CheckItem active>하드코어 모드</CheckItem>
              <CheckItem active>자동 저장</CheckItem>
              <CheckItem active>우선 AI 응답</CheckItem>
            </ul>

            {user?.plan === 'paid' ? (
              <div style={{
                textAlign: 'center', fontSize: '0.8rem', color: 'var(--purple)',
                border: '1px solid rgba(157,127,232,0.4)', borderRadius: '0.625rem', padding: '0.6rem',
              }}>
                현재 플랜 ✓
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={loading}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: 'linear-gradient(135deg, #6a3fa0, var(--purple))',
                  color: '#fff', borderRadius: '0.625rem',
                  fontWeight: 700, fontSize: '0.9rem',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s, box-shadow 0.2s',
                  boxShadow: '0 0 20px rgba(157,127,232,0.2)',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 28px rgba(157,127,232,0.35)' }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(157,127,232,0.2)'}
              >
                {loading ? '이동 중...' : '지금 구매하기 →'}
              </button>
            )}
          </div>
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '0.7rem', marginTop: '2rem', textAlign: 'center' }}>
          결제는 Polar를 통해 안전하게 처리됩니다 · 환불 정책 적용
        </p>
      </div>
    </div>
  )
}
