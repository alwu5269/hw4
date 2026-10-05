import { useEffect, useRef, useState } from 'react'

const CONFETTI_COLORS = ['#00356b', '#286dc0', '#c9a27e', '#f4a6a6', '#ffffff', '#ffd166']
const PIECES = 36

interface Piece {
  id: number
  x: number // final horizontal offset, px
  y: number // final vertical offset, px
  rotate: number
  color: string
  delay: number
  round: boolean
}

// Add to Cart: a celebration only for now (no cart yet). Each click bursts a fresh round of confetti.
// `label` overrides the text while disabled (e.g. "Select a Size").
export default function AddToCartButton({ disabled, label }: { disabled?: boolean; label?: string }) {
  const [bursts, setBursts] = useState<{ id: number; pieces: Piece[] }[]>([])
  const [added, setAdded] = useState(false)
  const nextId = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function handleClick() {
    const id = nextId.current++
    const pieces = Array.from({ length: PIECES }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PIECES + Math.random() * 0.4
      const distance = 70 + Math.random() * 90
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 40, // bias upward
        rotate: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 80,
        round: Math.random() > 0.6,
      }
    })
    setBursts((prev) => [...prev, { id, pieces }])
    setAdded(true)
    timers.current.push(
      window.setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1200),
      window.setTimeout(() => setAdded(false), 1800),
    )
  }

  return (
    <div className="add-to-cart">
      <button type="button" className="button add-to-cart-button" onClick={handleClick} disabled={disabled}>
        {disabled ? (label ?? 'Add to Cart') : added ? 'Added! 🎉' : 'Add to Cart'}
      </button>
      {bursts.map((burst) => (
        <div key={burst.id} className="confetti" aria-hidden="true">
          {burst.pieces.map((p) => (
            <span
              key={p.id}
              className={`confetti-piece${p.round ? ' round' : ''}`}
              style={
                {
                  '--x': `${p.x}px`,
                  '--y': `${p.y}px`,
                  '--r': `${p.rotate}deg`,
                  background: p.color,
                  animationDelay: `${p.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}
