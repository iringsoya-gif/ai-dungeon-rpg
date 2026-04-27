import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const CLASSES = [
  { id: '전사',  label: '전사',  icon: '⚔️',  desc: '강한 체력과 힘',       stats: { STR: 16, DEF: 14, INT: 6,  AGI: 8  } },
  { id: '마법사', label: '마법사', icon: '🔮',  desc: '높은 지능과 마나',      stats: { STR: 6,  DEF: 6,  INT: 18, AGI: 10 } },
  { id: '도적',  label: '도적',  icon: '🗡️',  desc: '뛰어난 민첩성',        stats: { STR: 10, DEF: 8,  INT: 10, AGI: 18 } },
  { id: '성직자', label: '성직자', icon: '✨',  desc: '카리스마와 회복',       stats: { STR: 8,  DEF: 10, INT: 14, AGI: 8  } },
  { id: '궁수',  label: '궁수',  icon: '🏹',  desc: '힘과 민첩의 균형',      stats: { STR: 12, DEF: 10, INT: 8,  AGI: 14 } },
]

const TEMPLATES = [
  { label: '판타지', icon: '🏰', desc: '중세 마법과 용이 존재하는 세계' },
  { label: 'SF',    icon: '🚀', desc: '우주와 첨단 기술의 미래 세계' },
  { label: '공포',  icon: '👻', desc: '어둠과 공포가 지배하는 세계' },
  { label: '현대',  icon: '🌆', desc: '현실과 비슷한 현대 도시' },
  { label: '커스텀', icon: '✏️', desc: '직접 세계관을 입력합니다' },
]

const STEPS = ['세계관', '세계 설명', '캐릭터']

