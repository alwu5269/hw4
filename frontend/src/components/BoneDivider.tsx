// A tiny dog bone used as a separator between words. Inherits the text color.
export default function BoneDivider() {
  return (
    <svg className="bone-divider" viewBox="0 0 24 12" width="1.1em" height="0.55em" aria-hidden="true">
      <rect x="5" y="4" width="14" height="4" rx="1.5" fill="currentColor" />
      <circle cx="4.5" cy="3.5" r="2.8" fill="currentColor" />
      <circle cx="4.5" cy="8.5" r="2.8" fill="currentColor" />
      <circle cx="19.5" cy="3.5" r="2.8" fill="currentColor" />
      <circle cx="19.5" cy="8.5" r="2.8" fill="currentColor" />
    </svg>
  )
}
