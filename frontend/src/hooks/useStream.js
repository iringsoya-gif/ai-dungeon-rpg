import { useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { API_URL, getToken } from '../lib/api'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

export function useStream() {
  const [streaming, setStreaming] = useState(false)
  const [streamError, setStreamError] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const abortRef = useRef(null)
  const { appendStream, clearStream, updateCharacter, updateWorld, updateSnapshotTurn, addHistory } = useGameStore()

  const _doStream = async (gameId, actionText, attempt = 0) => {
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API_URL}/games/${gameId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ text: actionText }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.text()
        let detail
        try { detail = JSON.parse(body) } catch { detail = body }
        throw new Error(detail?.detail || `HTTP ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder('utf-8', { fatal: false })
      let gmText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (controller.signal.aborted) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              gmText += data.text
              appendStream(data.text)
            }
            if (data.error) {
              clearStream()
              setStreamError(data.error)
            }
            if (data.done) {
              if (data.character) updateCharacter(data.character)
              if (data.world) updateWorld(data.world)
              if (data.snapshot_turn !== undefined) updateSnapshotTurn(data.snapshot_turn)
              addHistory({ role: 'player', content: actionText })
              addHistory({ role: 'gm', content: gmText })
            }
          } catch { /* incomplete JSON */ }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return

      // 네트워크 오류면 재시도
      if (attempt < MAX_RETRIES) {
        clearStream()
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
        if (!abortRef.current?.signal.aborted) {
          return _doStream(gameId, actionText, attempt + 1)
        }
      }
      clearStream()
      setStreamError(err.message || '연결 오류가 발생했습니다')
    }
  }

  const sendAction = async (gameId, actionText) => {
    setLastAction({ gameId, actionText })
    setStreaming(true)
    setStreamError(null)
    clearStream()

    try {
      await _doStream(gameId, actionText)
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
  }

  const retry = () => {
    if (lastAction) sendAction(lastAction.gameId, lastAction.actionText)
  }

  return { streaming, streamError, lastAction, sendAction, retry, cancel }
}
