import { useRef, useCallback, useState, useEffect } from 'react'

// 실제 음악 파일 URL을 여기에 넣으면 파일 기반 재생으로 전환됩니다.
// null이면 Web Audio API로 앰비언트 사운드를 생성합니다.
const TRACKS = {
  calm:     null,
  battle:   null,
  gameover: null,
}

// gain은 volume=1.0 기준 최대치. volume 0~1 곱셈으로 실제 출력 결정.
const SYNTH = {
  calm: {
    notes: [110.0, 130.8, 164.8],
    type: 'sine',
    lfoRate: 0.05, lfoDepth: 70,
    filterFreq: 480, gain: 0.076,
  },
  battle: {
    notes: [164.8, 196.0, 246.9],
    type: 'sawtooth',
    lfoRate: 0.45, lfoDepth: 280,
    filterFreq: 1300, gain: 0.056,
  },
  gameover: {
    notes: [73.4, 87.3, 98.0],
    type: 'sine',
    lfoRate: 0.022, lfoDepth: 25,
    filterFreq: 320, gain: 0.070,
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
  const [volume, setVolumeState] = useState(() => {
    const saved = parseFloat(localStorage.getItem('bgm_volume'))
    return isNaN(saved) ? 0.5 : Math.max(0, Math.min(1, saved))
  })

  const enabledRef   = useRef(enabled)
  const volumeRef    = useRef(volume)
  const moodRef      = useRef('calm')
  const ctxRef       = useRef(null)
  const masterRef    = useRef(null)
  const audioRef     = useRef(null)
  const nodesRef     = useRef([])
  const startedRef   = useRef(false)
  const audioFadeRef = useRef(null)

  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { volumeRef.current = volume }, [volume])

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

    const cfg        = SYNTH[initialMood]
    const targetGain = enabledRef.current ? (cfg?.gain ?? 0.08) * volumeRef.current : 0
    // fade-in from silence to avoid click/pop
    masterRef.current.gain.setValueAtTime(0, ctx.currentTime)
    masterRef.current.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 2.0)

    const url = TRACKS[initialMood]
    if (url) {
      const audio = new Audio(url)
      audio.loop = true
      audio.volume = enabledRef.current ? volumeRef.current : 0
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

    // fade out audio file — clear any existing fade interval first
    if (audioRef.current) {
      const audio = audioRef.current
      const steps = 15
      let step = 0
      const startVol = audio.volume
      if (audioFadeRef.current) { clearInterval(audioFadeRef.current); audioFadeRef.current = null }
      audioFadeRef.current = setInterval(() => {
        step++
        audio.volume = Math.max(0, startVol * (1 - step / steps))
        if (step >= steps) { clearInterval(audioFadeRef.current); audioFadeRef.current = null }
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
        audio.volume = enabledRef.current ? volumeRef.current : 0
        audio.play().catch(() => {})
        audioRef.current = audio
        stopSynth()
        master.gain.setValueAtTime(0, ctxRef.current.currentTime)
      } else {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
        playSynth(newMood, ctxRef.current, master)
        const targetGain = enabledRef.current ? (cfg?.gain ?? 0.08) * volumeRef.current : 0
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
          next ? (cfg?.gain ?? 0.08) * volumeRef.current : 0,
          ctxRef.current.currentTime + 0.4
        )
      }
      if (audioRef.current) {
        audioRef.current.volume = next ? volumeRef.current : 0
      }
      return next
    })
  }, [])

  const playSFX = useCallback((type) => {
    if (!enabledRef.current) return
    try {
      const ctx = getCtx()
      if (ctx.state === 'suspended') ctx.resume()
      const vol = volumeRef.current

      const sfxMap = {
        combat: () => {
          [0, 0.04, 0.09].forEach((delay, i) => {
            const osc = ctx.createOscillator()
            const g   = ctx.createGain()
            osc.type = 'sawtooth'
            osc.frequency.value = 180 + i * 110
            g.gain.setValueAtTime(0, ctx.currentTime + delay)
            g.gain.linearRampToValueAtTime(0.16 * vol, ctx.currentTime + delay + 0.01)
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2)
            osc.connect(g); g.connect(ctx.destination)
            osc.start(ctx.currentTime + delay)
            osc.stop(ctx.currentTime + delay + 0.22)
          })
        },
        levelup: () => {
          [261.6, 329.6, 392.0, 523.2].forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const g   = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.value = freq
            const t = ctx.currentTime + i * 0.11
            g.gain.setValueAtTime(0, t)
            g.gain.linearRampToValueAtTime(0.22 * vol, t + 0.04)
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
            osc.connect(g); g.connect(ctx.destination)
            osc.start(t); osc.stop(t + 0.42)
          })
        },
        item: () => {
          [880, 1108].forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const g   = ctx.createGain()
            osc.type = 'sine'
            osc.frequency.value = freq
            const t = ctx.currentTime + i * 0.09
            g.gain.setValueAtTime(0, t)
            g.gain.linearRampToValueAtTime(0.13 * vol, t + 0.02)
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.32)
            osc.connect(g); g.connect(ctx.destination)
            osc.start(t); osc.stop(t + 0.35)
          })
        },
        error: () => {
          const osc = ctx.createOscillator()
          const g   = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(240, ctx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.32)
          g.gain.setValueAtTime(0.18 * vol, ctx.currentTime)
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38)
          osc.connect(g); g.connect(ctx.destination)
          osc.start(); osc.stop(ctx.currentTime + 0.4)
        },
      }

      sfxMap[type]?.()
    } catch {}
  }, [getCtx])

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v))
    volumeRef.current = clamped
    setVolumeState(clamped)
    localStorage.setItem('bgm_volume', String(clamped))

    if (masterRef.current && ctxRef.current && enabledRef.current) {
      const cfg = SYNTH[moodRef.current]
      masterRef.current.gain.linearRampToValueAtTime(
        (cfg?.gain ?? 0.08) * clamped,
        ctxRef.current.currentTime + 0.1
      )
    }
    if (audioRef.current && enabledRef.current) {
      audioRef.current.volume = clamped
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioFadeRef.current) clearInterval(audioFadeRef.current)
      stopSynth()
      ctxRef.current?.close()
      if (audioRef.current) { audioRef.current.pause() }
    }
  }, [stopSynth])

  return { enabled, toggle, start, setMood, mood, volume, setVolume, playSFX }
}
