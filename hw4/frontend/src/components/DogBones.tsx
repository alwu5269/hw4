// A little pile of dog bones for Handsome Dan. Clicking makes a bone wiggle; a bone can be
// hidden while Dan is holding it.

const BONES = [
  { x: 52, y: 84, rotate: -8, scale: 1 },
  { x: 118, y: 86, rotate: 10, scale: 1 },
  { x: 86, y: 66, rotate: -22, scale: 0.95 },
  { x: 108, y: 46, rotate: -12, scale: 0.85 },
  { x: 60, y: 50, rotate: 18, scale: 0.8 }, // top-left bone, wears the Y tag; wiggles last (5th click)
]
export const BONE_COUNT = BONES.length
export const TOP_BONE = BONES.length - 1

function Bone() {
  return (
    <>
      <rect x="-26" y="-6" width="52" height="12" rx="5" fill="#fbf3e4" stroke="#c9a27e" strokeWidth="2" />
      {[-28, 28].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="-7" r="8" fill="#fbf3e4" stroke="#c9a27e" strokeWidth="2" />
          <circle cx={cx} cy="7" r="8" fill="#fbf3e4" stroke="#c9a27e" strokeWidth="2" />
        </g>
      ))}
      <rect x="-26" y="-4" width="52" height="8" fill="#fbf3e4" />
      <path d="M-18 -2 H14" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </>
  )
}

interface DogBonesProps {
  wiggling?: number | null // index of the bone currently wiggling
  hidden?: number | null // index of a bone Dan has taken
  wiggleKey?: number // changes on every click so the same bone can wiggle again
}

export default function DogBones({ wiggling = null, hidden = null, wiggleKey = 0 }: DogBonesProps) {
  return (
    <svg className="dog-bones" width="170" height="110" viewBox="0 0 170 110" aria-hidden="true">
      <ellipse cx="85" cy="100" rx="72" ry="8" fill="#00356b" opacity="0.08" />
      {BONES.map((bone, i) =>
        i === hidden ? null : (
          <g key={i} transform={`translate(${bone.x} ${bone.y}) rotate(${bone.rotate}) scale(${bone.scale})`}>
            {/* inner group takes the CSS wiggle without clobbering the placement transform */}
            <g key={i === wiggling ? `w${wiggleKey}` : 'still'} className={`bone${i === wiggling ? ' wiggle' : ''}`}>
              <Bone />
              {i === TOP_BONE && (
                <g transform={`rotate(${-bone.rotate})`}>
                  <circle cx="0" cy="0" r="8.5" fill="#00356b" stroke="#fff" strokeWidth="1.5" />
                  <text y="4" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="10" fill="#fff">
                    Y
                  </text>
                </g>
              )}
            </g>
          </g>
        ),
      )}
    </svg>
  )
}
