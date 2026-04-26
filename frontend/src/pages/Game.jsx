import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { api } from '../lib/api'
import { useStream } from '../hooks/useStream'
import StreamText from '../components/ui/StreamText'
import StatusPanel from '../components/game/StatusPanel'
import CharacterSheet from '../components/game/CharacterSheet'

export default function Game() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { game, histories, streamText, setGame } = useGameStore()
  const { streaming, streamError, sendAction, cancel } = useStream()
  const [input, setInput] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => () => cancel(), [])

  useEffect(() => {
    api.getGame(id).then(setGame).catch(() => navigate('/dashboard'))
  }, [id, navigate, setGame])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [histories, streamText])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || streaming) return
    const text = input.trim()
    setInput('')
    await sendAction(id, text)
  }

  if (!game) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      로딩 중...
    </div>
  )

  const isDead = game.status === 'dead' || game.status === 'completed'

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-300 text-sm">← 대시보드</button>
        <span className="text-gray-700">|</span>
        <span className="font-semibold">{game.title}</span>
        {game.hardcore_mode && <span className="text-xs text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">하드코어</span>}
        <span className="ml-auto text-xs text-gray-600 font-mono">{game.turn_count}턴</span>
        {!isDead && (
          <button
            onClick={async () => {
              if (!confirm('모험을 완료하시겠습니까?')) return
              try {
                const data = await api.completeGame(id)
                navigate(`/games/${id}/over`, { state: { stats: data.stats, game: data } })
              } catch {
                navigate('/dashboard')
              }
            }}
            className="hidden md:block text-xs text-gray-500 hover:text-gray-300 border border-gray-700 rounded px-2 py-1"
          >
            완료
          </button>
        )}
        <button
          onClick={() => setShowSidebar(s => !s)}
          className="md:hidden text-gray-500 hover:text-gray-300 text-sm border border-gray-700 rounded px-2 py-1"
        >
          {showSidebar ? '닫기' : '상태'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {histories.map((h, i) => (
              <div key={i} className={`flex ${h.role === 'player' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-xl px-4 py-3 text-sm ${
                  h.role === 'player'
                    ? 'bg-gray-800 text-gray-200'
                    : 'bg-gray-900 border border-gray-800 text-emerald-100'
                }`}>
                  {h.role === 'player' && <span className="text-xs text-gray-500 block mb-1">▶ 플레이어</span>}
                  {h.role === 'gm'     && <span className="text-xs text-emerald-600 block mb-1">⚔️ GM</span>}
                  <p className="whitespace-pre-wrap">{h.content}</p>
                </div>
              </div>
            ))}

            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-2xl bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm">
                  <span className="text-xs text-emerald-600 block mb-1">⚔️ GM</span>
                  <StreamText text={streamText} isStreaming={true} />
                </div>
              </div>
            )}

            {streamError && (
              <div className="flex justify-start">
                <div className="max-w-2xl bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
                  ⚠️ {streamError}
                </div>
              </div>
            )}

            {isDead && (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">💀</div>
                <p className="text-red-400 font-bold text-lg">모험이 종료되었습니다</p>
                <p className="text-gray-500 text-sm mt-1">새 모험을 시작하세요</p>
                <button onClick={() => navigate('/new-game')}
                  className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">
                  새 모험 시작
                </button>
                <button onClick={async () => {
                  try {
                    const data = await api.completeGame(id)
                    navigate(`/games/${id}/over`, { state: { stats: data.stats, game: data } })
                  } catch {
                    navigate(`/games/${id}/over`)
                  }
                }}
                  className="mt-2 px-6 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                >
                  결과 보기
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {!isDead && (
            <form onSubmit={handleSubmit} className="border-t border-gray-800 p-4 flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={streaming}
                placeholder="무엇을 하시겠습니까? (자유롭게 입력하세요)"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3
                           text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500/50
                           disabled:opacity-50"
              />
              <button type="submit" disabled={streaming || !input.trim()}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold
                           hover:bg-emerald-500 disabled:opacity-30 transition">
                {streaming ? '...' : '↵'}
              </button>
            </form>
          )}
        </div>

        <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col`}>
          <StatusPanel character={game.character} onOpenSheet={() => setShowSheet(true)} />
        </div>
      </div>
      {showSheet && <CharacterSheet character={game?.character} onClose={() => setShowSheet(false)} />}
    </div>
  )
}