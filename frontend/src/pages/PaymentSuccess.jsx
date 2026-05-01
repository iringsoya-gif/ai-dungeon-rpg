import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function PaymentSuccess() {
  const navigate  = useNavigate()
  const setUser   = useAuthStore(s => s.setUser)
  const [params]  = useSearchParams()
  const [seconds, setSeconds]         = useState(4)
  const [ready, setReady]             = useState(false)   // verify 완료 후 카운트 시작
  const [upgradeFailed, setUpgradeFailed] = useState(false)

  // 1단계: verify → getMe → ready 상태로 전환
  useEffect(() => {
    const checkoutId = params.get('checkout_id') || params.get('checkoutId') || params.get('id')

    const verify = checkoutId
      ? api.verifyCheckout(checkoutId).catch(() => null)
      : Promise.resolve(null)

    verify
      .then(res => {
        // 업그레이드 실패 감지 (paid 상태가 아니고 upgraded=false)
        if (res && !res.upgraded && res.plan !== 'paid') {
          setUpgradeFailed(true)
        }
        return api.getMe()
      })
      .then(user => setUser(user))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  // 2단계: verify 완료 후에만 카운트다운 시작
  useEffect(() => {
    if (!ready) return
    const tick = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(tick); navigate('/dashboard'); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [ready, navigate])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1.5rem', padding: '2rem',
    }}>
      {!ready ? (
        <>
          <div style={{ fontSize: '2rem', opacity: 0.5 }}>⚔</div>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>결제 확인 중...</p>
        </>
      ) : upgradeFailed ? (
        <>
          <div style={{ fontSize: '3rem' }}>⚠</div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>결제 확인 지연</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', textAlign: 'center', maxWidth: '22rem', lineHeight: 1.6 }}>
            결제는 완료됐지만 플랜 반영이 지연될 수 있습니다.<br />
            대시보드 상단의 <strong>"↻ 플랜 동기화"</strong> 버튼을 눌러주세요.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.6rem 1.5rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
          >
            대시보드로 이동
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: '3rem' }}>⚔</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>결제가 완료되었습니다</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>영웅 플랜이 활성화되었습니다. 무제한 모험을 즐기세요.</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{seconds}초 후 대시보드로 이동합니다...</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #6a3fa0, var(--purple))', color: '#fff', borderRadius: '0.625rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
          >
            지금 이동하기
          </button>
        </>
      )}
    </div>
  )
}
