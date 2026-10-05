import { Link } from 'react-router-dom'
import { formatPrice, type ProductCardData } from '../api'

// Works for catalogue products and for the lighter product cards returned by the chat agent.
export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link to={`/products/${product.product_id}`} className="product-card">
      <div className="product-card-image">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        {product.total_stock === 0 && <span className="badge">Sold Out</span>}
        {product.total_stock > 0 && product.total_stock <= 10 && <span className="badge badge-low">Almost Gone!</span>}
      </div>
      <div className="product-card-body">
        <p className="eyebrow">{product.garment_type}</p>
        <h3>{product.name}</h3>
        {product.description && <p className="product-card-description">{product.description}</p>}
        <div className="product-card-footer">
          <p className="price">{formatPrice(product.price)}</p>
          <span className="stock-note">{product.total_stock > 0 ? `${product.total_stock} in stock` : 'Sold out'}</span>
        </div>
      </div>
    </Link>
  )
}
