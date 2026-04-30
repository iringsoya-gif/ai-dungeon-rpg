"""
AI Dungeon RPG — YouTube 발표용 PPT 생성기
실행: uv run python presentation/generate_ppt.py
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from lxml import etree
import copy

# ── 색상 팔레트 ──────────────────────────────────────────────
BG      = RGBColor(0x0a, 0x0a, 0x10)
SURFACE = RGBColor(0x11, 0x11, 0x20)
PURPLE  = RGBColor(0x9d, 0x7f, 0xe8)
PURPLE2 = RGBColor(0x6a, 0x3f, 0xa0)
GOLD    = RGBColor(0xc9, 0xa8, 0x4c)
GOLD2   = RGBColor(0x8a, 0x68, 0x20)
TEXT    = RGBColor(0xe8, 0xe4, 0xf8)
MUTED   = RGBColor(0x6b, 0x6b, 0x90)
RED     = RGBColor(0xef, 0x44, 0x44)
GREEN   = RGBColor(0x10, 0xb9, 0x81)
BORDER  = RGBColor(0x1e, 0x1e, 0x30)
WHITE   = RGBColor(0xff, 0xff, 0xff)

W = Inches(16)
H = Inches(9)

prs = Presentation()
prs.slide_width  = W
prs.slide_height = H
BLANK = prs.slide_layouts[6]  # 완전 빈 레이아웃


# ── 헬퍼 ────────────────────────────────────────────────────

def new_slide():
    s = prs.slides.add_slide(BLANK)
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = BG
    return s


def box(slide, l, t, w, h, color=SURFACE, line=BORDER, line_w=1):
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    from pptx.util import Pt as Ptx
    shape = slide.shapes.add_shape(1, l, t, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    if line:
        shape.line.color.rgb = line
        shape.line.width = Pt(line_w)
    else:
        shape.line.fill.background()
    return shape


def txt(slide, text, l, t, w, h,
        size=20, bold=False, color=TEXT,
        align=PP_ALIGN.LEFT, italic=False,
        font="Malgun Gothic", wrap=True,
        line_spacing=None):
    tb = slide.shapes.add_textbox(l, t, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    if line_spacing:
        p.line_spacing = line_spacing
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = font
    return tb


def multi_line(slide, lines, l, t, w, h,
               size=20, bold=False, color=TEXT,
               align=PP_ALIGN.LEFT, italic=False,
               font="Malgun Gothic", line_spacing=1.4):
    tb = slide.shapes.add_textbox(l, t, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    first = True
    for line in lines:
        if first:
            p = tf.paragraphs[0]
            first = False
        else:
            p = tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        run = p.add_run()
        run.text = line
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = color
        run.font.name = font
    return tb


def slide_num(slide, n, total):
    txt(slide, f"{n} / {total}",
        W - Inches(1.2), H - Inches(0.45),
        Inches(1.0), Inches(0.35),
        size=11, color=MUTED, align=PP_ALIGN.RIGHT)


def accent_bar(slide, color=PURPLE):
    """상단 얇은 액센트 바"""
    shape = slide.shapes.add_shape(1,
        Inches(0), Inches(0), W, Inches(0.05))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def section_tag(slide, label, color=PURPLE):
    """슬라이드 상단 섹션 레이블"""
    tb = slide.shapes.add_textbox(
        Inches(0.6), Inches(0.25), Inches(4), Inches(0.4))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = label.upper()
    run.font.size = Pt(10)
    run.font.bold = True
    run.font.color.rgb = color
    run.font.name = "Malgun Gothic"


def video_placeholder(slide, label, sub, idx):
    """시연 영상 자리표시자 박스"""
    VL, VT = Inches(1.5), Inches(1.8)
    VW, VH = Inches(13), Inches(5.8)
    b = box(slide, VL, VT, VW, VH,
            color=RGBColor(0x08, 0x08, 0x14), line=PURPLE, line_w=2)

    # 큰 재생 아이콘
    txt(slide, "▶", VL + Inches(5.9), VT + Inches(1.2), Inches(1.2), Inches(1.2),
        size=60, color=PURPLE, align=PP_ALIGN.CENTER, bold=False)

    txt(slide, f"[ 시연 영상 {idx} ]",
        VL, VT + Inches(2.7), VW, Inches(0.55),
        size=16, bold=True, color=PURPLE, align=PP_ALIGN.CENTER)
    txt(slide, label,
        VL, VT + Inches(3.35), VW, Inches(0.55),
        size=22, bold=True, color=TEXT, align=PP_ALIGN.CENTER)
    txt(slide, sub,
        VL, VT + Inches(3.95), VW, Inches(0.45),
        size=13, color=MUTED, align=PP_ALIGN.CENTER, italic=True)


TOTAL = 14


# ════════════════════════════════════════════════════════════
#  SLIDE 1 — 타이틀
# ════════════════════════════════════════════════════════════
s1 = new_slide()
accent_bar(s1, PURPLE)

# 배경 글로우 원
shape = s1.shapes.add_shape(9,  # 타원
    Inches(4), Inches(2), Inches(8), Inches(5))
shape.fill.solid()
shape.fill.fore_color.rgb = RGBColor(0x14, 0x0a, 0x28)
shape.line.fill.background()

# 서브 라벨
txt(s1, "⚔  AI DUNGEON RPG",
    Inches(0), Inches(1.8), W, Inches(0.7),
    size=14, color=PURPLE, align=PP_ALIGN.CENTER, bold=True)

# 메인 타이틀
multi_line(s1,
    ["AI가 게임마스터가 되는", "웹소설 RPG"],
    Inches(0), Inches(2.5), W, Inches(2.8),
    size=64, bold=True, color=TEXT, align=PP_ALIGN.CENTER)

# 서브 타이틀
txt(s1, "FastAPI · React · Groq Llama 3.3 · Google OAuth · Polar.sh",
    Inches(0), Inches(5.5), W, Inches(0.55),
    size=15, color=MUTED, align=PP_ALIGN.CENTER)

# 태그라인
txt(s1, "당신의 행동에 AI가 실시간으로 반응합니다",
    Inches(0), Inches(6.2), W, Inches(0.55),
    size=18, color=GOLD, align=PP_ALIGN.CENTER, italic=True)

slide_num(s1, 1, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 2 — 한 줄 임팩트 / 훅
# ════════════════════════════════════════════════════════════
s2 = new_slide()
accent_bar(s2, GOLD)

txt(s2, "\"ChatGPT와 RPG를 한다면?\"",
    Inches(0), Inches(1.6), W, Inches(1.3),
    size=48, bold=True, color=TEXT, align=PP_ALIGN.CENTER, italic=True)

# 구분선
sep = s2.shapes.add_shape(1,
    Inches(5), Inches(3.2), Inches(6), Inches(0.04))
sep.fill.solid(); sep.fill.fore_color.rgb = GOLD
sep.line.fill.background()

multi_line(s2, [
    "단순 채팅이 아닌  —  완전한 RPG 시스템",
    "레벨업 · 인벤토리 · 퀘스트 · NPC 관계",
    "무한한 이야기, AI가 실시간으로 만들어냅니다",
], Inches(0), Inches(3.5), W, Inches(2.2),
    size=22, color=MUTED, align=PP_ALIGN.CENTER, line_spacing=1.6)

slide_num(s2, 2, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 3 — 왜 만들었나
# ════════════════════════════════════════════════════════════
s3 = new_slide()
accent_bar(s3, PURPLE)
section_tag(s3, "배경 · 동기")

txt(s3, "기존 텍스트 RPG의 한계",
    Inches(0.6), Inches(0.8), Inches(14), Inches(0.8),
    size=36, bold=True, color=TEXT)

problems = [
    ("❌  고정된 시나리오", "미리 짜인 분기만 따라가야 함"),
    ("❌  단순 AI 챗봇", "게임 시스템(스탯·퀘스트)이 없음"),
    ("❌  한국어 품질",  "영어 중심 모델의 어색한 번역체"),
]
solutions = [
    ("✅  완전 생성형 스토리", "플레이어의 모든 행동에 고유하게 반응"),
    ("✅  풀 RPG 시스템", "레벨업·인벤토리·NPC·하드코어 모드"),
    ("✅  장르별 한국어 문체", "웹소설 스타일 프롬프트 엔지니어링"),
]

for i, (title, sub) in enumerate(problems):
    y = Inches(2.0 + i * 1.4)
    box(s3, Inches(0.6), y, Inches(6.5), Inches(1.1),
        color=RGBColor(0x14, 0x08, 0x08), line=RGBColor(0x5a, 0x1a, 0x1a))
    txt(s3, title, Inches(0.9), y + Inches(0.08), Inches(6.0), Inches(0.48),
        size=18, bold=True, color=RGBColor(0xfc, 0xa5, 0xa5))
    txt(s3, sub, Inches(0.9), y + Inches(0.56), Inches(6.0), Inches(0.4),
        size=14, color=MUTED)

for i, (title, sub) in enumerate(solutions):
    y = Inches(2.0 + i * 1.4)
    box(s3, Inches(8.4), y, Inches(6.8), Inches(1.1),
        color=RGBColor(0x05, 0x14, 0x0e), line=RGBColor(0x10, 0x4a, 0x33))
    txt(s3, title, Inches(8.7), y + Inches(0.08), Inches(6.3), Inches(0.48),
        size=18, bold=True, color=GREEN)
    txt(s3, sub, Inches(8.7), y + Inches(0.56), Inches(6.3), Inches(0.4),
        size=14, color=MUTED)

# 화살표
txt(s3, "→", Inches(7.2), Inches(4.2), Inches(1.2), Inches(0.8),
    size=36, color=PURPLE, align=PP_ALIGN.CENTER, bold=True)

slide_num(s3, 3, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 4 — VIDEO 1 : 게임 오버뷰
# ════════════════════════════════════════════════════════════
s4 = new_slide()
accent_bar(s4, GOLD)
section_tag(s4, "시연 영상 1", GOLD)

txt(s4, "게임 전체 흐름",
    Inches(0), Inches(0.6), W, Inches(0.7),
    size=28, bold=True, color=TEXT, align=PP_ALIGN.CENTER)

video_placeholder(s4,
    "캐릭터 생성 → 오프닝 → 첫 탐험",
    "로그인 · 세계관 설정 · 클래스 선택 · AI 오프닝 생성",
    1)

slide_num(s4, 4, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 5 — AI GM 핵심 기술
# ════════════════════════════════════════════════════════════
s5 = new_slide()
accent_bar(s5, PURPLE)
section_tag(s5, "핵심 기술")

txt(s5, "AI 게임마스터",
    Inches(0.6), Inches(0.8), Inches(14), Inches(0.8),
    size=36, bold=True, color=TEXT)

features = [
    ("🔥  실시간 스트리밍",
     "SSE(Server-Sent Events)로 AI 응답이\n생성되는 즉시 화면에 흘러나옴"),
    ("📖  장르별 문체",
     "세계관 키워드로 자동 장르 감지\n판타지·SF·공포·현대 각기 다른 서술체"),
    ("🎭  Few-shot 프리필링",
     "장르별 예시 대화를 context에 주입\n언어 일관성 + 문체 안정성 동시 확보"),
    ("🗺  NPC·세계 누적 기억",
     "턴마다 NPC 태도·장소 정보 누적\n게임이 길어질수록 세계가 풍부해짐"),
]

for i, (title, body) in enumerate(features):
    col = i % 2
    row = i // 2
    l = Inches(0.6 + col * 7.7)
    t = Inches(2.0 + row * 2.9)
    box(s5, l, t, Inches(7.0), Inches(2.5),
        color=SURFACE, line=PURPLE)
    txt(s5, title, l + Inches(0.25), t + Inches(0.2), Inches(6.5), Inches(0.6),
        size=18, bold=True, color=PURPLE)
    multi_line(s5, body.split('\n'),
        l + Inches(0.25), t + Inches(0.9), Inches(6.5), Inches(1.4),
        size=15, color=MUTED, line_spacing=1.5)

slide_num(s5, 5, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 6 — 게임 시스템
# ════════════════════════════════════════════════════════════
s6 = new_slide()
accent_bar(s6, GOLD)
section_tag(s6, "게임 시스템", GOLD)

txt(s6, "완전한 RPG 시스템",
    Inches(0.6), Inches(0.8), Inches(14), Inches(0.8),
    size=36, bold=True, color=TEXT)

systems = [
    ("⚔  캐릭터 & 클래스", "20개 직업별 고유 스탯\nHP·MP·힘·지능·민첩·카리스마"),
    ("📈  성장 시스템",     "전투 XP → 레벨업 → 스탯 보너스\n다중 레벨업 연속 처리"),
    ("🎒  인벤토리",        "아이템 획득·사용·손실\n사망 패널티: 랜덤 아이템 1개 소실"),
    ("🗡  전투 시스템",     "in_battle 상태 관리\n능력치 반영 전투 서술"),
    ("📜  퀘스트",          "동적 퀘스트 추가·완료\n이름 + 목표 설명 저장"),
    ("💀  하드코어 모드",   "HP 0 → 게임 즉시 종료\n캐릭터 영구 사망"),
]

for i, (title, body) in enumerate(systems):
    col = i % 3
    row = i // 3
    l = Inches(0.5 + col * 5.1)
    t = Inches(2.0 + row * 2.8)
    box(s6, l, t, Inches(4.6), Inches(2.4),
        color=SURFACE, line=BORDER)
    txt(s6, title, l + Inches(0.2), t + Inches(0.15), Inches(4.2), Inches(0.55),
        size=16, bold=True, color=GOLD)
    multi_line(s6, body.split('\n'),
        l + Inches(0.2), t + Inches(0.8), Inches(4.2), Inches(1.4),
        size=13, color=MUTED, line_spacing=1.45)

slide_num(s6, 6, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 7 — VIDEO 2 : 전투 & NPC
# ════════════════════════════════════════════════════════════
s7 = new_slide()
accent_bar(s7, RED)
section_tag(s7, "시연 영상 2", RED)

txt(s7, "전투 & NPC 대화",
    Inches(0), Inches(0.6), W, Inches(0.7),
    size=28, bold=True, color=TEXT, align=PP_ALIGN.CENTER)

video_placeholder(s7,
    "전투 장면 · NPC 대화 블록 · 레벨업",
    "실시간 스트리밍 · 골드 대화 블록 · 상태 자동 업데이트",
    2)

slide_num(s7, 7, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 8 — 기술 스택
# ════════════════════════════════════════════════════════════
s8 = new_slide()
accent_bar(s8, PURPLE)
section_tag(s8, "기술 스택")

txt(s8, "Tech Stack",
    Inches(0.6), Inches(0.8), Inches(14), Inches(0.8),
    size=36, bold=True, color=TEXT)

stacks = [
    ("Frontend",  "React 18 + Vite\nZustand 상태관리\nNoto Serif KR 웹소설 폰트",  PURPLE),
    ("Backend",   "FastAPI (Python)\nSQLAlchemy + SQLite\nAlembic 마이그레이션",   GREEN),
    ("AI",        "Groq API\nLlama 3.3 70B Versatile\nSSE 스트리밍",               GOLD),
    ("인프라",    "Vercel (Frontend)\nRailway (Backend)\nGoogle OAuth + Polar.sh",  RGBColor(0x60, 0xa5, 0xfa)),
]

for i, (label, body, color) in enumerate(stacks):
    l = Inches(0.5 + i * 3.8)
    t = Inches(2.0)
    # 컬러 상단 바
    bar = s8.shapes.add_shape(1, l, t, Inches(3.3), Inches(0.12))
    bar.fill.solid(); bar.fill.fore_color.rgb = color
    bar.line.fill.background()

    box(s8, l, t + Inches(0.12), Inches(3.3), Inches(5.0),
        color=SURFACE, line=BORDER)
    txt(s8, label, l + Inches(0.2), t + Inches(0.3), Inches(2.9), Inches(0.55),
        size=18, bold=True, color=color)
    multi_line(s8, body.split('\n'),
        l + Inches(0.2), t + Inches(1.0), Inches(2.9), Inches(3.5),
        size=14, color=MUTED, line_spacing=1.6)

slide_num(s8, 8, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 9 — 아키텍처 다이어그램
# ════════════════════════════════════════════════════════════
s9 = new_slide()
accent_bar(s9, PURPLE)
section_tag(s9, "아키텍처")

txt(s9, "시스템 아키텍처",
    Inches(0.6), Inches(0.8), Inches(14), Inches(0.8),
    size=36, bold=True, color=TEXT)

# 플레이어
box(s9, Inches(0.4), Inches(3.3), Inches(2.2), Inches(1.2),
    color=RGBColor(0x0d, 0x0d, 0x22), line=PURPLE)
txt(s9, "👤 플레이어", Inches(0.4), Inches(3.5), Inches(2.2), Inches(0.6),
    size=15, bold=True, color=PURPLE, align=PP_ALIGN.CENTER)
txt(s9, "브라우저", Inches(0.4), Inches(4.1), Inches(2.2), Inches(0.35),
    size=11, color=MUTED, align=PP_ALIGN.CENTER)

# 화살표들
for x in [Inches(2.85), Inches(6.35), Inches(9.85)]:
    txt(s9, "→", x, Inches(3.55), Inches(0.8), Inches(0.6),
        size=22, color=BORDER, align=PP_ALIGN.CENTER, bold=True)

# React Frontend
box(s9, Inches(3.0), Inches(2.5), Inches(3.0), Inches(2.8),
    color=RGBColor(0x0a, 0x0a, 0x1e), line=PURPLE)
txt(s9, "⚛ Frontend", Inches(3.0), Inches(2.65), Inches(3.0), Inches(0.5),
    size=15, bold=True, color=PURPLE, align=PP_ALIGN.CENTER)
multi_line(s9, ["React + Vite", "Zustand Store", "SSE Client", "Vercel 배포"],
    Inches(3.1), Inches(3.2), Inches(2.8), Inches(1.8),
    size=12, color=MUTED, align=PP_ALIGN.CENTER, line_spacing=1.4)

# FastAPI Backend
box(s9, Inches(6.5), Inches(2.5), Inches(3.0), Inches(2.8),
    color=RGBColor(0x0a, 0x14, 0x0f), line=GREEN)
txt(s9, "⚡ Backend", Inches(6.5), Inches(2.65), Inches(3.0), Inches(0.5),
    size=15, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
multi_line(s9, ["FastAPI", "SQLAlchemy", "JWT Auth", "Railway 배포"],
    Inches(6.6), Inches(3.2), Inches(2.8), Inches(1.8),
    size=12, color=MUTED, align=PP_ALIGN.CENTER, line_spacing=1.4)

# Groq AI
box(s9, Inches(10.0), Inches(2.5), Inches(3.0), Inches(2.8),
    color=RGBColor(0x16, 0x12, 0x06), line=GOLD)
txt(s9, "🤖 Groq AI", Inches(10.0), Inches(2.65), Inches(3.0), Inches(0.5),
    size=15, bold=True, color=GOLD, align=PP_ALIGN.CENTER)
multi_line(s9, ["Llama 3.3 70B", "스트리밍 API", "장르 프롬프트", "Few-shot 예시"],
    Inches(10.1), Inches(3.2), Inches(2.8), Inches(1.8),
    size=12, color=MUTED, align=PP_ALIGN.CENTER, line_spacing=1.4)

# DB
box(s9, Inches(6.5), Inches(6.0), Inches(3.0), Inches(1.0),
    color=SURFACE, line=BORDER)
txt(s9, "🗄 SQLite DB",
    Inches(6.5), Inches(6.15), Inches(3.0), Inches(0.5),
    size=14, bold=True, color=MUTED, align=PP_ALIGN.CENTER)

# DB 화살표 (수직)
txt(s9, "↕", Inches(7.7), Inches(5.45), Inches(0.6), Inches(0.5),
    size=18, color=BORDER, align=PP_ALIGN.CENTER)

slide_num(s9, 9, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 10 — 개발 챌린지 & 해결
# ════════════════════════════════════════════════════════════
s10 = new_slide()
accent_bar(s10, RED)
section_tag(s10, "개발 챌린지", RED)

txt(s10, "문제와 해결",
    Inches(0.6), Inches(0.8), Inches(14), Inches(0.8),
    size=36, bold=True, color=TEXT)

challenges = [
    ("외국어·한자 혼입",
     "Llama가 한국어 응답 중 영어·한자 삽입",
     "장르별 시스템 프롬프트 + Few-shot 예시 주입\n언어 규칙 명시 + sanitizer 후처리"),
    ("JSON 스트리밍 노출",
     "상태 변화 JSON이 실시간 텍스트에 그대로 출력",
     "stripJson(): 스트리밍 중엔 ```json 감지 즉시 잘라냄\n완료 후 regex로 블록 전체 제거"),
    ("컨텍스트 폭증",
     "대화가 쌓일수록 토큰 한도 초과",
     "context_manager: 오래된 히스토리 자동 압축\nGM 요약 → 새 히스토리로 대체"),
]

for i, (title, prob, sol) in enumerate(challenges):
    t = Inches(2.0 + i * 2.15)
    # 문제 박스
    box(s10, Inches(0.6), t, Inches(6.5), Inches(1.85),
        color=RGBColor(0x14, 0x08, 0x08), line=RGBColor(0x5a, 0x1a, 0x1a))
    txt(s10, f"⚠ {title}", Inches(0.85), t + Inches(0.1), Inches(6.0), Inches(0.5),
        size=16, bold=True, color=RED)
    txt(s10, prob, Inches(0.85), t + Inches(0.65), Inches(6.0), Inches(1.0),
        size=13, color=MUTED)

    # 화살표
    txt(s10, "→", Inches(7.3), t + Inches(0.6), Inches(0.9), Inches(0.6),
        size=24, color=PURPLE, align=PP_ALIGN.CENTER, bold=True)

    # 해결 박스
    box(s10, Inches(8.4), t, Inches(7.0), Inches(1.85),
        color=RGBColor(0x05, 0x10, 0x0a), line=RGBColor(0x10, 0x4a, 0x28))
    txt(s10, "✅ 해결", Inches(8.65), t + Inches(0.1), Inches(6.5), Inches(0.5),
        size=16, bold=True, color=GREEN)
    multi_line(s10, sol.split('\n'),
        Inches(8.65), t + Inches(0.65), Inches(6.5), Inches(1.1),
        size=13, color=MUTED, line_spacing=1.35)

slide_num(s10, 10, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 11 — VIDEO 3 : 고급 기능
# ════════════════════════════════════════════════════════════
s11 = new_slide()
accent_bar(s11, GREEN)
section_tag(s11, "시연 영상 3", GREEN)

txt(s11, "고급 기능 쇼케이스",
    Inches(0), Inches(0.6), W, Inches(0.7),
    size=28, bold=True, color=TEXT, align=PP_ALIGN.CENTER)

video_placeholder(s11,
    "캐릭터 시트 · NPC 대화 블록 · 모험 공유",
    "CharacterSheet 팝업 · 골드 대화 박스 · 공개 스토리 링크",
    3)

slide_num(s11, 11, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 12 — 구현 성과
# ════════════════════════════════════════════════════════════
s12 = new_slide()
accent_bar(s12, GOLD)
section_tag(s12, "성과", GOLD)

txt(s12, "구현 성과",
    Inches(0.6), Inches(0.8), Inches(14), Inches(0.8),
    size=36, bold=True, color=TEXT)

stats = [
    ("46",  "테스트 통과"),
    ("20+", "직업 클래스"),
    ("4",   "장르 지원"),
    ("14",  "API 엔드포인트"),
]

for i, (num, label) in enumerate(stats):
    l = Inches(0.5 + i * 3.8)
    box(s12, l, Inches(2.0), Inches(3.3), Inches(2.2),
        color=SURFACE, line=PURPLE)
    txt(s12, num, l, Inches(2.1), Inches(3.3), Inches(1.2),
        size=64, bold=True, color=PURPLE, align=PP_ALIGN.CENTER)
    txt(s12, label, l, Inches(3.4), Inches(3.3), Inches(0.55),
        size=16, color=MUTED, align=PP_ALIGN.CENTER)

features_list = [
    "✦ Google OAuth 로그인",
    "✦ Polar.sh 결제 & 플랜 관리",
    "✦ SSE 실시간 스트리밍",
    "✦ 컨텍스트 자동 압축",
    "✦ NPC·세계관 누적 기억",
    "✦ 하드코어 모드",
    "✦ 모험 기록 공유",
    "✦ 모바일 반응형",
    "✦ Rate Limiting",
    "✦ Alembic 마이그레이션",
]

col1 = features_list[:5]
col2 = features_list[5:]

multi_line(s12, col1,
    Inches(0.6), Inches(4.6), Inches(7.0), Inches(3.2),
    size=15, color=MUTED, line_spacing=1.5)
multi_line(s12, col2,
    Inches(8.4), Inches(4.6), Inches(7.0), Inches(3.2),
    size=15, color=MUTED, line_spacing=1.5)

slide_num(s12, 12, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 13 — VIDEO 4 : 모바일 & 엔딩
# ════════════════════════════════════════════════════════════
s13 = new_slide()
accent_bar(s13, PURPLE)
section_tag(s13, "시연 영상 4")

txt(s13, "모바일 & 게임 엔딩",
    Inches(0), Inches(0.6), W, Inches(0.7),
    size=28, bold=True, color=TEXT, align=PP_ALIGN.CENTER)

video_placeholder(s13,
    "모바일 플레이 · 하드코어 게임오버 · 결과 통계",
    "반응형 UI · 사망 화면 · 플레이 시간·레벨·턴 수 통계",
    4)

slide_num(s13, 13, TOTAL)


# ════════════════════════════════════════════════════════════
#  SLIDE 14 — 마무리 / CTA
# ════════════════════════════════════════════════════════════
s14 = new_slide()
accent_bar(s14, PURPLE)

# 글로우 원
shape = s14.shapes.add_shape(9,
    Inches(4), Inches(1.5), Inches(8), Inches(6))
shape.fill.solid()
shape.fill.fore_color.rgb = RGBColor(0x14, 0x0a, 0x28)
shape.line.fill.background()

txt(s14, "⚔  AI DUNGEON RPG",
    Inches(0), Inches(1.5), W, Inches(0.65),
    size=14, color=PURPLE, align=PP_ALIGN.CENTER, bold=True)

txt(s14, "직접 플레이해보세요",
    Inches(0), Inches(2.3), W, Inches(1.1),
    size=52, bold=True, color=TEXT, align=PP_ALIGN.CENTER)

txt(s14, "GitHub · 소스코드 공개",
    Inches(0), Inches(3.8), W, Inches(0.6),
    size=20, color=MUTED, align=PP_ALIGN.CENTER)

# CTA 박스들
for i, (label, url, color) in enumerate([
    ("▶  플레이하기", "ai-dungeon-rpg.vercel.app", GOLD),
    ("⭐  GitHub",    "github.com/iringsoya-gif/ai-dungeon-rpg", PURPLE),
]):
    l = Inches(3.5 + i * 4.5)
    box(s14, l, Inches(4.8), Inches(3.8), Inches(0.85),
        color=SURFACE, line=color)
    txt(s14, label, l, Inches(4.83), Inches(3.8), Inches(0.5),
        size=16, bold=True, color=color, align=PP_ALIGN.CENTER)
    txt(s14, url, l, Inches(5.35), Inches(3.8), Inches(0.4),
        size=11, color=MUTED, align=PP_ALIGN.CENTER)

txt(s14, "감사합니다",
    Inches(0), Inches(6.5), W, Inches(0.8),
    size=28, bold=True, color=GOLD, align=PP_ALIGN.CENTER, italic=True)

slide_num(s14, 14, TOTAL)


# ── 저장 ──────────────────────────────────────────────────
OUTPUT = "presentation/AI_Dungeon_RPG_Presentation.pptx"
prs.save(OUTPUT)
print(f"✅  저장 완료: {OUTPUT}  ({TOTAL}슬라이드)")
