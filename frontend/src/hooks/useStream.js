import { useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { API_URL, getToken } from '../lib/api'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.httpStatus = status
  }
}

function friendlyError(status, detail) {
  if (status === 429) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요. (분당 15회 제한)'
  if (status === 401) return '로그인이 만료되었습니다. 새로고침 후 다시 시도해주세요.'
  if (status === 400) return detail || '잘못된 요청입니다.'
  if (status === 403) return detail || '접근 권한이 없습니다.'
  if (status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  return detail || `오류가 발생했습니다 (${status})`
}

export function useStream() {
  const [streaming, setStreaming] = useState(false)
  const [streamError, setStreamError] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const abortRef = useRef(null)
  const { appendStream, clearStream, updateCharacter, updateWorld, updateSnapshotTurn, addHistory, updateGameStatus } = useGameStore()

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
        try { detail = JSON.parse(body)?.detail } catch { detail = body }
        // 429는 재시도 안 함
        if (res.status === 429) {
          clearStream()
          setStreamError(friendlyError(429, detail))
          return
        }
        throw new HttpError(res.status, friendlyError(res.status, detail))
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder('utf-8', { fatal: false })
      let gmText = ''
      let buffer = ''
      let errorReceived = false

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
              errorReceived = true
              return  // 에러 수신 즉시 중단
            }
            if (data.done) {
              // Guard: skip if user navigated to a different game while streaming
              const currentId = useGameStore.getState().game?.id
              if (currentId === gameId) {
                if (data.character) updateCharacter(data.character)
                if (data.world) updateWorld(data.world)
                if (data.snapshot_turn !== undefined) updateSnapshotTurn(data.snapshot_turn)
                if (data.game_status) updateGameStatus(data.game_status)
                if (gmText.trim()) {
                  addHistory({ role: 'player', content: actionText })
                  addHistory({ role: 'gm', content: gmText })
                }
              }
            }
          } catch { /* incomplete JSON */ }
        }

        if (errorReceived) break
      }
    } catch (err) {
      if (err.name === 'AbortError') return

      // 네트워크 오류·5xx → 재시도 (4xx 제외)
      if (attempt < MAX_RETRIES && !(err.httpStatus >= 400 && err.httpStatus < 500)) {
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
