// Mirrors the backend rules in backend/auth.py so users get instant feedback.
export const PASSWORD_RULES = [
  { label: '6–16 characters', test: (pw: string) => pw.length >= 6 && pw.length <= 16 },
  { label: 'At least one special character (e.g. ! @ # $)', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
]
