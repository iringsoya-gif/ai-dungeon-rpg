import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const CLASSES = [
  { id: '전사',   label: '전사',   icon: '⚔️',  desc: '강한 체력과 힘' },
  { id: '마법사',  label: '마법사',  icon: '🔮',  desc: '높은 지능과 마나' },
  { id: '도적',   label: '도적',   icon: '🗡️',  desc: '뛰어난 민첩성' },
  { id: '성직자',  label: '성직자',  icon: '✨',  desc: '카리스마와 회복' },
  { id: '궁수',   label: '궁수',   icon: '🏹',  desc: '힘과 민첩의 균형' },
]

const TEMPLATES = [
  { label: '판타지', icon: '🏰', desc: '중세 마법과 용이 존재하는 세계' },
  { label: 'SF',    icon: '🚀', desc: '우주와 첨단 기술의 미래 세계' },
  { label: '공포',  icon: '👻', desc: '어둠과 공포가 지배하는 세계' },
  { label: '현대',  icon: '🌆', desc: '현실과 비슷한 현대 도시' },
  { label: '커스텀', icon: '✏️', desc: '직접 세계관을 입력합니다' },
]

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
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-300 mb-6 text-sm">← 뒤로</button>
        <h1 className="text-3xl font-bold mb-8">새 모험 시작</h1>

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">세계관 선택</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => selectTemplate(t)}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left hover:border-emerald-500/50 transition">
                  <div className="text-3xl mb-2">{t.icon}</div>
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold mb-2 text-gray-300">세계관 설명</h2>
            <textarea
              value={worldDesc}
              onChange={e => setWorldDesc(e.target.value)}
              rows={4}
              placeholder="예: 마법이 존재하고 용이 지배하는 중세 왕국. 암흑 마법사가 왕을 조종하고 있다..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-200 resize-none mb-6 focus:border-emerald-500/50 outline-none"
            />
            <button onClick={() => setStep(3)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500">
              다음 → 캐릭터 생성
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold mb-4 text-gray-300">캐릭터 생성</h2>
            <div className="space-y-4">
              <input value={charName} onChange={e => setCharName(e.target.value)}
                placeholder="캐릭터 이름"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-200 focus:border-emerald-500/50 outline-none" />
              <div>
                <label className="block text-sm text-gray-400 mb-2">직업 선택</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CLASSES.map(cls => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setCharClass(cls.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        charClass === cls.id
                          ? 'border-emerald-500 bg-emerald-950/50 text-white'
                          : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-xl mb-1">{cls.icon}</div>
                      <div className="font-semibold text-sm">{cls.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{cls.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={charBg} onChange={e => setCharBg(e.target.value)}
                rows={3} placeholder="배경 스토리 (예: 고아 출신으로 마법학교를 졸업했다...)"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-200 resize-none focus:border-emerald-500/50 outline-none" />

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">하드코어 모드</div>
                  <div className="text-xs text-gray-500">사망 시 게임 영구 종료 (긴장감 극대화)</div>
                </div>
                <button onClick={() => setHardcore(!hardcore)}
                  className={`w-12 h-6 rounded-full transition-colors ${hardcore ? 'bg-red-500' : 'bg-gray-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${hardcore ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button onClick={handleCreate} disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 transition">
                {loading ? '모험 준비 중...' : '⚔️ 모험 시작!'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}