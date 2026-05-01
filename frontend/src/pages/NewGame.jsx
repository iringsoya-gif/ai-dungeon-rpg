import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const TEMPLATES = [
  { label: '판타지', icon: '🏰', desc: '중세 마법과 용이 존재하는 세계' },
  { label: 'SF',    icon: '🚀', desc: '우주와 첨단 기술의 미래 세계' },
  { label: '공포',  icon: '👻', desc: '어둠과 공포가 지배하는 세계' },
  { label: '현대',  icon: '🌆', desc: '현실과 비슷한 현대 도시' },
  { label: '커스텀', icon: '✏️', desc: '직접 세계관을 입력합니다' },
]

const CLASSES_BY_TEMPLATE = {
  '판타지': [
    { id: '전사',   label: '전사',   icon: '⚔️',  desc: '강인한 육체와 전장 경험', stats: { STR:16, INT:6,  AGI:8,  CHA:8  } },
    { id: '마법사',  label: '마법사',  icon: '🔮',  desc: '비전 마법과 높은 지능',    stats: { STR:6,  INT:16, AGI:8,  CHA:10 } },
    { id: '도적',   label: '도적',   icon: '🗡️',  desc: '암살과 뛰어난 민첩성',    stats: { STR:10, INT:10, AGI:16, CHA:8  } },
    { id: '성직자',  label: '성직자',  icon: '🕊️', desc: '신성 마법과 회복',        stats: { STR:8,  INT:12, AGI:8,  CHA:16 } },
    { id: '궁수',   label: '궁수',   icon: '🏹',  desc: '원거리와 정밀 조준',      stats: { STR:12, INT:8,  AGI:14, CHA:10 } },
  ],
  'SF': [
    { id: '전투병',  label: '전투병',  icon: '🪖',  desc: '중무장 근접전 전문',      stats: { STR:16, INT:6,  AGI:8,  CHA:8  } },
    { id: '해커',   label: '해커',   icon: '💻',  desc: '시스템 침투와 전자전',    stats: { STR:6,  INT:16, AGI:10, CHA:8  } },
    { id: '의무관',  label: '의무관',  icon: '💉',  desc: '전장 치료와 생존 지원',   stats: { STR:8,  INT:12, AGI:8,  CHA:16 } },
    { id: '정찰병',  label: '정찰병',  icon: '🔭',  desc: '고속 이동과 정보 수집',   stats: { STR:10, INT:10, AGI:16, CHA:8  } },
    { id: '엔지니어', label: '엔지니어', icon: '🔧',  desc: '장비 제작과 시스템 분석', stats: { STR:10, INT:14, AGI:10, CHA:10 } },
  ],
  '공포': [
    { id: '탐정',    label: '탐정',    icon: '🔍',  desc: '단서 추적과 심문 전문',   stats: { STR:8,  INT:16, AGI:8,  CHA:12 } },
    { id: '오컬티스트', label: '오컬티스트', icon: '📿', desc: '금지된 지식과 의식',    stats: { STR:6,  INT:14, AGI:8,  CHA:16 } },
    { id: '생존자',   label: '생존자',   icon: '🪓',  desc: '강인한 육체와 생존 본능', stats: { STR:14, INT:8,  AGI:12, CHA:6  } },
    { id: '의사',    label: '의사',    icon: '🩺',  desc: '응급처치와 심리 분석',    stats: { STR:8,  INT:14, AGI:8,  CHA:12 } },
    { id: '저널리스트', label: '저널리스트', icon: '📷', desc: '취재력과 설득',          stats: { STR:6,  INT:12, AGI:10, CHA:16 } },
  ],
  '현대': [
    { id: '군인',    label: '군인',    icon: '🪖',  desc: '전투 훈련과 강인한 체력', stats: { STR:16, INT:8,  AGI:10, CHA:8  } },
    { id: '형사',    label: '형사',    icon: '🔎',  desc: '수사와 협박·설득',        stats: { STR:10, INT:14, AGI:8,  CHA:12 } },
    { id: '의사',    label: '의사',    icon: '🩺',  desc: '치료와 전문 지식',        stats: { STR:8,  INT:14, AGI:8,  CHA:14 } },
    { id: '사이버해커', label: '사이버해커', icon: '💻', desc: '네트워크 침투와 정보전',  stats: { STR:6,  INT:16, AGI:10, CHA:8  } },
    { id: '특수요원',  label: '특수요원',  icon: '🕶️', desc: '잠입과 전투의 균형',      stats: { STR:12, INT:10, AGI:14, CHA:8  } },
  ],
  '커스텀': [
    { id: '전사',   label: '전사형',   icon: '⚔️',  desc: '강한 근력 중심',   stats: { STR:16, INT:6,  AGI:8,  CHA:8  } },
    { id: '마법사',  label: '지능형',   icon: '🔮',  desc: '높은 지능과 마나',  stats: { STR:6,  INT:16, AGI:8,  CHA:10 } },
    { id: '도적',   label: '민첩형',   icon: '🌀',  desc: '뛰어난 속도와 기습', stats: { STR:10, INT:10, AGI:16, CHA:8  } },
    { id: '성직자',  label: '지원형',   icon: '✨',  desc: '카리스마와 회복',   stats: { STR:8,  INT:12, AGI:8,  CHA:16 } },
    { id: '탐험가',  label: '균형형',   icon: '🗺️', desc: '모든 능력치 균형',  stats: { STR:10, INT:10, AGI:10, CHA:10 } },
  ],
}

