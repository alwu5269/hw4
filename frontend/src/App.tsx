import { useLayoutEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import ChatWidget from './components/ChatWidget'
import DanCorner from './components/DanCorner'
import Footer from './components/Footer'
import Header from './components/Header'
import PartyBanner from './components/PartyBanner'
import About from './pages/About'
import CreateAccount from './pages/CreateAccount'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import ProductDetail from './pages/ProductDetail'
import Products from './pages/Products'

export default function App() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Start each new page at the top (React Router keeps the old scroll position otherwise).
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <>
      <Header />
      <main>
        <PartyBanner />
        {/* Keyed by path so each page change replays the enter transition. */}
        <div key={location.pathname} className="page-transition">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </main>
      <Footer />
      <DanCorner />
      {/* Keyed by user so logging in or out starts a fresh widget that loads (or forgets) saved history. */}
      {!loading && <ChatWidget key={user?.id ?? 'guest'} />}
    </>
  )
}
