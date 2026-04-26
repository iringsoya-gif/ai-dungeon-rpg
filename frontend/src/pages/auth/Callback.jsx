import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'

export default function Callback() {
  const navigate = useNavigate()
  const setUser  = useAuthStore(s => s.setUser)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')
    if (!token) { navigate('/'); return }

    localStorage.setItem('token', token)
    api.getMe().then(user => {
      setUser(user)
      navigate('/dashboard')
    }).catch(() => {
      localStorage.removeItem('token')
      navigate('/')
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      로그인 중...
    </div>
  )
}