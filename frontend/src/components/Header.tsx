import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import BoneDivider from './BoneDivider'
import Bulldog from './Bulldog'

const links = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About Us' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="announcement">Proudly outfitting Yale fans in New Haven, Connecticut</div>
      <div className="header-inner">
        <Link to="/" className="brand">
          <Bulldog size={48} className="brand-dog" />
          <span className="brand-text">
            <span className="brand-name">Campus Customs</span>
            <span className="brand-sub">
              Apparel <BoneDivider /> Merch <BoneDivider /> Souvenirs
            </span>
          </span>
        </Link>
        <nav className="main-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="account-nav">
          {user ? (
            <>
              <span className="greeting">Hi, {user.first_name}!</span>
              <button type="button" className="button button-small" onClick={handleLogout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log In</NavLink>
              <NavLink to="/create-account" className="button button-small">
                Create Account
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