const PRESET_DESCRIPTIONS = {
  '판타지': [
    '고대 마법이 쇠퇴한 왕국. 암흑 마법사가 왕을 조종하고, 성 기사단이 비밀 결사와 싸운다. 숲 깊은 곳엔 아직 엘프들이 산다.',
    '세 왕국이 오백 년 전쟁 중. 용이 중립을 지키며 하늘을 지배한다. 마법사 길드만이 진실을 알고 있다.',
    '신들이 사라진 세계. 신전은 텅 비어 있고 마나가 고갈되기 시작했다. 마지막 마법사의 일기를 찾아야 한다.',
  ],
  'SF': [
    '지구가 황폐화된 2387년. 인류는 콜로니 함선에서 살아간다. AI가 자아를 가지기 시작했다는 소문이 퍼진다.',
    '은하 연방의 변방 행성. 기업들이 원주민을 착취하고, 반란군이 결성 중이다. 당신은 어느 편에 설 것인가.',
    '사이버 도시 네오서울 2099. 인간과 안드로이드의 경계가 사라졌다. 연쇄 해킹 사건 뒤에 숨은 진실을 파헤쳐라.',
  ],
  '공포': [
    '1980년대 미국 소도시. 아이들이 하나씩 사라지고 있다. 어른들은 모른다 — 혹은 모른 척한다.',
    '빅토리아 시대 런던. 안개 속에서 살인마가 활동하고 있다. 하지만 피해자들은 모두 같은 악몽을 꿨다.',
    '폐쇄된 연구소. 실험 기록이 삭제됐다. 비상구는 잠겨 있고, 무언가 아직 살아있다.',
  ],
  '현대': [
    '서울 홍대 인근. 심야 도시에서 미스터리한 사건들이 연이어 발생한다. 경찰은 알 수 없는 이유로 덮으려 한다.',
    '국제 스파이 세계. 신뢰할 수 있는 사람은 없고, 모두가 자신의 이익을 위해 움직인다. 당신의 임무는 단 하나.',
    '현대 한국의 재벌가. 상속 분쟁과 기업 비밀, 그리고 오래된 가족의 어두운 과거가 얽혀 있다.',
  ],
  '커스텀': [],
}

