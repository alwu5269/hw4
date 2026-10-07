import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import AuthForm from './AuthForm'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/products')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthForm
      eyebrow="Welcome Back"
      title="Log In"
      submitLabel="Log In"
      onSubmit={handleSubmit}
      error={error}
      submitting={submitting}
      footer={<>New to Campus Customs? <Link to="/create-account">Create an account</Link></>}
    >
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
    </AuthForm>
  )
}
