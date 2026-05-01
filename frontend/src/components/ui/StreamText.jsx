import { useEffect, useRef, useState } from 'react'

const CHARS_PER_FRAME = 3

export default function StreamText({ text }) {
  const [displayed, setDisplayed] = useState('')
  const rafRef = useRef(null)
  const lenRef = useRef(0)

  useEffect(() => {
    if (!text) {
      lenRef.current = 0
      setDisplayed('')
      return
    }

    if (lenRef.current > text.length) {
      lenRef.current = 0
      setDisplayed('')
    }

    const animate = () => {
      if (lenRef.current >= text.length) return
      const next = Math.min(lenRef.current + CHARS_PER_FRAME, text.length)
      lenRef.current = next
      setDisplayed(text.slice(0, next))
      if (next < text.length) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [text])

  return <>{displayed}</>
}
