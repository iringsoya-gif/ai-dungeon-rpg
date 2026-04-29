import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

function stripJson(text) {
  return (text || '').replace(/```json[\s\S]*?```/g, '').trim()
}

function renderPlayer(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <em key={i} style={{ color: '#c9a84c', fontStyle: 'italic', fontWeight: 600 }}>{p.slice(2, -2)}</em>
      : <span key={i}>{p}</span>
  )
}

export default function Story() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api.getStory(id)
      .then(setData)
      .catch(() => setNotFound(true))
  }, [id])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#0a0a10', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: '#4a4a60', fontSize: '0.9rem' }}>모험 기록을 찾을 수 없습니다</p>
      <button onClick={() => navigate('/')} style={{ color: '#9d7fe8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
        홈으로
      </button>
    </div>
  )

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#0a0a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4a4a60', fontSize: '0.85rem' }}>불러오는 중...</p>
    </div>
  )

  const { character, title, histories, status } = data
  const gm = histories.filter(h => h.role === 'gm')
  const player = histories.filter(h => h.role === 'player')

  return (
    <div style={{ background: '#0a0a10', minHeight: '100vh', padding: '2rem 1rem 4rem' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid #1e1e2e' }}>
          <p style={{ color: '#3a3a50', fontSize: '0.7rem', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>AI DUNGEON RPG — 모험 기록</p>
          <h1 style={{ color: '#e8e4f8', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h1>
          <p style={{ color: '#6b6b90', fontSize: '0.85rem' }}>
            {character?.name} · {character?.class} · Lv.{character?.level}
            {status === 'dead' && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>☠ 하드코어 사망</span>}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              onClick={copyLink}
              style={{ fontSize: '0.78rem', color: copied ? '#22c55e' : '#9d7fe8', background: 'rgba(157,127,232,0.08)', border: '1px solid rgba(157,127,232,0.25)', borderRadius: '0.5rem', padding: '0.4rem 0.9rem', cursor: 'pointer' }}
            >
              {copied ? '✓ 링크 복사됨' : '🔗 링크 복사'}
            </button>
            <button
              onClick={() => navigate('/')}
              style={{ fontSize: '0.78rem', color: '#c9a84c', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '0.5rem', padding: '0.4rem 0.9rem', cursor: 'pointer' }}
            >
              ⚔ 나도 모험 시작하기
            </button>
          </div>
        </div>

        {/* Story */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {histories.map((h, i) => (
            h.role === 'gm' ? (
              <div key={i}>
                <p style={{ color: '#ddd8f0', fontSize: '0.95rem', lineHeight: 2.0, whiteSpace: 'pre-wrap', fontFamily: "'Noto Serif KR', serif" }}>
                  {stripJson(h.content)}
                </p>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ maxWidth: '28rem', background: '#111828', border: '1px solid #1e2a42', borderRadius: '1rem 1rem 0.25rem 1rem', padding: '0.7rem 1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#c8d8f0', lineHeight: 1.7, margin: 0 }}>
                    {renderPlayer(h.content)}
                  </p>
                </div>
              </div>
            )
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #1e1e2e' }}>
          <p style={{ color: '#3a3a50', fontSize: '0.75rem', marginBottom: '1rem' }}>이 모험은 AI 게임마스터가 실시간으로 생성한 이야기입니다</p>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '0.65rem 1.75rem', background: 'linear-gradient(135deg, #6a3fa0, #9d7fe8)', color: '#fff', borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
          >
            나도 모험 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}