export default function NewGame() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [template, setTemplate] = useState(null)
  const [worldDesc, setWorldDesc] = useState('')
  const [charName, setCharName] = useState('')
  const [charClass, setCharClass] = useState('전사')
  const [charBg, setCharBg] = useState('')
  const [hardcore, setHardcore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectTemplate = (t) => {
    setTemplate(t)
    if (t.label !== '커스텀') setWorldDesc(t.desc)
    setStep(2)
  }

  const handleCreate = async () => {
    if (!charName || !charClass || !charBg) { setError('모든 항목을 입력해주세요'); return }
    setLoading(true)
    try {
      const game = await api.createGame({
        world_description: worldDesc,
        character_name: charName,
        character_class: charClass,
        character_background: charBg,
        hardcore_mode: hardcore,
      })
      navigate(`/game/${game.id}`)
    } catch (e) {
      setError(e?.message || '게임 생성 실패')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{ color: 'var(--muted)', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-light)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          ← 뒤로
        </button>

        {/* Title */}
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--gold-light)',
            letterSpacing: '0.03em',
            marginBottom: '0.5rem',
            textShadow: '0 0 20px rgba(201,168,76,0.3)',
          }}
        >
          새 모험 시작
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
          당신만의 전설을 써내려가세요
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, idx) => {
            const s = idx + 1
            const active  = step === s
            const done    = step > s
            return (
              <div key={s} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={active ? 'step-active' : ''}
                    style={{
                      width: '1.75rem',
                      height: '1.75rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: done
                        ? 'linear-gradient(135deg, #8a6820, var(--gold))'
                        : active
                        ? 'var(--surface2)'
                        : 'var(--surface)',
                      border: `1px solid ${done || active ? 'var(--gold)' : 'var(--border)'}`,
                      color: done ? '#0a0805' : active ? 'var(--gold)' : 'var(--muted)',
                      transition: 'all 0.3s',
                    }}
                  >
                    {done ? '✓' : s}
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: active ? 'var(--gold-light)' : done ? 'var(--gold)' : 'var(--muted)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{ width: '1.5rem', height: '1px', background: step > s ? 'var(--gold)' : 'var(--border)', transition: 'background 0.3s', flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>

        {/* STEP 1 — World template */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#a89880', marginBottom: '1rem', letterSpacing: '0.05em' }}>
              ✦ 세계관 선택
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.label}
                  onClick={() => selectTemplate(t)}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    padding: '1.25rem 1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--gold)'
                    e.currentTarget.style.background = 'var(--surface2)'
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(201,168,76,0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: '2.25rem', marginBottom: '0.625rem' }}>{t.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.25rem' }}>{t.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.4 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 — World description */}
        {step === 2 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#a89880', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              ✦ 세계관 설명
            </h2>
            {template && (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                {template.icon} {template.label} — 원하는 대로 자유롭게 수정하세요
              </p>
            )}
            <textarea
              value={worldDesc}
              onChange={e => setWorldDesc(e.target.value)}
              rows={5}
              placeholder="예: 마법이 존재하고 용이 지배하는 중세 왕국. 암흑 마법사가 왕을 조종하고 있다..."
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '0.875rem',
                padding: '1rem',
                color: 'var(--text)',
                resize: 'none',
                marginBottom: '1.25rem',
                outline: 'none',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => setStep(3)}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'var(--surface2)',
                border: '1px solid var(--gold)',
                color: 'var(--gold-light)',
                borderRadius: '0.875rem',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface2)'}
            >
              다음 → 캐릭터 생성
            </button>
          </>
        )}

        {/* STEP 3 — Character creation */}
        {step === 3 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#a89880', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
              ✦ 캐릭터 생성
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Name */}
              <input
                value={charName}
                onChange={e => setCharName(e.target.value)}
                placeholder="캐릭터 이름"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.875rem',
                  padding: '0.875rem 1rem',
                  color: 'var(--text)',
                  outline: 'none',
                  fontSize: '0.95rem',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />

              {/* Class selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.625rem', letterSpacing: '0.05em' }}>
                  직업 선택
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.625rem' }}>
                  {CLASSES.map(cls => {
                    const sel = charClass === cls.id
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setCharClass(cls.id)}
                        style={{
                          padding: '0.875rem 0.75rem',
                          borderRadius: '0.875rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: sel ? 'rgba(201,168,76,0.08)' : 'var(--surface)',
                          border: `1px solid ${sel ? 'var(--gold)' : 'var(--border)'}`,
                          boxShadow: sel ? '0 0 12px rgba(201,168,76,0.15)' : 'none',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
                            e.currentTarget.style.background = 'var(--surface2)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.background = 'var(--surface)'
                          }
                        }}
                      >
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{cls.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: sel ? 'var(--gold-light)' : 'var(--text)', marginBottom: '0.2rem' }}>
                          {cls.label}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>{cls.desc}</div>
                        {/* Stat preview */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.15rem' }}>
                          {Object.entries(cls.stats).map(([k, v]) => (
                            <div key={k} style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: sel ? 'var(--gold)' : '#5a5a70' }}>
                              {k}:{v}
                            </div>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Background */}
              <textarea
                value={charBg}
                onChange={e => setCharBg(e.target.value)}
                rows={3}
                placeholder="배경 스토리 (예: 고아 출신으로 마법학교를 졸업했다...)"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.875rem',
                  padding: '0.875rem 1rem',
                  color: 'var(--text)',
                  resize: 'none',
                  outline: 'none',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />

              {/* Hardcore toggle */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.875rem',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: hardcore ? 'var(--red)' : 'var(--text)' }}>
                    💀 하드코어 모드
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    사망 시 게임 영구 종료 — 긴장감 극대화
                  </div>
                </div>
                <button
                  onClick={() => setHardcore(!hardcore)}
                  style={{
                    width: '3rem',
                    height: '1.625rem',
                    borderRadius: '9999px',
                    background: hardcore ? 'rgba(239,68,68,0.8)' : 'var(--border)',
                    border: `1px solid ${hardcore ? 'var(--red)' : '#3a3a50'}`,
                    cursor: 'pointer',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.2s, border-color 0.2s',
                    boxShadow: hardcore ? '0 0 10px rgba(239,68,68,0.4)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      background: '#fff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '50%',
                      transform: `translateY(-50%) translateX(${hardcore ? '1.375rem' : '0.125rem'})`,
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
              </div>

              {error && (
                <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={loading}
                className={loading ? 'btn-loading' : 'btn-gold-glow'}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #8a6820, #c9a84c, #8a6820)',
                  color: '#0a0805',
                  borderRadius: '0.875rem',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? '⏳ 모험 준비 중...' : '⚔️ 모험 시작!'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}