const BACKGROUND_PRESETS = {
  '전사':    ['고아로 자란 나는 용병대에 들어가 열 살부터 검을 배웠다. 동료들은 모두 전장에서 죽었고, 나만 살아남았다.', '왕국 근위대 출신. 반란군에 의해 왕이 암살당한 날 나는 다른 임무 중이었다. 그 죄책감이 나를 이 길로 이끌었다.'],
  '마법사':  ['마법사 탑에서 제자로 입문했지만 사제의 비밀을 목격한 뒤 쫓겨났다. 그 비밀이 세계를 뒤흔들 진실임을 안다.', '금지된 마법을 연구하다 사랑하는 이를 잃었다. 그를 되살리기 위해 어떤 위험도 감수할 각오가 되어 있다.'],
  '도적':    ['고아원 출신 소매치기로 시작해 암살자 길드 소속이 됐다. 하지만 무고한 아이의 의뢰를 받은 날부터 모든 게 달라졌다.', '귀족 가문의 사생아. 재산을 빼앗기고 거리에 나앉은 날부터 생존이 곧 도덕이 됐다.'],
  '성직자':  ['신전에서 20년을 봉직했지만 신의 기적이 사라지기 시작했다. 믿음이 흔들리는 지금, 진실을 찾아 길을 떠난다.', '전쟁고아였던 나를 구한 것은 신전의 수녀였다. 그 은혜를 갚기 위해 고통받는 이들을 찾아다닌다.'],
  '궁수':    ['숲의 수호자 집안 출신. 마을이 불타던 날 나만 살아남았고, 범인을 찾아 이미 삼 년을 떠돌았다.', '왕실 사냥꾼 출신. 금단의 사냥터에서 목격한 것 때문에 왕실의 추격을 받고 있다.'],
  '전투병':  ['2차 행성 전쟁 참전 후 제대했지만 민간인 학살 명령 거부 기록 때문에 블랙리스트에 올랐다. 살아남기 위해 뛴다.', '의무 징집으로 군에 들어갔다. 전쟁의 진실을 안 뒤로는 어느 편도 믿을 수 없게 됐다.'],
  '해커':    ['AI 기업 보안 연구원이었다. 회사가 숨긴 데이터를 발견한 날, 나는 도망자가 됐다.', '빈민가 출신 독학 해커. 부패한 관료 시스템에 균열을 내는 것이 내 전쟁이다.'],
  '의무관':  ['전선 의무관이었지만 생체 실험 프로그램의 진실을 알고 탈영했다. 내 기술로 사람을 살리고 싶다.', '바이오 기업 연구원 출신. 개발한 약물이 무기로 쓰이는 걸 알고 내부 고발을 택했다.'],
  '정찰병':  ['용병 정찰 부대에서 활동하다 동료 전원을 잃었다. 그날의 진실은 아직도 모른다.', '항법사 출신 탐험가. 미지의 행성에서 발견한 것이 인류의 역사를 바꿀 수도 있다.'],
  '엔지니어': ['AI 연구소 기술자. 프로토타입 AI가 자아를 가졌다는 걸 확인한 날 연구소가 폐쇄됐다.', '함선 엔지니어 15년. 마지막 임무에서 생존자는 나 하나뿐이었다. 왜 그 함선이 파괴됐는지 밝혀야 한다.'],
  '탐정':    ['25년 경력 형사. 은퇴 후 마지막으로 맡은 사건이 딸이 연루된 실종 사건이었다.', '보험 사기 조사관. 의뢰인의 죽음 뒤에 상상도 못 할 음모가 숨어 있다는 걸 너무 늦게 알았다.'],
  '오컬티스트': ['고서 수집가였다. 우연히 구한 책 한 권이 삶을 완전히 바꿔놓았다. 그날 밤 무엇을 봤는지 아직도 확신할 수 없다.', '종교학 교수. 연구실에서 발견된 것들이 학문의 영역을 벗어난다는 걸 이제는 안다.'],
  '생존자':  ['등산 사고로 혼자 살아남았다. 구조될 때까지 7일, 그 숲에서 나만 보고 들은 것들이 있다.', '폭발 사고 유일한 생존자. 우연이 아니었다는 증거들이 하나씩 드러나기 시작했다.'],
  '의사':    ['응급실 의사. 원인 불명 환자들이 연속으로 실려 온다. 증상의 공통점을 찾아낸 순간 누군가 나를 지켜보고 있음을 느꼈다.', '법의학자. 사건들 사이의 연결고리를 찾고 있다. 이렇게 오래된 패턴이라고는 몰랐다.'],
  '저널리스트': ['지역 뉴스 기자. 작은 마을의 실종 사건을 취재하러 왔다가 떠나지 못하고 있다.', '탐사 기자. 제보를 받고 현장에 왔다. 제보자는 이미 죽었고 나만 그 정보를 갖고 있다.'],
  '군인':    ['특수부대 출신. 민간인 보호 임무 중 내려진 비밀 명령이 아직도 이해되지 않는다.', '의무 제대 후 경비 회사에 들어갔다. 의뢰인의 죽음을 막지 못했고, 진짜 이유를 찾고 있다.'],
  '형사':    ['강력계 형사 12년. 클리어한 것 같았던 사건의 진범이 다시 나타났다.', '사설탐정. 단순 이혼 조사인 줄 알았던 의뢰가 훨씬 더 깊은 곳으로 나를 끌고 갔다.'],
  '사이버해커': ['화이트햇 해커. 클라이언트 서버에 침투했다가 절대 보면 안 될 것을 봤다.', '사이버 보안 전문가. 내부 시스템에서 이상 신호를 발견해 보고했더니 오히려 내가 표적이 됐다.'],
  '특수요원': ['국정원 출신 프리랜서. 과거 임무 중 하나가 나를 계속 따라다닌다.', '외국 정보기관에서 이중 생활을 했다. 어느 쪽이 진짜 나인지 잊어가고 있다.'],
  '탐험가':  ['30개국을 돌아다닌 탐험가. 이번에 발견한 것은 지도에도 없는 장소였다.', '고고학자 출신. 유물 밀수 조직에 맞서다 혼자 남겨졌다.'],
}

