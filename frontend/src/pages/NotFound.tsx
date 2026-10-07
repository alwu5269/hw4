import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="section narrow">
      <h1>Page Not Found</h1>
      <p>
        <Link to="/" className="text-link">Return Home</Link>
      </p>
    </section>
  )
}
