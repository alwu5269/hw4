import { Link } from 'react-router-dom'
import BoneDivider from '../components/BoneDivider'

const values = [
  {
    title: 'Family Owned',
    text: 'Campus Customs is run by our family, and every customer who walks through our door is treated like part of it.',
  },
  {
    title: 'Yale Proud',
    text: 'We have worked with Yale for many years, outfitting students, alumni, families, and fans with gear they are proud to wear.',
  },
  {
    title: 'Connecticut Rooted',
    text: 'Connecticut is our home. We opened in New Haven in 1975 and have stayed here for more than 50 years.',
  },
]

const offerings = [
  {
    title: 'Apparel',
    text: 'T-shirts, crewnecks, hoodies, quarter-zips, and jackets featuring Yale, its residential colleges, athletics, and graduate schools.',
  },
  {
    title: 'Merch',
    text: 'Everyday gear to show your Bulldog spirit on campus, at the game, or anywhere in between.',
  },
  {
    title: 'Souvenirs',
    text: 'Keepsakes for visitors, proud parents, and graduates to remember their time in New Haven.',
  },
]

export default function About() {
  return (
    <>
      <section className="about-hero">
        <p className="eyebrow eyebrow-light">Our Story</p>
        <h1>About Us</h1>
        <p className="hero-text">
          Family owned. <BoneDivider /> Yale proud. <BoneDivider /> Connecticut made.
        </p>
      </section>

      <section className="section narrow">
        <div className="about-copy">
          <p>
            Campus Customs is a family owned business offering apparel, merch, and souvenirs for
            the Yale community. Since opening on Broadway in 1975, we have proudly worked alongside
            Yale for decades, and for more than 50 years we have called Connecticut home.
          </p>
          <p>
            What started as a family business has grown alongside the Yale community. Over the
            years we have helped first-years find their first Yale sweatshirt, cheered with fans
            heading to The Game, and helped graduates and their families take a piece of New Haven
            home with them.
          </p>
        </div>
      </section>

      <section className="section values about-values">
        {values.map((value) => (
          <div key={value.title}>
            <h3>{value.title}</h3>
            <p>{value.text}</p>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="page-heading">
          <p className="eyebrow">What We Offer</p>
          <h2>Something for Every Bulldog</h2>
        </div>
        <div className="offer-grid">
          {offerings.map((offering) => (
            <div key={offering.title} className="offer-card">
              <h3>{offering.title}</h3>
              <p>{offering.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-cta">
        <h2>Find Your Next Favorite Piece</h2>
        <p>Browse our full collection of Yale apparel, merch, and souvenirs.</p>
        <Link to="/products" className="button">
          Shop All Products
        </Link>
      </section>
    </>
  )
}
