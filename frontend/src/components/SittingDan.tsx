// Handsome Dan sitting up: an original cartoon bulldog. He can hold a bone, wag his tail,
// and wear a product (its photo is clipped to his torso like a shirt).

export interface Outfit {
  product_id: string
  name: string
  image_url: string
}

const FUR = '#f1dcc3'
const FUR_DARK = '#c9a27e'
const LINE = '#5a3d2b'

// Outfits that swap Dan's collar for a bowtie (business attire for the School of Management).
const BOWTIE_OUTFITS = new Set(['school-of-management-crest-t-shirt'])

interface SittingDanProps {
  holdingBone?: boolean
  wagging?: boolean
  outfit?: Outfit | null
}

export default function SittingDan({ holdingBone = false, wagging = false, outfit = null }: SittingDanProps) {
  return (
    <svg className="sitting-dan" viewBox="0 0 140 160" width="140" height="160" role="img" aria-label={outfit ? `Handsome Dan wearing the ${outfit.name}` : 'Handsome Dan'}>
      <defs>
        {/* torso shape: where clothing goes */}
        <clipPath id="dan-torso">
          <path d="M38 96 Q40 80 56 78 L84 78 Q100 80 102 96 L106 132 Q70 142 34 132 Z" />
        </clipPath>
      </defs>

      {/* tail, behind the body; wags from its base */}
      <g className={`dan-tail${wagging ? ' wagging' : ''}`}>
        <path d="M104 128 q16 -4 14 -18 q-2 -8 -8 -4" fill="none" stroke={LINE} strokeWidth="9" strokeLinecap="round" />
        <path d="M104 128 q16 -4 14 -18 q-2 -8 -8 -4" fill="none" stroke={FUR_DARK} strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* back haunches */}
      <ellipse cx="40" cy="132" rx="20" ry="16" fill={FUR} stroke={LINE} strokeWidth="2.5" />
      <ellipse cx="100" cy="132" rx="20" ry="16" fill={FUR} stroke={LINE} strokeWidth="2.5" />

      {/* body */}
      <path d="M36 98 Q38 76 58 74 L82 74 Q102 76 104 98 L108 134 Q70 146 32 134 Z" fill={FUR} stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="70" cy="110" rx="18" ry="22" fill="#fbeedd" />

      {/* outfit: the product photo, zoomed to its center print and clipped to the torso */}
      {outfit && (
        <g className="dan-outfit">
          <image
            href={outfit.image_url}
            x="22"
            y="62"
            width="96"
            height="96"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#dan-torso)"
          />
          <path d="M38 96 Q40 80 56 78 L84 78 Q100 80 102 96 L106 132 Q70 142 34 132 Z" fill="none" stroke="#00254a" strokeWidth="2" opacity="0.5" />
        </g>
      )}

      {/* front legs and paws */}
      <rect x="50" y="118" width="14" height="30" rx="7" fill={FUR} stroke={LINE} strokeWidth="2.5" />
      <rect x="76" y="118" width="14" height="30" rx="7" fill={FUR} stroke={LINE} strokeWidth="2.5" />
      <ellipse cx="57" cy="149" rx="10" ry="5" fill={FUR} stroke={LINE} strokeWidth="2.5" />
      <ellipse cx="83" cy="149" rx="10" ry="5" fill={FUR} stroke={LINE} strokeWidth="2.5" />

      {/* head */}
      <g className="dan-head">
        <path d="M38 30 C26 14 34 6 48 16 L52 28 Z" fill={FUR_DARK} stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M102 30 C114 14 106 6 92 16 L88 28 Z" fill={FUR_DARK} stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />
        <ellipse cx="70" cy="48" rx="36" ry="32" fill={FUR} stroke={LINE} strokeWidth="2.5" />
        <ellipse cx="55" cy="40" rx="11" ry="10" fill={FUR_DARK} />
        <circle cx="56" cy="41" r="4.5" fill="#2b1d14" />
        <circle cx="84" cy="41" r="4.5" fill="#2b1d14" />
        <circle cx="57.5" cy="39.5" r="1.5" fill="#fff" />
        <circle cx="85.5" cy="39.5" r="1.5" fill="#fff" />
        <ellipse cx="44" cy="56" rx="6" ry="4" fill="#f4a6a6" opacity="0.7" />
        <ellipse cx="96" cy="56" rx="6" ry="4" fill="#f4a6a6" opacity="0.7" />
        <ellipse cx="70" cy="60" rx="20" ry="14" fill="#fbeedd" stroke={LINE} strokeWidth="2" />
        <ellipse cx="70" cy="52" rx="7" ry="4.5" fill="#2b1d14" />
        {holdingBone ? (
          // bone held sideways in his mouth
          <g className="dan-mouth-bone">
            <rect x="46" y="62" width="48" height="8" rx="4" fill="#fbf3e4" stroke={FUR_DARK} strokeWidth="1.5" />
            <circle cx="45" cy="62" r="5.5" fill="#fbf3e4" stroke={FUR_DARK} strokeWidth="1.5" />
            <circle cx="45" cy="70" r="5.5" fill="#fbf3e4" stroke={FUR_DARK} strokeWidth="1.5" />
            <circle cx="95" cy="62" r="5.5" fill="#fbf3e4" stroke={FUR_DARK} strokeWidth="1.5" />
            <circle cx="95" cy="70" r="5.5" fill="#fbf3e4" stroke={FUR_DARK} strokeWidth="1.5" />
            <rect x="46" y="63.5" width="48" height="5" fill="#fbf3e4" />
          </g>
        ) : (
          <>
            <path d="M70 56 L70 62 M62 64 Q70 70 78 64" fill="none" stroke="#2b1d14" strokeWidth="2" strokeLinecap="round" />
            <path d="M64 65 L65.5 61 L67 65 M73 65 L74.5 61 L76 65" fill="#fff" stroke="#2b1d14" strokeWidth="1.2" strokeLinejoin="round" />
          </>
        )}
      </g>

      {outfit && BOWTIE_OUTFITS.has(outfit.product_id) ? (
        // Yale-blue bowtie instead of the collar
        <g className="dan-bowtie">
          <path d="M70 84 L54 75 Q50 84 54 93 Z" fill="#00356b" stroke="#00254a" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M70 84 L86 75 Q90 84 86 93 Z" fill="#00356b" stroke="#00254a" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M57 80 L62 82 M57 88 L62 86 M83 80 L78 82 M83 88 L78 86" stroke="#286dc0" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="65.5" y="79.5" width="9" height="9" rx="2.5" fill="#286dc0" stroke="#00254a" strokeWidth="1.5" />
        </g>
      ) : (
        <>
          {/* Yale-blue collar with Y tag, on top of any outfit */}
          <path d="M44 76 Q70 90 96 76" fill="none" stroke="#00356b" strokeWidth="6" strokeLinecap="round" />
          <circle cx="70" cy="88" r="6.5" fill="#00356b" stroke="#fff" strokeWidth="1.5" />
          <text x="70" y="91.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="9" fill="#fff">
            Y
          </text>
        </>
      )}
    </svg>
  )
}
