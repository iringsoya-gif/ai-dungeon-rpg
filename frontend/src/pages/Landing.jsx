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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
      <div className="text-center max-w-xl">
        <div className="text-7xl mb-6">⚔️</div>
        <h1 className="text-5xl font-bold mb-4">AI 던전 RPG</h1>
        <p className="text-gray-400 text-lg mb-2">Claude AI가 게임마스터가 되어</p>
        <p className="text-gray-400 text-lg mb-8">당신만의 이야기를 실시간으로 만들어갑니다</p>

        <div className="flex justify-center gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 text-sm">
            <div className="text-emerald-400 font-semibold mb-1">무료</div>
            <div className="text-gray-400">캐릭터 1명</div>
          </div>
          <div className="bg-gray-900 border border-emerald-500/30 rounded-xl px-6 py-4 text-sm">
            <div className="text-emerald-400 font-semibold mb-1">$9 이후</div>
            <div className="text-gray-400">캐릭터 무제한</div>
          </div>
        </div>

        <button
          onClick={() => window.location.href = api.loginUrl()}
          className="flex items-center gap-3 mx-auto px-10 py-4 bg-white text-gray-800
                     rounded-xl font-semibold text-lg hover:bg-gray-100 transition shadow-xl"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />
          Google로 모험 시작
        </button>
        <p className="text-gray-600 text-xs mt-4">가입 시 캐릭터 1명 무료 이용 가능</p>
      </div>
    </div>
  )
}