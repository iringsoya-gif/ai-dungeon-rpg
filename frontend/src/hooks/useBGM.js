import { useRef, useCallback, useState, useEffect } from 'react'

// 실제 음악 파일 URL을 여기에 넣으면 파일 기반 재생으로 전환됩니다.
// null이면 Web Audio API로 앰비언트 사운드를 생성합니다.
// 무료 BGM: pixabay.com/music, opengameart.org, freemusicarchive.org
const TRACKS = {
  calm:     null,
  battle:   null,
  gameover: null,
}

// Web Audio 합성 설정 (파일 없을 때 대체)
const SYNTH = {
  calm: {
    notes: [110.0, 130.8, 164.8], // A2-C3-E3 (A단조)
    type: 'sine',
    lfoRate: 0.05, lfoDepth: 70,
    filterFreq: 480, gain: 0.038,
  },
  battle: {
    notes: [164.8, 196.0, 246.9], // E3-G3-B3 (E단조), 더 높고 긴박하게
    type: 'sawtooth',
    lfoRate: 0.45, lfoDepth: 280,
    filterFreq: 1300, gain: 0.028,
  },
  gameover: {
    notes: [73.4, 87.3, 98.0], // D2-F2-G2 (D단조), 낮고 무겁게
    type: 'sine',
    lfoRate: 0.022, lfoDepth: 25,
    filterFreq: 320, gain: 0.035,
  },
}

function makeReverb(ctx) {
  const len = Math.floor(ctx.sampleRate * 1.8)
  const ir  = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.7)
    }
  }
  const conv = ctx.createConvolver()
  conv.buffer = ir
  return conv
}

export function useBGM() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('bgm') !== 'off')
  const [mood, setMoodState] = useState('calm')

  const enabledRef  = useRef(enabled)
  const moodRef     = useRef('calm')
  const ctxRef      = useRef(null)
  const masterRef   = useRef(null)
  const audioRef    = useRef(null)
  const nodesRef    = useRef([])
  const startedRef  = useRef(false)

  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const stopSynth = useCallback(() => {
    nodesRef.current.forEach(n => { try { n.stop() } catch {} })
    nodesRef.current = []
  }, [])

  const playSynth = useCallback((key, ctx, dest) => {
    stopSynth()
    const cfg = SYNTH[key]
    if (!cfg) return

    const reverb     = makeReverb(ctx)
    const reverbGain = ctx.createGain()
    reverbGain.gain.value = 0.25
    reverb.connect(reverbGain)
    reverbGain.connect(dest)

    cfg.notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = cfg.type
      osc.frequency.value = freq
      osc.detune.value = (i - 1) * 5

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = cfg.filterFreq
      filter.Q.value = 0.8

      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = cfg.lfoRate + i * 0.017
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = cfg.lfoDepth
      lfo.connect(lfoGain)
      lfoGain.connect(filter.frequency)

      const vGain = ctx.createGain()
      vGain.gain.value = 1 / cfg.notes.length

      osc.connect(filter)
      filter.connect(vGain)
      vGain.connect(dest)
      vGain.connect(reverb)

      lfo.start()
      osc.start()
      nodesRef.current.push(osc, lfo)
    })
  }, [stopSynth])

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const ctx    = new (window.AudioContext || window.webkitAudioContext)()
      const master = ctx.createGain()
      master.connect(ctx.destination)
      ctxRef.current  = ctx
      masterRef.current = master
    }
    return ctxRef.current
  }, [])

  const start = useCallback((initialMood = 'calm') => {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const cfg  = SYNTH[initialMood]
    const gain = enabledRef.current ? (cfg?.gain ?? 0.04) : 0
    masterRef.current.gain.setValueAtTime(gain, ctx.currentTime)

    const url = TRACKS[initialMood]
    if (url) {
      const audio = new Audio(url)
      audio.loop = true
      audio.volume = enabledRef.current ? 0.5 : 0
      audio.play().catch(() => {})
      audioRef.current = audio
      stopSynth()
    } else {
      playSynth(initialMood, ctx, masterRef.current)
    }

    moodRef.current = initialMood
    setMoodState(initialMood)
    startedRef.current = true
  }, [getCtx, playSynth, stopSynth])

  const setMood = useCallback((newMood) => {
    if (!startedRef.current || moodRef.current === newMood) return
    moodRef.current = newMood
    setMoodState(newMood)

    const ctx    = ctxRef.current
    const master = masterRef.current
    if (!ctx || !master) return

    const now = ctx.currentTime
    master.gain.linearRampToValueAtTime(0, now + 1.5)

    // fade out audio file too
    if (audioRef.current) {
      const audio = audioRef.current
      const steps = 15
      let step = 0
      const startVol = audio.volume
      const fadeId = setInterval(() => {
        step++
        audio.volume = Math.max(0, startVol * (1 - step / steps))
        if (step >= steps) clearInterval(fadeId)
      }, 100)
    }

    setTimeout(() => {
      if (!ctxRef.current) return
      const cfg = SYNTH[newMood]
      const url = TRACKS[newMood]

      if (url) {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
        const audio = new Audio(url)
        audio.loop = true
        audio.volume = enabledRef.current ? 0.5 : 0
        audio.play().catch(() => {})
        audioRef.current = audio
        stopSynth()
        master.gain.setValueAtTime(0, ctxRef.current.currentTime)
      } else {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
        playSynth(newMood, ctxRef.current, master)
        const targetGain = enabledRef.current ? (cfg?.gain ?? 0.04) : 0
        master.gain.setValueAtTime(0, ctxRef.current.currentTime)
        master.gain.linearRampToValueAtTime(targetGain, ctxRef.current.currentTime + 1.5)
      }
    }, 1500)
  }, [playSynth, stopSynth])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      enabledRef.current = next
      localStorage.setItem('bgm', next ? 'on' : 'off')

      if (masterRef.current && ctxRef.current) {
        const cfg = SYNTH[moodRef.current]
        masterRef.current.gain.linearRampToValueAtTime(
          next ? (cfg?.gain ?? 0.04) : 0,
          ctxRef.current.currentTime + 0.4
        )
      }
      if (audioRef.current) {
        audioRef.current.volume = next ? 0.5 : 0
      }
      return next
    })
  }, [])

  useEffect(() => {
    return () => {
      stopSynth()
      ctxRef.current?.close()
      if (audioRef.current) { audioRef.current.pause() }
    }
  }, [stopSynth])

  return { enabled, toggle, start, setMood, mood }
}
