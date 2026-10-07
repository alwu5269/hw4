import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchProducts, type Product } from '../api'
import { useChatResults } from '../chatResults'
import Bulldog from '../components/Bulldog'
import ProductCard from '../components/ProductCard'

const PAGE_SIZE = 20

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  // Page number lives in the URL (?page=2) so Back from a product returns to the same page.
  const [searchParams, setSearchParams] = useSearchParams()
  const { results: chatResults, setResults: setChatResults } = useChatResults()

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      [p.name, p.garment_type, ...p.search_tags].some((text) => text.toLowerCase().includes(q)),
    )
  }, [products, query])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(searchParams.get('page')) || 1), pageCount)
  const start = (page - 1) * PAGE_SIZE
  const pageItems = visible.slice(start, start + PAGE_SIZE)

  function goToPage(next: number) {
    setSearchParams(next === 1 ? {} : { page: String(next) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSearch(value: string) {
    setQuery(value)
    if (page !== 1) setSearchParams({})
  }

  return (
    <section className="section">
      <div className="page-heading page-heading-dog">
        <Bulldog size={84} />
        <div>
          <p className="eyebrow">Shop</p>
          <h1>All Products</h1>
          <p className="subtitle">Handpicked by our favorite bulldog. Woof!</p>
        </div>
      </div>
      {chatResults && (
        <section className="chat-results" aria-live="polite">
          <div className="chat-results-heading">
            <Bulldog size={56} />
            <div>
              <p className="eyebrow">From your chat with Dan</p>
              <h2>
                {chatResults.products.length} {chatResults.products.length === 1 ? 'result' : 'results'} for “{chatResults.query}”
              </h2>
            </div>
            <button type="button" className="button button-small chat-results-clear" onClick={() => setChatResults(null)}>
              Clear
            </button>
          </div>
          <div className="product-grid">
            {chatResults.products.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </section>
      )}
      {chatResults && <h2 className="all-products-heading">Browse everything</h2>}
      <input
        className="search"
        type="search"
        placeholder="Search products…"
        value={query}
        onChange={(event) => handleSearch(event.target.value)}
        aria-label="Search products"
      />
      {loading && <p className="status">Loading products…</p>}
      {error && <p className="status error">Could not load products: {error}</p>}
      {!loading && !error && (
        <>
          <p className="status">
            {visible.length > 0
              ? `Showing ${start + 1}–${start + pageItems.length} of ${visible.length} products`
              : '0 products'}
          </p>
          {visible.length === 0 && (
            <div className="empty">
              <Bulldog size={96} />
              <p>Ruh-roh! No products match “{query}”.</p>
            </div>
          )}
          <div className="product-grid">
            {pageItems.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
          {pageCount > 1 && (
            <nav className="pagination" aria-label="Product pages">
              <button type="button" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                ← Prev
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === page ? 'active' : ''}
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => goToPage(n)}
                >
                  {n}
                </button>
              ))}
              <button type="button" disabled={page === pageCount} onClick={() => goToPage(page + 1)}>
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}
