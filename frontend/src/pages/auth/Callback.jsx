import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'

const ERROR_MESSAGES = {
  access_denied:  '로그인이 취소되었습니다.',
  token_failed:   'Google 인증에 실패했습니다. 다시 시도해주세요.',
  no_email:       'Google 계정에서 이메일을 가져올 수 없습니다.',
  timeout:        '서버 응답이 느립니다. 잠시 후 다시 시도해주세요.',
  server_error:   '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

export default function Callback() {
  const navigate    = useNavigate()
  const setUser     = useAuthStore(s => s.setUser)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    const error  = params.get('error')

    if (error || !token) {
      setAuthError(ERROR_MESSAGES[error] || '로그인 중 오류가 발생했습니다.')
      return
    }

    localStorage.setItem('token', token)
    api.getMe()
      .then(user => { setUser(user); navigate('/dashboard') })
      .catch(() => {
        localStorage.removeItem('token')
        setAuthError('사용자 정보를 가져오지 못했습니다. 다시 시도해주세요.')
      })
  }, [])

  if (authError) return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '2rem', gap: '1rem',
    }}>
      <div style={{ fontSize: '2rem', opacity: 0.7 }}>⚠</div>
      <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.95rem' }}>{authError}</p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '0.5rem 1.5rem', background: 'rgba(157,127,232,0.12)',
          color: '#9d7fe8', border: '1px solid rgba(157,127,232,0.3)',
          borderRadius: '0.625rem', cursor: 'pointer', fontSize: '0.875rem',
        }}
      >
        홈으로 돌아가기
      </button>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>로그인 중...</p>
    </div>
  )
}
