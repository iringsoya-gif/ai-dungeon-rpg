import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function PaymentSuccess() {
  const navigate  = useNavigate()
  const setUser   = useAuthStore(s => s.setUser)
  const [seconds, setSeconds] = useState(4)

  useEffect(() => {
    api.getMe().then(user => setUser(user)).catch(() => {})

    const tick = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(tick); navigate('/dashboard'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [navigate, setUser])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1.5rem', padding: '2rem',
    }}>
      <div style={{ fontSize: '3rem' }}>⚔</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>결제가 완료되었습니다</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>영웅 플랜이 활성화되었습니다. 무제한 모험을 즐기세요.</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{seconds}초 후 대시보드로 이동합니다...</p>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          padding: '0.6rem 1.5rem',
          background: 'linear-gradient(135deg, #6a3fa0, var(--purple))',
          color: '#fff', borderRadius: '0.625rem',
          fontWeight: 700, fontSize: '0.875rem',
          border: 'none', cursor: 'pointer',
        }}
      >
        지금 이동하기
      </button>
    </div>
  )
}
