// Decorative party bunting: Yale-blue pennants with a white Y hanging from a string
// that droops between pins, like a real garland.
const SWAG_WIDTH = 300 // distance between pins, in px
const SWAG_COUNT = 9 // enough to cover wide screens; extra is clipped
const PIN_Y = 8
const SAG = 26 // how far the string droops at the middle of each swag
const PENNANTS_PER_SWAG = 5
const WIDTH = SWAG_WIDTH * SWAG_COUNT
const HEIGHT = PIN_Y + SAG + 52

// Quadratic Bezier from (x0, PIN_Y) to (x0 + SWAG_WIDTH, PIN_Y) with control point below the middle.
function pointOnSwag(x0: number, t: number) {
  const cx = x0 + SWAG_WIDTH / 2
  const cy = PIN_Y + SAG * 2
  const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * (x0 + SWAG_WIDTH)
  const y = (1 - t) ** 2 * PIN_Y + 2 * (1 - t) * t * cy + t ** 2 * PIN_Y
  // Tangent angle so each pennant hangs square to the string.
  const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x0 + SWAG_WIDTH - cx)
  const dy = 2 * (1 - t) * (cy - PIN_Y) + 2 * t * (PIN_Y - cy)
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI }
}

const swags = Array.from({ length: SWAG_COUNT }, (_, i) => i * SWAG_WIDTH)

export default function PartyBanner() {
  return (
    <div className="party-banner" aria-hidden="true">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {swags.map((x0) => (
          <g key={x0}>
            <path
              d={`M${x0} ${PIN_Y} Q${x0 + SWAG_WIDTH / 2} ${PIN_Y + SAG * 2} ${x0 + SWAG_WIDTH} ${PIN_Y}`}
              fill="none"
              stroke="#c9a27e"
              strokeWidth="2"
            />
            {Array.from({ length: PENNANTS_PER_SWAG }, (_, j) => {
              const { x, y, angle } = pointOnSwag(x0, (j + 1) / (PENNANTS_PER_SWAG + 1))
              return (
                <g key={j} transform={`translate(${x} ${y}) rotate(${angle})`}>
                  {/* inner group takes the CSS hover animation without clobbering the placement transform */}
                  <g className="pennant">
                    <path d="M-17 0 H17 L0 36 Z" fill="#00356b" stroke="#00254a" strokeWidth="1.5" strokeLinejoin="round" />
                    <text y="17" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="14" fill="#fff">
                      Y
                    </text>
                  </g>
                </g>
              )
            })}
          </g>
        ))}
        {/* pins where the string is attached */}
        {[...swags, WIDTH].map((x) => (
          <circle key={x} cx={x} cy={PIN_Y} r="4.5" fill="#00356b" stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  )
}
