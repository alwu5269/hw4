import { useEffect, useRef, useState } from 'react'
import { DRESS_DAN_EVENT } from '../danEvents'
import DogBones, { BONE_COUNT, TOP_BONE } from './DogBones'
import SittingDan, { type Outfit } from './SittingDan'

const CLICKS_TO_FETCH = 5
const WIGGLE_MS = 600
const HAPPY_MS = 4000 // how long Dan holds the bone and wags before putting it back
const FOOTER_GAP = 8 // px kept between the corner and the blue footer

// Bottom-left corner: Handsome Dan sitting on the left with his pile of bones in front of him, to the right.
// - Click the bones: one wiggles. Every 5th click, Dan grabs a bone and wags his tail.
// - "Put it on Dan" on a product page dresses him in that product.
// - The whole corner rises so it always stays above the blue footer.
// - Small screens: the bones are hidden and Dan peeks in from the left edge; tapping him
//   slides him out for a moment (CSS in index.css).
export default function DanCorner() {
  const cornerRef = useRef<HTMLDivElement>(null)
  const [clicks, setClicks] = useState(0)
  const [wiggling, setWiggling] = useState<number | null>(null)
  const [wiggleKey, setWiggleKey] = useState(0)
  const [happy, setHappy] = useState(false)
  const [peekOut, setPeekOut] = useState(false)
  const peekTimer = useRef<number | undefined>(undefined)
  const fetching = useRef(false) // between the 5th click and Dan grabbing the bone
  const [outfit, setOutfit] = useState<Outfit | null>(null)
  const timers = useRef<number[]>([])
  const wiggleTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      clearTimeout(wiggleTimer.current)
      clearTimeout(peekTimer.current)
    },
    [],
  )

  // Stay above the footer: when the footer scrolls into view, lift the corner by the overlap.
  useEffect(() => {
    const place = () => {
      const corner = cornerRef.current
      const footer = document.querySelector('.site-footer')
      if (!corner || !footer) return
      const overlap = window.innerHeight - footer.getBoundingClientRect().top
      corner.style.bottom = `${Math.max(0, overlap) + FOOTER_GAP}px`
    }
    place()
    window.addEventListener('scroll', place, { passive: true })
    window.addEventListener('resize', place)
    const observer = new ResizeObserver(place) // page height changes (new page, images loading)
    observer.observe(document.body)
    return () => {
      window.removeEventListener('scroll', place)
      window.removeEventListener('resize', place)
      observer.disconnect()
    }
  }, [])

  // Outfit from the "Put it on Dan" link on product pages.
  useEffect(() => {
    const onDress = (e: Event) => setOutfit((e as CustomEvent<Outfit>).detail)
    window.addEventListener(DRESS_DAN_EVENT, onDress)
    return () => window.removeEventListener(DRESS_DAN_EVENT, onDress)
  }, [])

  function handleBoneClick() {
    if (happy || fetching.current) return
    const next = clicks + 1
    // Bones wiggle in order; the 5th is the Y bone, the one Dan then grabs.
    setWiggling((next - 1) % BONE_COUNT)
    setWiggleKey((k) => k + 1)
    // Restart the wiggle timer so an earlier click can't cut this wiggle short.
    clearTimeout(wiggleTimer.current)
    wiggleTimer.current = window.setTimeout(() => setWiggling(null), WIGGLE_MS)
    if (next >= CLICKS_TO_FETCH) {
      setClicks(0)
      fetching.current = true
      // Let the Y bone finish its wiggle, then Dan grabs it and wags.
      timers.current.push(
        window.setTimeout(() => {
          fetching.current = false
          setHappy(true)
        }, WIGGLE_MS),
        window.setTimeout(() => setHappy(false), WIGGLE_MS + HAPPY_MS),
      )
    } else {
      setClicks(next)
    }
  }

  // Small screens only (the peek styles live in a media query): tap to slide out and say hi.
  function handleDanTap() {
    setPeekOut(true)
    clearTimeout(peekTimer.current)
    peekTimer.current = window.setTimeout(() => setPeekOut(false), 2500)
  }

  return (
    <div ref={cornerRef} className="dan-corner">
      <div className={`dan-figure${happy ? ' happy' : ''}${peekOut ? ' peek-out' : ''}`} onClick={handleDanTap}>
        <SittingDan holdingBone={happy} wagging={happy} outfit={outfit} />
        {outfit && (
          <button type="button" className="dan-undress" onClick={() => setOutfit(null)} aria-label={`Take the ${outfit.name} off Handsome Dan`}>
            ×
          </button>
        )}
      </div>
      <button
        type="button"
        className="dan-bones-button"
        onClick={handleBoneClick}
        aria-label={`Dan's bone pile. Click it ${CLICKS_TO_FETCH} times and Dan fetches a bone.`}
      >
        <DogBones wiggling={wiggling} wiggleKey={wiggleKey} hidden={happy ? TOP_BONE : null} />
      </button>
    </div>
  )
}
