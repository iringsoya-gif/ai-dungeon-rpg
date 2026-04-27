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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Header */}
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0.875rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '1.25rem', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.5))' }}>⚔️</span>
        <h1
          style={{
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'var(--gold-light)',
            letterSpacing: '0.05em',
          }}
        >
          AI Dungeon RPG
        </h1>
        {user?.plan === 'paid' && (
          <span
            style={{
              fontSize: '0.7rem',
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              letterSpacing: '0.05em',
            }}
          >
            👑 영웅
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {user?.picture && (
            <img
              src={user.picture}
              className="rounded-full"
              style={{ width: '2rem', height: '2rem', border: '1px solid var(--border)' }}
              alt=""
            />
          )}
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{user?.name}</span>
          <button
            onClick={handleLogout}
            style={{
              fontSize: '0.75rem',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              padding: '0.3rem 0.75rem',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text)'
              e.currentTarget.style.borderColor = '#4a4a60'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--muted)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1.5rem', width: '100%' }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>내 모험</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
              {games.length}개의 이야기
            </p>
          </div>
          {canCreate ? (
            <Link
              to="/new-game"
              className="btn-gold-glow"
              style={{
                padding: '0.625rem 1.25rem',
                background: 'linear-gradient(135deg, #8a6820, var(--gold), #8a6820)',
                color: '#0a0805',
                borderRadius: '0.75rem',
                fontWeight: 800,
                fontSize: '0.875rem',
                textDecoration: 'none',
                border: 'none',
                letterSpacing: '0.02em',
              }}
            >
              + 새 모험 시작
            </Link>
          ) : (
            <Link
              to="/pricing"
              style={{
                padding: '0.625rem 1.25rem',
                background: 'var(--surface2)',
                color: 'var(--gold)',
                border: '1px solid rgba(201,168,76,0.35)',
                borderRadius: '0.75rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface2)'}
            >
              🔒 업그레이드
            </Link>
          )}
        </div>

        {/* Decorative line */}
        <div style={{ height: '1px', background: 'linear-gradient(to right, var(--border), transparent)', marginBottom: '1.5rem' }} />

        {games.length === 0 ? (
          <div className="text-center" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
            <div
              style={{ fontSize: '4rem', marginBottom: '1.25rem', filter: 'grayscale(0.3) opacity(0.5)' }}
            >
              🗺️
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>
              아직 모험이 없습니다
            </p>
            <p style={{ color: '#4a4a5a', fontSize: '0.85rem', marginBottom: '2rem' }}>
              새 모험을 시작하여 전설을 써내려가세요
            </p>
            {canCreate && (
              <Link
                to="/new-game"
                className="btn-gold-glow"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(135deg, #8a6820, var(--gold), #8a6820)',
                  color: '#0a0805',
                  borderRadius: '0.875rem',
                  fontWeight: 800,
                  fontSize: '1rem',
                  textDecoration: 'none',
                }}
              >
                ⚔️ 첫 모험 시작하기
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.875rem' }}>
            {games.map(game => {
              const isActive = game.status === 'active'
              const isDead   = game.status === 'dead'
              return (
                <div
                  key={game.id}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${isActive ? 'var(--border)' : '#1e1e28'}`,
                    borderRadius: '1rem',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'border-color 0.25s, box-shadow 0.25s',
                  }}
                  onMouseEnter={e => {
                    if (isActive) {
                      e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'
                      e.currentTarget.style.boxShadow = '0 0 16px rgba(201,168,76,0.07)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isActive ? 'var(--border)' : '#1e1e28'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: isDead ? 'var(--red)' : isActive ? 'var(--emerald)' : 'var(--muted)',
                      boxShadow: isDead
                        ? '0 0 8px rgba(239,68,68,0.5)'
                        : isActive
                        ? '0 0 8px rgba(16,185,129,0.5)'
                        : 'none',
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: isActive ? 'var(--text)' : 'var(--muted)' }}>
                        {game.title}
                      </h3>
                      {game.hardcore_mode && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--red)',
                            border: '1px solid rgba(239,68,68,0.35)',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '9999px',
                          }}
                        >
                          하드코어
                        </span>
                      )}
                      {isDead && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--muted)',
                            border: '1px solid var(--border)',
                            padding: '0.1rem 0.5rem',
                            borderRadius: '9999px',
                          }}
                        >
                          💀 사망
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {game.character?.name} · {game.character?.class} ·{' '}
                      <span style={{ fontFamily: 'monospace' }}>{game.turn_count}</span>턴
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {isActive && (
                      <button
                        onClick={() => navigate(`/game/${game.id}`)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(16,185,129,0.15)',
                          color: 'var(--emerald)',
                          border: '1px solid rgba(16,185,129,0.35)',
                          borderRadius: '0.625rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                      >
                        계속하기
                      </button>
                    )}
                    {!isActive && (
                      <button
                        onClick={() => navigate(`/game/${game.id}`)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--surface2)',
                          color: 'var(--muted)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.625rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#222230'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface2)'}
                      >
                        보기
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(game.id)}
                      style={{
                        padding: '0.5rem 0.875rem',
                        background: 'transparent',
                        color: '#4a4a5a',
                        border: '1px solid var(--border)',
                        borderRadius: '0.625rem',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'color 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--red)'
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = '#4a4a5a'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
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