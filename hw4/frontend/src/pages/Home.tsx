import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts, type Product } from '../api'
import Bulldog from '../components/Bulldog'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts()
      .then((products) => setFeatured(products.filter((p) => p.total_stock > 0).slice(0, 4)))
      .catch(() => setFeatured([]))
  }, [])

  return (
    <>
      <section className="hero">
        <Bulldog size={140} className="hero-dog" />
        <p className="eyebrow eyebrow-light">New Haven, Connecticut</p>
        <h1>Wear Your Bulldog Pride</h1>
        <p className="hero-text">
          Apparel, merch, and souvenirs for Yale students, alumni, families, and fans.
        </p>
        <div className="hero-actions">
          <Link to="/products" className="button button-light">
            Shop All Products
          </Link>
          <Link to="/about" className="button button-outline-light">
            Our Story
          </Link>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <h2>Featured Gear</h2>
            <Link to="/products" className="text-link">
              View All →
            </Link>
          </div>
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="section values">
        <div>
          <h3>Family Owned</h3>
          <p>A local family business serving the Yale community.</p>
        </div>
        <div>
          <h3>Yale Proud</h3>
          <p>Years of working alongside Yale to bring you official-quality gear.</p>
        </div>
        <div>
          <h3>Connecticut Rooted</h3>
          <p>We started in Connecticut and we have stayed here ever since.</p>
        </div>
      </section>
    </>
  )
}
