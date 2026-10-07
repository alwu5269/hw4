// The session token from log in / sign up, kept in localStorage so the shopper stays logged in.
export const TOKEN_KEY = 'campus-customs-token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
