import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../lib/api'

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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <button onClick={() => navigate(-1)} className="self-start text-gray-500 hover:text-gray-300 text-sm mb-8">← 뒤로</button>
      <h1 className="text-4xl font-bold mb-2 text-center">요금제</h1>
      <p className="text-gray-400 mb-12 text-center">당신의 모험 스타일에 맞게 선택하세요</p>

      <div className="flex gap-6 flex-wrap justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-72">
          <h2 className="text-xl font-bold mb-1">Free</h2>
          <p className="text-4xl font-bold mb-6">$0</p>
          <ul className="space-y-3 text-sm text-gray-400 mb-8">
            <li>✓ 활성 캐릭터 1명</li>
            <li>✓ 무제한 턴 플레이</li>
            <li>✓ 하드코어 모드</li>
            <li>✓ 자동 저장</li>
          </ul>
          {user?.plan === 'free' && (
            <div className="text-center text-sm text-emerald-400 border border-emerald-500/30 rounded-lg py-2">현재 플랜</div>
          )}
        </div>

        <div className="bg-gray-900 border border-emerald-500/40 rounded-2xl p-8 w-72 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full">추천</div>
          <h2 className="text-xl font-bold mb-1">Adventurer</h2>
          <p className="text-4xl font-bold mb-1">$9</p>
          <p className="text-gray-500 text-sm mb-6">1회 결제</p>
          <ul className="space-y-3 text-sm text-gray-400 mb-8">
            <li>✓ 활성 캐릭터 <strong className="text-white">무제한</strong></li>
            <li>✓ 무제한 턴 플레이</li>
            <li>✓ 하드코어 모드</li>
            <li>✓ 자동 저장</li>
            <li>✓ 우선 AI 응답</li>
          </ul>
          {user?.plan === 'paid' ? (
            <div className="text-center text-sm text-emerald-400 border border-emerald-500/30 rounded-lg py-2">현재 플랜 ✓</div>
          ) : (
            <button onClick={handleCheckout} disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 transition">
              {loading ? '이동 중...' : '지금 구매하기 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}