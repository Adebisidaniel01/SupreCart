import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/storefront';
import { products, categories, brands } from '@/lib/catalog';

export const Route = createFileRoute('/shop')({
  validateSearch: (search: Record<string, unknown>) => ({ filter: typeof search.filter === 'string' ? search.filter : 'All' }),
  head: () => ({ meta: [{ title: 'Shop Shoes & Sneakers — CoreCart' }, { name: 'description', content: 'Shop the CoreCart collection of iconic sneakers. Browse by brand, category and style.' }, { property: 'og:title', content: 'Shop Shoes & Sneakers — CoreCart' }, { property: 'og:description', content: 'Find your next pair in the CoreCart footwear collection.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Shop,
});
function Shop() {
  const { filter } = Route.useSearch();
  const [sort, setSort] = useState('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const options = ['All', ...categories.map(c => c.name), ...brands];
  const visible = products.filter(p => filter === 'All' || ['Brands','Sale','Women','Kids'].includes(filter) || (filter === 'Men' && p.audience === "Men's Shoes") || p.category === filter || p.brand === filter).sort((a,b) => sort === 'low' ? a.price-b.price : sort === 'high' ? b.price-a.price : a.id-b.id);
  return <main className="page-width shop-main"><Link to="/" className="back-link"><ArrowLeft size={15} /> Home</Link><div className="shop-heading"><div><p className="eyebrow">THE CORECART COLLECTION</p><h1>{filter === 'All' ? 'All Shoes' : filter === 'Brands' ? 'Shop by Brand' : filter === 'Sale' ? 'Sale Collection' : filter}</h1></div><span>{visible.length} styles</span></div><div className="shop-toolbar"><Button variant="outline" onClick={() => setFiltersOpen(x => !x)}><SlidersHorizontal /> Filters</Button><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div>{(filtersOpen || filter === 'Brands') && <div className="filter-options">{options.map(x => <Button asChild key={x} variant={filter === x ? 'default' : 'outline'}><Link to="/shop" search={{ filter: x }}>{x}</Link></Button>)}</div>}{filter === 'Sale' && <p className="collection-note">Sale offers are coming soon. Explore our sample collection while we prepare for launch.</p>}{['Kids','Women'].includes(filter) && <p className="collection-note">A dedicated {filter.toLowerCase()} collection is coming soon. Browse our sample styles in the meantime.</p>}<div className="product-grid shop-products">{visible.map(p => <ProductCard key={p.id} product={p} />)}</div>{visible.length === 0 && <div className="collection-empty"><h2>New pairs are on their way.</h2><p>This collection is coming soon.</p><Button asChild><Link to="/shop" search={{ filter: 'All' }}>Browse all shoes</Link></Button></div>}</main>;
}