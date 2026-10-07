import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import {
  clearChatHistory,
  fetchChatHistory,
  formatPrice,
  sendChat,
  type ChatTurn,
  type GuestHistory,
  type PageContext,
  type ProductCardData,
} from '../api'
import { useAuth } from '../auth'
import { useChatResults } from '../chatResults'
import Bulldog from './Bulldog'

interface ChatMessage extends ChatTurn {
  products?: ProductCardData[]
  searchQuery?: string | null
  error?: boolean
}

function greetingFor(firstName?: string): ChatMessage {
  return {
    role: 'assistant',
    content: firstName
      ? `Welcome back, ${firstName}! I'm Dan, the Campus Customs bulldog. Ask me about products, sizes, or stock.`
      : "Hi! I'm Dan, the Campus Customs bulldog. Ask me about products, sizes, or stock.",
  }
}

const CHAT_CARD_LIMIT = 3 // cards shown inside the chat for a search; the full list goes on the page
const INPUT_MAX_HEIGHT = 140 // px; the message box grows with the text up to this, then scrolls

const GENERAL_STARTERS = [
  'What hoodies do you have?',
  'Gift ideas under $40?',
  'Do you have anything for the Harvard–Yale game?',
  'What’s new for residential colleges?',
]
const PRODUCT_STARTERS = ['Is this in stock in medium?', 'What colors does this come in?', 'Show me similar items']

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greetingFor(user?.first_name)])
  const [historyNote, setHistoryNote] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [guest, setGuest] = useState<GuestHistory>({ history: [], history_token: null })
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Grow the message box to fit what's typed (up to INPUT_MAX_HEIGHT), shrink it back when cleared.
  // Measured again on the next frame because the panel's width isn't final the moment it opens.
  useLayoutEffect(() => {
    const box = inputRef.current
    if (!box) return
    const fit = () => {
      box.style.height = 'auto'
      const border = box.offsetHeight - box.clientHeight
      const needed = box.scrollHeight + border
      box.style.height = `${Math.min(needed, INPUT_MAX_HEIGHT)}px`
      box.style.overflowY = needed > INPUT_MAX_HEIGHT ? 'auto' : 'hidden'
    }
    fit()
    const frame = requestAnimationFrame(fit)
    return () => cancelAnimationFrame(frame)
  }, [draft, open])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { setResults } = useChatResults()

  function showOnPage(query: string, products: ProductCardData[]) {
    setResults({ query, products })
    navigate('/products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Logged-in shoppers: reload their saved conversation. (The widget is re-mounted when the user changes.)
  useEffect(() => {
    if (!user) return
    fetchChatHistory()
      .then((saved) => {
        if (saved.length === 0) return
        setMessages([
          greetingFor(user.first_name),
          ...saved.map((m) => ({ role: m.role, content: m.content, products: m.products })),
        ])
      })
      .catch(() => setHistoryNote("Couldn't load your earlier chat."))
  }, [user])

  async function handleStartOver() {
    try {
      await clearChatHistory()
      setMessages([greetingFor(user?.first_name)])
      setHistoryNote(null)
    } catch (err) {
      setHistoryNote((err as Error).message)
    }
  }

  function pageContext(): PageContext {
    const match = matchPath('/products/:productId', location.pathname)
    return { path: location.pathname, product_id: match?.params.productId ?? null }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending, open])

  async function send(raw: string) {
    const text = raw.trim()
    if (!text || sending) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setDraft('')
    setSending(true)
    try {
      const reply = await sendChat(text, guest, pageContext())
      if (reply.history) setGuest({ history: reply.history, history_token: reply.history_token })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply.message, products: reply.products, searchQuery: reply.search_query },
      ])
      // A catalogue search: show every match on the Products page.
      if (reply.search_query && reply.products.length > 0) showOnPage(reply.search_query, reply.products)
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: (err as Error).message, error: true }])
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    send(draft)
  }

  // Enter sends; Shift+Enter adds a new line.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send(draft)
    }
  }

  const onProductPage = matchPath('/products/:productId', location.pathname) !== null
  const starters = onProductPage ? PRODUCT_STARTERS : GENERAL_STARTERS
  const showStarters = messages.length === 1 && !sending

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" aria-label="Chat with Campus Customs">
          <header className="chat-header">
            <span className="chat-title">
              <Bulldog size={30} /> Ask Dan
            </span>
            <span className="chat-header-actions">
              {user && messages.length > 1 && (
                <button type="button" className="chat-start-over" onClick={handleStartOver}>
                  Start over
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
                ×
              </button>
            </span>
          </header>
          <p className="chat-note">
            {historyNote ??
              (user ? 'Your chat is saved to your account.' : (
                <>
                  <Link to="/login">Log in</Link> to save your chat for next time.
                </>
              ))}
          </p>
          <div className="chat-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`chat-entry chat-entry-${message.role}`}>
                <div className={`chat-bubble chat-${message.role}${message.error ? ' chat-error' : ''}`}>
                  {message.content}
                </div>
                {message.products && message.products.length > 0 && (
                  <div className="chat-products">
                    {(message.searchQuery ? message.products.slice(0, CHAT_CARD_LIMIT) : message.products).map((product) => (
                      <Link key={product.product_id} to={`/products/${product.product_id}`} className="chat-product">
                        <img src={product.image_url} alt="" />
                        <span className="chat-product-info">
                          <span className="chat-product-name">{product.name}</span>
                          <span className="chat-product-meta">
                            {formatPrice(product.price)} · {product.total_stock > 0 ? `${product.total_stock} in stock` : 'Sold out'}
                          </span>
                        </span>
                      </Link>
                    ))}
                    {message.searchQuery && (
                      <button
                        type="button"
                        className="chat-see-all"
                        onClick={() => showOnPage(message.searchQuery!, message.products!)}
                      >
                        See all {message.products.length} on the page →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble chat-assistant chat-typing" role="status" aria-label="Dan is thinking">
                {[0, 1, 2].map((i) => (
                  <svg key={i} className="tennis-ball" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                    <circle cx="10" cy="10" r="9" fill="#d7e84a" stroke="#a9b92c" strokeWidth="1" />
                    <path d="M3 4.5 Q8 10 3 15.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M17 4.5 Q12 10 17 15.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                ))}
              </div>
            )}
            {showStarters && (
              <div className="chat-starters" aria-label="Suggested questions">
                {starters.map((question) => (
                  <button key={question} type="button" className="chat-starter" onClick={() => send(question)}>
                    {question}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form className="chat-input" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Dan a question…"
              aria-label="Message"
              maxLength={1000}
            />
            <button type="submit" className="button button-small" disabled={sending || !draft.trim()}>
              Send
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="chat-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? '×' : <Bulldog size={52} />}
      </button>
    </div>
  )
}
