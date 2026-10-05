import type { FormEvent, ReactNode } from 'react'

interface AuthFormProps {
  eyebrow: string
  title: string
  submitLabel: string
  footer: ReactNode
  children: ReactNode
  onSubmit: () => void
  error?: string | null
  submitting?: boolean
}

export default function AuthForm({ eyebrow, title, submitLabel, footer, children, onSubmit, error, submitting }: AuthFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <section className="section auth">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button-full" disabled={submitting}>
          {submitting ? 'Please wait…' : submitLabel}
        </button>
        <p className="auth-footer">{footer}</p>
      </form>
    </section>
  )
}
