// Original cartoon bulldog inspired by Handsome Dan, Yale's mascot.
export default function Bulldog({ size = 120, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Cartoon bulldog"
    >
      {/* ears */}
      <path d="M22 38 C10 22 18 12 34 22 L40 34 Z" fill="#c9a27e" stroke="#5a3d2b" strokeWidth="3" strokeLinejoin="round" />
      <path d="M98 38 C110 22 102 12 86 22 L80 34 Z" fill="#c9a27e" stroke="#5a3d2b" strokeWidth="3" strokeLinejoin="round" />
      {/* head */}
      <ellipse cx="60" cy="62" rx="42" ry="38" fill="#f1dcc3" stroke="#5a3d2b" strokeWidth="3" />
      {/* eye patch */}
      <ellipse cx="42" cy="52" rx="13" ry="12" fill="#c9a27e" />
      {/* eyes */}
      <circle cx="43" cy="53" r="5.5" fill="#2b1d14" />
      <circle cx="77" cy="53" r="5.5" fill="#2b1d14" />
      <circle cx="45" cy="51" r="1.8" fill="#fff" />
      <circle cx="79" cy="51" r="1.8" fill="#fff" />
      {/* cheeks */}
      <ellipse cx="30" cy="70" rx="7" ry="4.5" fill="#f4a6a6" opacity="0.7" />
      <ellipse cx="90" cy="70" rx="7" ry="4.5" fill="#f4a6a6" opacity="0.7" />
      {/* muzzle */}
      <ellipse cx="60" cy="76" rx="24" ry="17" fill="#fbeedd" stroke="#5a3d2b" strokeWidth="2.5" />
      <ellipse cx="60" cy="67" rx="8" ry="5.5" fill="#2b1d14" />
      <path d="M60 72 L60 79 M50 81 Q60 89 70 81" fill="none" stroke="#2b1d14" strokeWidth="2.5" strokeLinecap="round" />
      {/* underbite teeth */}
      <path d="M52 82 L54 77 L56 82 M64 82 L66 77 L68 82" fill="#fff" stroke="#2b1d14" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Yale-blue collar with Y tag */}
      <path d="M26 92 Q60 110 94 92" fill="none" stroke="#00356b" strokeWidth="7" strokeLinecap="round" />
      <circle cx="60" cy="104" r="8" fill="#00356b" stroke="#fff" strokeWidth="2" />
      <text x="60" y="108" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="11" fill="#fff">Y</text>
    </svg>
  )
}
