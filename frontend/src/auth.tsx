import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { TOKEN_KEY } from './tokenStorage'

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  created_at: string
}

interface AuthResponse {
  token: string
  user: User
}

export interface SignupData {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function postJson(url: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.')
  return data as AuthResponse
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => localStorage.getItem(TOKEN_KEY) !== null)

  // Restore the session from a saved token when the site loads.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((me: User) => setUser(me))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const finish = useCallback(({ token, user }: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => finish(await postJson('/api/auth/login', { email, password })),
    [finish],
  )
  const signup = useCallback(async (data: SignupData) => finish(await postJson('/api/auth/signup', data)), [finish])
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
