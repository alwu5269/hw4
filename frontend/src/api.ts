import { authHeaders } from './tokenStorage'

export interface SizeStock {
  size: string
  quantity: number
}

export interface Product {
  product_id: string
  name: string
  garment_type: string
  description: string
  colors: string[]
  search_tags: string[]
  price: number
  image_url: string
  total_stock: number
  inventory?: SizeStock[]
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}

export const fetchProducts = () => getJson<Product[]>('/api/products')
export const fetchProduct = (id: string) => getJson<Product>(`/api/products/${encodeURIComponent(id)}`)

export const formatPrice = (price: number) =>
  price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export interface ProductCardData {
  product_id: string
  name: string
  garment_type: string
  price: number
  image_url: string
  total_stock: number
  description?: string | null // catalogue description, shown shortened on cards
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatReply {
  message: string
  products: ProductCardData[]
  search_query: string | null // set when the reply is a catalogue search to show on the Products page
  // Guests only: the server-signed conversation window to send back with the next message.
  history: ChatTurn[] | null
  history_token: string | null
}

// The signed conversation a guest sends back; the server drops it if anything was changed.
export interface GuestHistory {
  history: ChatTurn[]
  history_token: string | null
}

// Where the shopper is when they send a message, so the agent knows what "this" refers to.
export interface PageContext {
  path: string
  product_id: string | null
}

export interface SavedChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  products: ProductCardData[]
  created_at: string
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.')
  return data as T
}

// The login token (if any) is sent so the server can load and save this shopper's history.
// Guests send back the signed history from the previous reply (ignored when logged in).
export async function sendChat(message: string, guest: GuestHistory, page: PageContext): Promise<ChatReply> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ message, ...guest, page }),
  })
  return readJson<ChatReply>(res)
}

export async function fetchChatHistory(): Promise<SavedChatMessage[]> {
  return readJson<SavedChatMessage[]>(await fetch('/api/chat/history', { headers: authHeaders() }))
}

export async function clearChatHistory(): Promise<void> {
  const res = await fetch('/api/chat/history', { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error('Could not clear your chat. Please try again.')
}
