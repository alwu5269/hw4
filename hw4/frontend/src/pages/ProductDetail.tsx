import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct, formatPrice, type Product } from '../api'
import AddToCartButton from '../components/AddToCartButton'
import { dressDan } from '../danEvents'

const LOW_STOCK = 5

export default function ProductDetail() {
  const { productId = '' } = useParams()
  // Keying by id resets all state when navigating between products.
  return <ProductDetailView key={productId} productId={productId} />
}

function ProductDetailView({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  useEffect(() => {
    fetchProduct(productId)
      .then(setProduct)
      .catch((err: Error) => setError(err.message))
  }, [productId])

  if (error) {
    return (
      <section className="section">
        <p className="status error">Could not load this product: {error}</p>
        <Link to="/products" className="text-link">← Back to Products</Link>
      </section>
    )
  }
  if (!product) return <section className="section"><p className="status">Loading…</p></section>

  const inventory = product.inventory ?? []
  const selected = inventory.find((s) => s.size === selectedSize)

  return (
    <section className="section">
      <Link to="/products" className="text-link">← Back to Products</Link>
      <div className="product-detail">
        <div className="product-detail-image">
          <img src={product.image_url} alt={product.name} />
          <div className="dress-dan-hint">
            <span>Dress Handsome Dan in this!</span>
            <button
              type="button"
              className="text-link dress-dan-button"
              onClick={() => dressDan({ product_id: product.product_id, name: product.name, image_url: product.image_url })}
            >
              Put it on Dan
            </button>
          </div>
        </div>
        <div className="product-detail-info">
          <p className="eyebrow">{product.garment_type}</p>
          <h1>{product.name}</h1>
          <p className="price price-large">{formatPrice(product.price)}</p>
          <p className="description">{product.description}</p>

          {product.colors.length > 0 && (
            <p className="detail-row">
              <span className="label">Colors</span> {product.colors.join(', ')}
            </p>
          )}

          <div className="detail-block">
            <span className="label">Sizes</span>
            <div className="size-grid">
              {inventory.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  className={`size-option${s.size === selectedSize ? ' selected' : ''}`}
                  disabled={s.quantity === 0}
                  onClick={() => setSelectedSize(s.size)}
                >
                  {s.size}
                </button>
              ))}
            </div>
          </div>

          <p className="stock">
            {selected
              ? stockMessage(selected.quantity, selected.size)
              : product.total_stock > 0
                ? `${product.total_stock} in stock across all sizes. Select a size to check availability.`
                : 'Sold out in all sizes.'}
          </p>

          <AddToCartButton
            disabled={!selected || selected.quantity === 0}
            label={product.total_stock === 0 ? 'Sold Out' : !selected ? 'Select a Size' : undefined}
          />

          <table className="stock-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>In Stock</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((s) => (
                <tr key={s.size}>
                  <td>{s.size}</td>
                  <td>{s.quantity === 0 ? 'Sold out' : s.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function stockMessage(quantity: number, size: string) {
  if (quantity === 0) return `Size ${size} is sold out.`
  if (quantity <= LOW_STOCK) return `Only ${quantity} left in size ${size}!`
  return `${quantity} in stock in size ${size}.`
}
