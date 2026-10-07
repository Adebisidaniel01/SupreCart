import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard, useStore } from '@/components/storefront';
import { products, categories, brands } from '@/lib/catalog';
import hero from '@/assets/hero-sneaker.jpg';
import sale from '@/assets/sale-sneakers.jpg';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'CoreCart — Step Into Greatness' }, { name: 'description', content: 'Discover iconic sneakers and branded shoes at CoreCart. Explore Nike, Adidas, New Balance, Vans and more.' }, { property: 'og:title', content: 'CoreCart — Step Into Greatness' }, { property: 'og:description', content: 'Iconic shoes. Everyday style. Find your next pair at CoreCart.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Index,
});
function Index() {
  const [slide, setSlide] = useState(0);
  const { openProduct } = useStore();
  const slides = ['Nike Air Jordan 1', 'Air Jordan 4 Retro', 'New Balance 530', 'Adidas Superstar'];
  const featuredProduct = products[[0, 2, 3, 1][slide] ?? 0] ?? products[0];
  if (!featuredProduct) return null;
  return <main className="page-width home-main">
    <section className={`hero hero-slide-${slide}`}>
      <img className="hero-image" src={slide === 0 ? hero : featuredProduct.image} alt={slides[slide]} width={1536} height={768} />
      <div className="hero-copy"><h1>Step Into<br />Greatness</h1><p>Discover authentic branded shoes<br />for every step of your journey.</p><div className="hero-actions"><Button size="lg" asChild><Link to="/shop" search={{ filter: 'All' }}>Shop Now <ArrowRight /></Link></Button><Button variant="outline" size="lg" asChild><a href="#brands">Explore Brands</a></Button></div></div>
      <div className="hero-feature"><Button variant="feature" onClick={() => openProduct(slide === 0 ? { ...featuredProduct, id: 6, name: 'Nike Air Jordan 1', price: 180, image: hero, category: 'Basketball' } : featuredProduct)}><span>New Arrivals</span><strong>{slides[slide]}</strong></Button><div className="slider-dots">{slides.map((label, i) => <Button key={label} variant="dot" className={slide === i ? 'is-active' : ''} aria-label={`Show ${label}`} aria-pressed={slide === i} onClick={() => setSlide(i)} />)}</div></div>
    </section>
    <section className="brand-strip" id="brands"><h2>TOP BRANDS</h2>{brands.map((brand, i) => <Link className={`brand-logo brand-${i}`} key={brand} to="/shop" search={{ filter: brand }}>{brand === 'Nike' ? <><span>NIKE</span><svg viewBox="0 0 100 35" aria-hidden="true"><path d="M5 8C-6 38 19 32 31 26L98 1 30 15C14 23 9 20 5 8Z" /></svg></> : brand === 'Adidas' ? <><span className="adidas-mark"><i /><i /><i /></span><span>adidas</span></> : brand === 'Puma' ? <><span>PUMA</span><span className="puma-mark">↗</span></> : brand === 'New Balance' ? <><b>NB</b><small>new balance</small></> : brand === 'Converse' ? <><b>★❯</b><small>CONVERSE</small></> : <><b>VANS</b><small>“OFF THE WALL”</small></>}</Link>)}<Link className="view-all" to="/shop" search={{ filter: 'Brands' }}>View all</Link></section>
    <section className="category-section"><div className="section-heading"><h2>SHOP BY CATEGORY</h2></div><div className="category-grid">{categories.map(category => <Link key={category.name} to="/shop" search={{ filter: category.name }} className="category"><div><img src={category.image} alt={category.name} width={275} height={430} loading="lazy" /></div><span>{category.name}</span></Link>)}</div></section>
    <section className="bestsellers"><div className="section-heading"><h2>BEST SELLERS</h2><Link to="/shop" search={{ filter: 'All' }} className="view-all">View all</Link></div><div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product} />)}</div></section>
    <section className="sale-banner"><img src={sale} alt="Black running shoes splashing through water" width={1536} height={512} loading="lazy" /><div className="sale-copy"><span>LIMITED TIME ONLY</span><h2>Summer Sale</h2><p>Up to 40% off on selected items</p><Button variant="sale" size="lg" asChild><Link to="/shop" search={{ filter: 'Sale' }}>Shop the Sale <ArrowRight /></Link></Button></div><div className="sale-discount"><strong>40<span>%<b>OFF</b></span></strong></div></section>
  </main>;
}
