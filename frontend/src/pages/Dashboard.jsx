import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../lib/api'

export default function Dashboard() {
  const user     = useAuthStore(s => s.user)
  const setUser  = useAuthStore(s => s.setUser)
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [games, setGames]     = useState([])
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    api.listGames().then(setGames).catch(console.error)
  }, [])

  const handleLogout = () => { logout(); navigate('/') }

  const handleSyncPlan = async () => {
    setSyncing(true)
    try {
      const res = await api.syncPlan()
      if (res.upgraded) {
        const me = await api.getMe()
        setUser(me)
        alert('영웅 플랜이 활성화되었습니다!')
      } else {
        alert(`플랜 동기화 완료 (현재: ${res.plan})\n결제 내역이 확인되지 않았습니다.`)
      }
    } catch (e) {
      alert('동기화 실패: ' + (e?.detail || String(e)))
    }
    setSyncing(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('이 게임을 삭제하시겠습니까?')) return
    await api.deleteGame(id)
    setGames(games.filter(g => g.id !== id))
  }

  const canCreate = user?.plan === 'paid' || games.filter(g => g.status === 'active').length < 1

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Header */}
      <header style={{
        background: 'rgba(10,10,16,0.95)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)', letterSpacing: '0.03em' }}>
          ⚔ AI Dungeon RPG
        </span>

        {user?.plan === 'paid' && (
          <span style={{
            fontSize: '0.65rem', color: 'var(--purple)',
            border: '1px solid rgba(157,127,232,0.3)',
            padding: '0.15rem 0.5rem', borderRadius: '9999px',
            background: 'rgba(157,127,232,0.08)',
          }}>
            PRO
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user?.picture && (
            <img
              src={user.picture}
              style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', border: '1px solid var(--border2)' }}
              alt=""
            />
          )}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{user?.name}</span>
          <button
            onClick={handleLogout}
            style={{
              fontSize: '0.75rem', color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: '0.5rem',
              padding: '0.275rem 0.7rem', background: 'transparent', cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1.25rem', width: '100%', flex: 1 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>내 모험</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{games.length}개의 이야기</p>
          </div>
          {canCreate ? (
            <Link
              to="/new-game"
              style={{
                padding: '0.5rem 1.125rem',
                background: 'linear-gradient(135deg, #6a3fa0, var(--purple))',
                color: '#fff',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.8rem',
                textDecoration: 'none',
                boxShadow: '0 0 16px rgba(157,127,232,0.2)',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 24px rgba(157,127,232,0.35)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 16px rgba(157,127,232,0.2)'}
            >
              + 새 모험
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleSyncPlan}
                disabled={syncing}
                title="결제했는데 반영 안 됐을 때"
                style={{
                  padding: '0.5rem 0.875rem',
                  background: 'transparent',
                  color: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  opacity: syncing ? 0.6 : 1,
                }}
              >
                {syncing ? '확인 중...' : '↻ 플랜 동기화'}
              </button>
              <Link
                to="/pricing"
                style={{
                  padding: '0.5rem 1.125rem',
                  background: 'var(--surface)',
                  color: 'var(--text-dim)',
                  border: '1px solid var(--border2)',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(157,127,232,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
              >
                업그레이드
              </Link>
            </div>
          )}
        </div>

        {games.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>◈</div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>아직 모험이 없습니다</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '2rem' }}>새 모험을 시작하여 전설을 써내려가세요</p>
            {canCreate && (
              <Link
                to="/new-game"
                style={{
                  display: 'inline-block',
                  padding: '0.625rem 1.75rem',
                  background: 'linear-gradient(135deg, #6a3fa0, var(--purple))',
                  color: '#fff',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                첫 모험 시작하기
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {games.map(game => {
              const isActive    = game.status === 'active'
              const isDead      = game.status === 'dead'
              const isCompleted = game.status === 'completed'
              return (
                <div
                  key={game.id}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${isActive ? 'var(--border2)' : 'var(--border)'}`,
                    borderRadius: '0.875rem',
                    padding: '1rem 1.125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.875rem',
                    transition: 'border-color 0.2s',
                    opacity: isDead || isCompleted ? 0.65 : 1,
                  }}
                  onMouseEnter={e => { if (isActive) e.currentTarget.style.borderColor = 'rgba(157,127,232,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isActive ? 'var(--border2)' : 'var(--border)' }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                    background: isDead ? 'var(--red)' : isCompleted ? 'var(--muted)' : 'var(--emerald)',
                    boxShadow: isActive ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>{game.title}</span>
                      {game.hardcore_mode && (
                        <span style={{
                          fontSize: '0.6rem', color: 'var(--red)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          padding: '0.1rem 0.4rem', borderRadius: '9999px',
                        }}>HC</span>
                      )}
                      {isDead && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>사망</span>
                      )}
                      {isCompleted && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--muted)', border: '1px solid var(--border)', padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>완료</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {game.character?.name} · {game.character?.class} · <span style={{ fontFamily: 'monospace' }}>{game.turn_count}</span>턴
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/game/${game.id}`)}
                      style={{
                        padding: '0.4rem 0.875rem',
                        background: isActive ? 'rgba(157,127,232,0.12)' : 'var(--surface2)',
                        color: isActive ? 'var(--purple)' : 'var(--muted)',
                        border: `1px solid ${isActive ? 'rgba(157,127,232,0.3)' : 'var(--border)'}`,
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(157,127,232,0.2)' : '#1e1e2e'}
                      onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(157,127,232,0.12)' : 'var(--surface2)'}
                    >
                      {isActive ? '계속' : '보기'}
                    </button>
                    <button
                      onClick={() => handleDelete(game.id)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        background: 'transparent',
                        color: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'color 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
