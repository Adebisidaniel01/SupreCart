import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { ArrowRight, Heart, Search, ShoppingCart, UserRound, X, Minus, Plus, Truck, RotateCcw, BadgeCheck, ShoppingBag, Menu, Star, Instagram, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { products, money, type Product } from '@/lib/catalog';

type CartItem = { product: Product; size: string; quantity: number };
type Store = { favorites: number[]; toggleFavorite: (id: number) => void; openProduct: (p: Product) => void; openPanel: (panel: string) => void };
const StoreContext = createContext<Store | null>(null);
export function useStore() { const store = useContext(StoreContext); if (!store) throw new Error('Store provider required'); return store; }
export function Wordmark() { return <span className="wordmark">Core<span>Cart</span></span>; }

export function Storefront({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [panel, setPanel] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState('');
  const [query, setQuery] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [email, setEmail] = useState('');
  const [newsletterNote, setNewsletterNote] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });
  const openProduct = (p: Product) => { setSelected(p); setSize(''); setNotice(''); setPanel('product'); };
  const toggleFavorite = (id: number) => setFavorites(items => items.includes(id) ? items.filter(x => x !== id) : [...items, id]);
  const openPanel = (name: string) => { setNotice(''); setPanel(name); };
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const info: Record<string, string> = {
    'Contact Us': 'Customer care details are coming soon. Please check back for our contact email and opening hours.',
    'Shipping Info': 'The template offers free shipping on orders over $100. Delivery destinations and times will be confirmed before the store opens.',
    'Returns & Exchanges': 'The template includes 30-day returns. Full return conditions will be available before checkout opens.',
    FAQ: 'CoreCart is preparing its first collection. Online checkout and delivery information are coming soon.',
    'Size Guide': 'The shoe sizes shown are US sizes. Fit varies by brand; check the brand’s size chart before ordering.',
    'About Us': 'CoreCart brings iconic footwear and everyday style together in one place.',
    Careers: 'There are no open positions listed at the moment.',
    Sustainability: 'Our product sourcing and sustainability information will be available when the store launches.',
    Blog: 'Stories from the world of sneakers are coming soon.',
    'Store Locator': 'CoreCart is an online storefront. No physical locations are currently listed.',
    'Terms & Conditions': 'This is the first CoreCart storefront preview. Products and prices are sample content; orders cannot yet be placed.',
    'Privacy Policy': 'This preview does not submit your email or payment details. A full privacy policy will be provided before customer accounts and checkout are enabled.',
    'Social channels': 'CoreCart social channels are coming soon.',
  };
  return <StoreContext.Provider value={{ favorites, toggleFavorite, openProduct, openPanel }}>
    <div className="announcement"><ShoppingBag size={11} /><span>Free shipping on all orders over $100</span><span className="announcement-divider">|</span><span>Easy 30-day returns</span></div>
    <header className="header page-width">
      <Link to="/" aria-label="CoreCart home"><Wordmark /></Link>
      <nav className={mobileNav ? 'main-nav mobile-open' : 'main-nav'} aria-label="Main navigation">
        {['Home', 'Shop', 'Men', 'Women', 'Kids', 'Brands', 'Sale'].map(item => item === 'Home' ? <Link key={item} to="/" onClick={() => setMobileNav(false)} className={path === '/' ? 'nav-active' : ''}>Home</Link> : <Link key={item} to="/shop" search={{ filter: item === 'Shop' ? 'All' : item }} onClick={() => setMobileNav(false)} className={`${item === 'Sale' ? 'sale-link' : ''} ${path === '/shop' && item === 'Shop' ? 'nav-active' : ''}`}>{item}</Link>)}
      </nav>
      <div className="header-tools">
        <Button variant="ghost" size="icon" title="Search" aria-label="Search" onClick={() => openPanel('search')}><Search /></Button>
        <Button variant="ghost" size="icon" title="Wishlist" aria-label="Wishlist" onClick={() => openPanel('wishlist')} className="count-control"><Heart />{favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}</Button>
        <Button variant="ghost" size="icon" title="Shopping bag" aria-label="Shopping bag" onClick={() => openPanel('cart')} className="count-control"><ShoppingCart />{cartCount > 0 && <span className="count-badge">{cartCount}</span>}</Button>
        <Button variant="ghost" size="icon" title="Account" aria-label="Account" onClick={() => openPanel('account')}><UserRound /></Button>
        <Button variant="ghost" size="icon" aria-label="Toggle menu" className="menu-button" onClick={() => setMobileNav(x => !x)}><Menu /></Button>
      </div>
    </header>
    {children}
    <section className="benefits page-width">
      {[[Truck, 'Free Shipping', 'On orders over $100'], [RotateCcw, '30-Day Returns', 'Hassle-free returns'], [BadgeCheck, '100% Authentic', 'Genuine branded products'], [ShoppingBag, 'Secure Payments', 'Safe & encrypted checkout']].map(([Icon, title, text]) => { const BenefitIcon = Icon as typeof Truck; return <div className="benefit" key={String(title)}><BenefitIcon strokeWidth={1.5} /><div><strong>{String(title)}</strong><p>{String(text)}</p></div></div>; })}
    </section>
    <footer className="footer">
      <div className="footer-main page-width">
        <div className="footer-about"><Link to="/"><Wordmark /></Link><p>Your destination for authentic branded shoes. Quality, style, and comfort — all in one place.</p><div className="socials"><Button variant="ghost" size="icon" aria-label="Instagram" onClick={() => openPanel('Social channels')}><Instagram /></Button><Button variant="ghost" size="icon" aria-label="Facebook" onClick={() => openPanel('Social channels')}><Facebook /></Button><Button variant="ghost" size="icon" aria-label="X" onClick={() => openPanel('Social channels')}><span className="social-letter">𝕏</span></Button><Button variant="ghost" size="icon" aria-label="TikTok" onClick={() => openPanel('Social channels')}><span className="social-letter">♪</span></Button></div></div>
        <div className="footer-column"><h3>SHOP</h3>{['All Shoes', 'Men', 'Women', 'Kids', 'Sale'].map(x => <Link key={x} to="/shop" search={{ filter: x === 'All Shoes' ? 'All' : x }}>{x}</Link>)}</div>
        <div className="footer-column"><h3>CUSTOMER CARE</h3>{['Contact Us', 'Shipping Info', 'Returns & Exchanges', 'FAQ', 'Size Guide'].map(x => <Button key={x} variant="link" onClick={() => openPanel(x)}>{x}</Button>)}</div>
        <div className="footer-column"><h3>COMPANY</h3>{['About Us', 'Careers', 'Sustainability', 'Blog', 'Store Locator'].map(x => <Button key={x} variant="link" onClick={() => openPanel(x)}>{x}</Button>)}</div>
        <div className="newsletter"><h3>NEWSLETTER</h3><p>Get updates on new arrivals,<br />exclusive offers and more.</p><form onSubmit={e => { e.preventDefault(); setNewsletterNote('Subscriptions are coming soon. Your email has not been submitted.'); }}><input type="email" required placeholder="Enter your email" aria-label="Newsletter email" value={email} onChange={e => setEmail(e.target.value)} /><Button variant="ghost" size="icon" aria-label="Subscribe to newsletter"><ArrowRight /></Button></form>{newsletterNote && <p role="status" className="newsletter-note">{newsletterNote}</p>}</div>
      </div>
      <div className="footer-bottom page-width"><p>© 2026 CoreCart. All Rights Reserved.</p><div><Button variant="link" onClick={() => openPanel('Terms & Conditions')}>Terms & Conditions</Button><Button variant="link" onClick={() => openPanel('Privacy Policy')}>Privacy Policy</Button></div></div>
    </footer>
    <Dialog open={!!panel} onOpenChange={open => { if (!open) setPanel(''); }}><DialogContent className="store-dialog"><DialogTitle>{panel === 'product' ? selected?.name : panel === 'cart' ? `Shopping bag (${cartCount})` : panel === 'wishlist' ? 'Your wishlist' : panel === 'search' ? 'Find your next pair' : panel === 'account' ? 'Your CoreCart account' : panel}</DialogTitle><DialogDescription>{panel === 'product' ? selected?.audience : panel === 'cart' ? 'Your selected pairs.' : panel === 'wishlist' ? 'The pairs you have your eye on.' : panel === 'search' ? 'Search shoes and brands.' : 'CoreCart'}</DialogDescription>
      {panel === 'product' && selected && <div className="product-detail"><img src={selected.image} alt={selected.name} width={384} height={430} /><div className="detail-price"><strong>{money(selected.price)}</strong><span><Star size={13} fill="currentColor" /> {selected.rating} ({selected.reviews})</span></div><label>Select size (US)</label><div className="sizes">{['6','7','8','9','10','11','12'].map(s => <Button key={s} variant={size === s ? 'default' : 'outline'} onClick={() => setSize(s)}>{s}</Button>)}</div><Button size="lg" className="w-full" disabled={!size} onClick={() => { setCart(items => { const exists = items.find(x => x.product.id === selected.id && x.size === size); return exists ? items.map(x => x === exists ? { ...x, quantity: x.quantity + 1 } : x) : [...items, { product: selected, size, quantity: 1 }]; }); setPanel('cart'); }}><ShoppingBag /> Add to bag</Button><p className="sample-note">Sample catalog. Online checkout is coming soon.</p></div>}
      {panel === 'cart' && <div className="cart-content">{cart.length === 0 ? <div className="empty-state"><ShoppingBag /><p>Your bag is waiting for its first pair.</p><Button onClick={() => { setPanel(''); navigate({ to: '/shop', search: { filter: 'All' } }); }}>Shop shoes <ArrowRight /></Button></div> : <>{cart.map(item => <div className="cart-item" key={`${item.product.id}-${item.size}`}><img src={item.product.image} alt={item.product.name} width={80} height={80} /><div><strong>{item.product.name}</strong><p>US {item.size} · {money(item.product.price)}</p><div className="quantity"><Button variant="outline" size="icon" aria-label={`Decrease ${item.product.name} quantity`} onClick={() => setCart(items => items.map(x => x === item ? { ...x, quantity: x.quantity - 1 } : x).filter(x => x.quantity > 0))}><Minus /></Button><span>{item.quantity}</span><Button variant="outline" size="icon" aria-label={`Increase ${item.product.name} quantity`} onClick={() => setCart(items => items.map(x => x === item ? { ...x, quantity: x.quantity + 1 } : x))}><Plus /></Button></div></div><Button variant="ghost" size="icon" aria-label={`Remove ${item.product.name}`} onClick={() => setCart(items => items.filter(x => x !== item))}><X /></Button></div>)}<div className="cart-total"><span>Subtotal</span><strong>{money(cart.reduce((sum, x) => sum + x.product.price * x.quantity, 0))}</strong></div><Button size="lg" className="w-full" onClick={() => setNotice('Checkout is not connected yet. No order or payment has been made.')}>Continue to checkout <ArrowRight /></Button><p className="sample-note">Sample catalog · No payments are collected.</p></>}{notice && <p role="status" className="sample-note">{notice}</p>}</div>}
      {panel === 'search' && <div><div className="search-field"><Search size={19} /><input autoFocus aria-label="Search shoes" placeholder="Try Nike, running, or Superstar..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="search-results">{products.filter(p => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(query.toLowerCase())).map(p => <Button variant="ghost" className="search-result" key={p.id} onClick={() => openProduct(p)}><img src={p.image} width={65} height={65} alt="" /><span>{p.name}</span><strong>{money(p.price)}</strong></Button>)}{products.every(p => !`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(query.toLowerCase())) && <p className="empty-state">No shoes found. Try another search.</p>}</div></div>}
      {panel === 'wishlist' && <div className="search-results">{favorites.length ? products.filter(p => favorites.includes(p.id)).map(p => <div className="wish-row" key={p.id}><Button variant="ghost" className="search-result" onClick={() => openProduct(p)}><img src={p.image} width={65} height={65} alt="" /><span>{p.name}</span><strong>{money(p.price)}</strong></Button><Button variant="ghost" size="icon" aria-label={`Remove ${p.name} from wishlist`} onClick={() => toggleFavorite(p.id)}><X /></Button></div>) : <div className="empty-state"><Heart /><p>No favorites yet. Find a pair you love.</p></div>}</div>}
      {panel === 'account' && <div className="empty-state"><UserRound /><p>Customer accounts are coming soon.</p><p className="sample-note">You can browse the collection and build your bag without an account.</p><Button onClick={() => { setPanel(''); navigate({ to: '/shop', search: { filter: 'All' } }); }}>Explore shoes <ArrowRight /></Button></div>}
      {info[panel] && <p className="info-copy">{info[panel]}</p>}
    </DialogContent></Dialog>
  </StoreContext.Provider>;
}

export function ProductCard({ product }: { product: Product }) {
  const { favorites, toggleFavorite, openProduct } = useStore();
  const saved = favorites.includes(product.id);
  return <article className="product-card"><div className="product-photo"><Button variant="ghost" className="product-image-button" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}><img src={product.image} alt={product.name} width={384} height={430} loading="lazy" /></Button><Button variant="ghost" size="icon" className={saved ? 'favorite-control is-saved' : 'favorite-control'} title={saved ? 'Remove from wishlist' : 'Save to wishlist'} aria-label={`${saved ? 'Unsave' : 'Save'} ${product.name}`} aria-pressed={saved} onClick={() => toggleFavorite(product.id)}><Heart fill={saved ? 'currentColor' : 'none'} /></Button></div><Button variant="link" className="product-name" onClick={() => openProduct(product)}>{product.name}</Button><p className="product-audience">{product.audience}</p><div className="product-bottom"><strong>{money(product.price)}</strong><span><Star size={11} fill="currentColor" />{product.rating} <small>({product.reviews})</small></span></div></article>;
}