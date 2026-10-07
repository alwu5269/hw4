import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ProductCardData } from './api'

// Search results from the chat agent, shared between the chat widget (which sets them)
// and the Products page (which shows them as a grid).
export interface ChatResults {
  query: string
  products: ProductCardData[]
}

interface ChatResultsContextValue {
  results: ChatResults | null
  setResults: (results: ChatResults | null) => void
}

const ChatResultsContext = createContext<ChatResultsContextValue | null>(null)

export function ChatResultsProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<ChatResults | null>(null)
  return <ChatResultsContext.Provider value={{ results, setResults }}>{children}</ChatResultsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChatResults() {
  const ctx = useContext(ChatResultsContext)
  if (!ctx) throw new Error('useChatResults must be used inside ChatResultsProvider')
  return ctx
}
