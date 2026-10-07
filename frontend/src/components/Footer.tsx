import { Link } from 'react-router-dom'
import BoneDivider from './BoneDivider'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="footer-brand">Campus Customs</p>
          <p>
            Family owned. <BoneDivider /> Yale proud. <BoneDivider /> Connecticut made.
          </p>
        </div>
        <nav className="footer-nav">
          <Link to="/products">Shop All</Link>
          <Link to="/about">About Us</Link>
          <Link to="/login">Log In</Link>
        </nav>
      </div>
      <p className="footer-copy">© {YEAR} Campus Customs. All rights reserved.</p>
    </footer>
  )
}