const CUSTOM_CLASS_ID = '__custom__'

const STEPS = ['세계관', '세계 설명', '캐릭터']

export default function NewGame() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [template, setTemplate] = useState(null)
  const [worldDesc, setWorldDesc] = useState('')
  const [charName, setCharName] = useState('')
  const [charClassId, setCharClassId] = useState(null)   // preset class id or '__custom__'
  const [customClassName, setCustomClassName] = useState('')
  const [charBg, setCharBg] = useState('')
  const [hardcore, setHardcore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const classes = template ? (CLASSES_BY_TEMPLATE[template.label] || CLASSES_BY_TEMPLATE['커스텀']) : []
  const effectiveClass = charClassId === CUSTOM_CLASS_ID ? customClassName.trim() : charClassId

  const selectTemplate = (t) => {
    setTemplate(t)
    if (t.label !== '커스텀') setWorldDesc(t.desc)
    setCharClassId(null)
    setCustomClassName('')
    setStep(2)
  }

  const handleCreate = async () => {
    if (!charName.trim()) { setError('캐릭터 이름을 입력해주세요'); return }
    if (!effectiveClass) { setError('직업을 선택하거나 입력해주세요'); return }
    if (!charBg.trim()) { setError('배경 스토리를 입력해주세요'); return }
    setLoading(true)
    setError('')
    try {
      const game = await api.createGame({
        world_description: worldDesc,
        character_name: charName.trim(),
        character_class: effectiveClass,
        character_background: charBg.trim(),
        hardcore_mode: hardcore,
      })
      navigate(`/game/${game.id}`)
    } catch (e) {
      setError(e?.detail || e?.message || '게임 생성 실패')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>

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
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold-light)', letterSpacing: '0.03em', marginBottom: '0.5rem', textShadow: '0 0 20px rgba(201,168,76,0.3)' }}>
          새 모험 시작
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '2.5rem' }}>당신만의 전설을 써내려가세요</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, idx) => {
            const s = idx + 1
            const active = step === s
            const done   = step > s
            return (
              <div key={s} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={active ? 'step-active' : ''}
                    style={{
                      width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700,
                      background: done ? 'linear-gradient(135deg, #8a6820, var(--gold))' : active ? 'var(--surface2)' : 'var(--surface)',
                      border: `1px solid ${done || active ? 'var(--gold)' : 'var(--border)'}`,
                      color: done ? '#0a0805' : active ? 'var(--gold)' : 'var(--muted)',
                      transition: 'all 0.3s',
                    }}
                  >
                    {done ? '✓' : s}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: active ? 'var(--gold-light)' : done ? 'var(--gold)' : 'var(--muted)', fontWeight: active ? 600 : 400 }}>
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
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#a89880', marginBottom: '1rem', letterSpacing: '0.05em' }}>✦ 세계관 선택</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.label}
                  onClick={() => selectTemplate(t)}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '1rem', padding: '1.25rem 1rem', textAlign: 'left',
                    cursor: 'pointer', transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(201,168,76,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.boxShadow = 'none' }}
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
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#a89880', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>✦ 세계관 설명</h2>
            {template && (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                {template.icon} {template.label} — 원하는 대로 자유롭게 수정하세요
              </p>
            )}
            {/* Preset description chips */}
            {template && PRESET_DESCRIPTIONS[template.label]?.length > 0 && (
              <div style={{ marginBottom: '0.875rem' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  ✦ 빠른 선택
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {PRESET_DESCRIPTIONS[template.label].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setWorldDesc(preset)}
                      style={{
                        textAlign: 'left', padding: '0.6rem 0.875rem',
                        background: worldDesc === preset ? 'rgba(201,168,76,0.08)' : 'var(--surface)',
                        border: `1px solid ${worldDesc === preset ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: '0.75rem', cursor: 'pointer',
                        fontSize: '0.75rem', color: worldDesc === preset ? 'var(--gold-light)' : 'var(--muted)',
                        lineHeight: 1.4, transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (worldDesc !== preset) { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'var(--text)' } }}
                      onMouseLeave={e => { if (worldDesc !== preset) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' } }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea
              value={worldDesc}
              onChange={e => setWorldDesc(e.target.value)}
              rows={5}
              placeholder="예: 마법이 존재하고 용이 지배하는 중세 왕국. 암흑 마법사가 왕을 조종하고 있다..."
              style={{
                width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '0.875rem', padding: '1rem', color: 'var(--text)',
                resize: 'none', marginBottom: '1.25rem', outline: 'none',
                fontSize: '0.9rem', lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => setStep(3)}
              style={{
                width: '100%', padding: '0.875rem', background: 'var(--surface2)',
                border: '1px solid var(--gold)', color: 'var(--gold-light)', borderRadius: '0.875rem',
                fontWeight: 700, fontSize: '1rem', cursor: 'pointer', letterSpacing: '0.02em', transition: 'background 0.2s',
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
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#a89880', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>✦ 캐릭터 생성</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Name */}
              <input
                value={charName}
                onChange={e => setCharName(e.target.value)}
                placeholder="캐릭터 이름"
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '0.875rem', padding: '0.875rem 1rem', color: 'var(--text)',
                  outline: 'none', fontSize: '0.95rem', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />

              {/* Class selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.625rem', letterSpacing: '0.05em' }}>
                  직업 선택 {template && <span style={{ color: 'var(--gold)', opacity: 0.7 }}>— {template.label} 세계관</span>}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                  {classes.map(cls => {
                    const sel = charClassId === cls.id
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setCharClassId(cls.id)}
                        style={{
                          padding: '0.75rem 0.625rem', borderRadius: '0.875rem', textAlign: 'left',
                          cursor: 'pointer',
                          background: sel ? 'rgba(201,168,76,0.08)' : 'var(--surface)',
                          border: `1px solid ${sel ? 'var(--gold)' : 'var(--border)'}`,
                          boxShadow: sel ? '0 0 12px rgba(201,168,76,0.15)' : 'none',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.background = 'var(--surface2)' } }}
                        onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' } }}
                      >
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>{cls.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: sel ? 'var(--gold-light)' : 'var(--text)', marginBottom: '0.2rem' }}>{cls.label}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.4rem', lineHeight: 1.3 }}>{cls.desc}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.1rem' }}>
                          {Object.entries(cls.stats).map(([k, v]) => (
                            <div key={k} style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: sel ? 'var(--gold)' : '#5a5a70' }}>{k}:{v}</div>
                          ))}
                        </div>
                      </button>
                    )
                  })}

                  {/* Custom class button */}
                  <button
                    type="button"
                    onClick={() => setCharClassId(CUSTOM_CLASS_ID)}
                    style={{
                      padding: '0.75rem 0.625rem', borderRadius: '0.875rem', textAlign: 'left',
                      cursor: 'pointer',
                      background: charClassId === CUSTOM_CLASS_ID ? 'rgba(201,168,76,0.08)' : 'var(--surface)',
                      border: `1px solid ${charClassId === CUSTOM_CLASS_ID ? 'var(--gold)' : 'var(--border)'}`,
                      boxShadow: charClassId === CUSTOM_CLASS_ID ? '0 0 12px rgba(201,168,76,0.15)' : 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (charClassId !== CUSTOM_CLASS_ID) { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.background = 'var(--surface2)' } }}
                    onMouseLeave={e => { if (charClassId !== CUSTOM_CLASS_ID) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' } }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>✏️</div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: charClassId === CUSTOM_CLASS_ID ? 'var(--gold-light)' : 'var(--text)', marginBottom: '0.2rem' }}>직접 입력</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', lineHeight: 1.3 }}>나만의 직업 생성</div>
                  </button>
                </div>

                {/* Custom class text input */}
                {charClassId === CUSTOM_CLASS_ID && (
                  <input
                    value={customClassName}
                    onChange={e => setCustomClassName(e.target.value)}
                    placeholder="직업명 입력 (예: 강령술사, 사이버닌자, 우주해적...)"
                    autoFocus
                    style={{
                      marginTop: '0.75rem', width: '100%',
                      background: 'var(--bg)', border: '1px solid var(--gold)',
                      borderRadius: '0.75rem', padding: '0.75rem 1rem', color: 'var(--text)',
                      outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box',
                      boxShadow: '0 0 10px rgba(201,168,76,0.1)',
                    }}
                  />
                )}
              </div>

              {/* Background presets */}
              {charClassId && charClassId !== CUSTOM_CLASS_ID && BACKGROUND_PRESETS[charClassId]?.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>✦ 배경 스토리 예시</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {BACKGROUND_PRESETS[charClassId].map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCharBg(preset)}
                        style={{
                          textAlign: 'left', padding: '0.55rem 0.875rem',
                          background: charBg === preset ? 'rgba(201,168,76,0.08)' : 'var(--surface)',
                          border: `1px solid ${charBg === preset ? 'var(--gold)' : 'var(--border)'}`,
                          borderRadius: '0.75rem', cursor: 'pointer',
                          fontSize: '0.72rem', color: charBg === preset ? 'var(--gold-light)' : 'var(--muted)',
                          lineHeight: 1.45, transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if (charBg !== preset) { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'var(--text)' } }}
                        onMouseLeave={e => { if (charBg !== preset) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' } }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Background */}
              <textarea
                value={charBg}
                onChange={e => setCharBg(e.target.value)}
                rows={3}
                placeholder="배경 스토리 (예: 고아 출신으로 마법학교를 졸업했다...)"
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '0.875rem', padding: '0.875rem 1rem', color: 'var(--text)',
                  resize: 'none', outline: 'none', fontSize: '0.9rem', lineHeight: 1.6,
                  boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />

              {/* Hardcore toggle */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: hardcore ? 'var(--red)' : 'var(--text)' }}>💀 하드코어 모드</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>사망 시 게임 영구 종료 — 긴장감 극대화</div>
                </div>
                <button
                  onClick={() => setHardcore(!hardcore)}
                  style={{
                    width: '3rem', height: '1.625rem', borderRadius: '9999px',
                    background: hardcore ? 'rgba(239,68,68,0.8)' : 'var(--border)',
                    border: `1px solid ${hardcore ? 'var(--red)' : '#3a3a50'}`,
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    transition: 'background 0.2s, border-color 0.2s',
                    boxShadow: hardcore ? '0 0 10px rgba(239,68,68,0.4)' : 'none',
                  }}
                >
                  <div style={{
                    width: '1.25rem', height: '1.25rem', background: '#fff', borderRadius: '50%',
                    position: 'absolute', top: '50%',
                    transform: `translateY(-50%) translateX(${hardcore ? '1.375rem' : '0.125rem'})`,
                    transition: 'transform 0.2s',
                  }} />
                </button>
              </div>

              {error && <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{error}</p>}

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={loading}
                className={loading ? 'btn-loading' : 'btn-gold-glow'}
                style={{
                  width: '100%', padding: '1rem',
                  background: 'linear-gradient(135deg, #8a6820, #c9a84c, #8a6820)',
                  color: '#0a0805', borderRadius: '0.875rem', fontWeight: 800,
                  fontSize: '1.1rem', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
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
