import { useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { API_URL, getToken } from '../lib/api'

export function useStream() {
  const [streaming, setStreaming] = useState(false)
  const [streamError, setStreamError] = useState(null)
  const abortRef = useRef(null)
  const { appendStream, clearStream, updateCharacter, addHistory } = useGameStore()

  const sendAction = async (gameId, actionText) => {
    setStreaming(true)
    setStreamError(null)
    clearStream()

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
              addHistory({ role: 'player', content: actionText })
              addHistory({ role: 'gm', content: gmText })
            }
          } catch { /* incomplete JSON, ignore */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        clearStream()
        setStreamError(err.message || '연결 오류가 발생했습니다')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
  }

  return { streaming, streamError, sendAction, cancel }
}