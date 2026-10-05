import { useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type SignupData } from '../auth'
import { PASSWORD_RULES } from '../passwordRules'
import AuthForm from './AuthForm'

const EMPTY: SignupData = { first_name: '', last_name: '', email: '', password: '', confirm_password: '' }

export default function CreateAccount() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<SignupData>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field: keyof SignupData) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const passwordsMatch = form.confirm_password.length > 0 && form.password === form.confirm_password

  async function handleSubmit() {
    setError(null)
    const failed = PASSWORD_RULES.filter((rule) => !rule.test(form.password))
    if (failed.length > 0) return setError(`Password needs: ${failed.map((r) => r.label.toLowerCase()).join(', ')}.`)
    if (form.password !== form.confirm_password) return setError('Passwords do not match.')

    setSubmitting(true)
    try {
      await signup(form)
      navigate('/products')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthForm
      eyebrow="Join Us"
      title="Create Account"
      submitLabel="Create Account"
      onSubmit={handleSubmit}
      error={error}
      submitting={submitting}
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <div className="form-row">
        <label>
          First Name
          <input name="first_name" autoComplete="given-name" required value={form.first_name} onChange={update('first_name')} />
        </label>
        <label>
          Last Name
          <input name="last_name" autoComplete="family-name" required value={form.last_name} onChange={update('last_name')} />
        </label>
      </div>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required value={form.email} onChange={update('email')} />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          maxLength={16}
          value={form.password}
          onChange={update('password')}
        />
      </label>
      <ul className="password-rules">
        {PASSWORD_RULES.map((rule) => (
          <li key={rule.label} className={rule.test(form.password) ? 'met' : ''}>
            {rule.label}
          </li>
        ))}
      </ul>
      <label>
        Confirm Password
        <input
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          required
          maxLength={16}
          value={form.confirm_password}
          onChange={update('confirm_password')}
        />
      </label>
      {form.confirm_password && (
        <p className={`match ${passwordsMatch ? 'met' : 'unmet'}`}>
          {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
        </p>
      )}
    </AuthForm>
  )
}
