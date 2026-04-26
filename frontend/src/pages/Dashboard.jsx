import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'

export default function Dashboard() {
  const user     = useAuthStore(s => s.user)
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [games, setGames] = useState([])

  useEffect(() => {
    api.listGames().then(setGames).catch(console.error)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const handleDelete = async (id) => {
    if (!confirm('이 게임을 삭제하시겠습니까?')) return
    await api.deleteGame(id)
    setGames(games.filter(g => g.id !== id))
  }

  const canCreate = user?.plan === 'paid' || games.filter(g => g.status === 'active').length < 1

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center">
        <span className="text-emerald-400 text-xl mr-3">⚔️</span>
        <h1 className="text-lg font-bold">AI 던전 RPG</h1>
        {user?.plan === 'paid' && (
          <span className="ml-3 text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-1 rounded-full">
            ✓ Adventurer
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {user?.picture && <img src={user.picture} className="w-7 h-7 rounded-full" alt="" />}
          <span className="text-sm text-gray-400">{user?.name}</span>
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1 rounded-lg">
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">내 모험</h2>
          {canCreate ? (
            <Link to="/new-game" className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition text-sm">
              + 새 모험 시작
            </Link>
          ) : (
            <Link to="/pricing" className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg font-semibold hover:bg-gray-600 transition text-sm">
              🔒 업그레이드
            </Link>
          )}
        </div>

        {games.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🗺️</div>
            <p>아직 모험이 없습니다. 새 모험을 시작하세요!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {games.map(game => (
              <div key={game.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{game.title}</h3>
                    {game.hardcore_mode && <span className="text-xs text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">하드코어</span>}
                    {game.status === 'dead' && <span className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">💀 사망</span>}
                  </div>
                  <p className="text-sm text-gray-400">{game.character?.name} · {game.character?.class} · {game.turn_count}턴</p>
                </div>
                <div className="flex gap-2">
                  {game.status === 'active' && (
                    <button onClick={() => navigate(`/game/${game.id}`)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">
                      계속하기
                    </button>
                  )}
                  <button onClick={() => handleDelete(game.id)}
                    className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700">
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}