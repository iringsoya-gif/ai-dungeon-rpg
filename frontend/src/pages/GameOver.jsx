import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'

export default function GameOver() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [stats, setStats] = useState(location.state?.stats || null)
  const [game, setGame] = useState(location.state?.game || null)
  const [loading, setLoading] = useState(!stats)

  useEffect(() => {
    if (!stats && id) {
      api.completeGame(id)
        .then(data => { setStats(data.stats); setGame(data) })
        .catch(() => navigate('/dashboard'))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">처리 중...</div>
  )

  const isDead = game?.status === 'dead'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">{isDead ? '💀' : '🏆'}</div>
        <h1 className="text-2xl font-bold text-white mb-1">
          {isDead ? '모험 종료' : '모험 완료!'}
        </h1>
        <p className="text-gray-500 text-sm mb-6">{game?.title}</p>

        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            {[
              { label: '총 턴 수', value: stats.turn_count, icon: '🎲' },
              { label: '플레이 시간', value: `${stats.play_time_minutes}분`, icon: '⏱️' },
              { label: '최종 레벨', value: `Lv.${stats.final_level}`, icon: '⭐' },
              { label: '최종 HP', value: stats.final_hp, icon: '❤️' },
              { label: '완료 퀘스트', value: `${stats.quests_completed}개`, icon: '📋' },
              { label: '보유 아이템', value: `${stats.inventory_count}개`, icon: '🎒' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">{icon} {label}</p>
                <p className="text-white font-bold">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/new-game')}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 transition"
          >
            새 모험
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-semibold hover:bg-gray-700 transition"
          >
            대시보드
          </button>
        </div>
      </div>
    </div>
  )
}