import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Facebook,
  Heart,
  Instagram,
  Linkedin,
  Menu,
  Minus,
  Music2,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Star,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { products, money, type Product } from "@/lib/catalog";

type CartItem = { product: Product; size: string; quantity: number };
type Store = {
  favorites: number[];
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  toggleFavorite: (id: number) => void;
  openProduct: (product: Product) => void;
  addQuickToCart: (product: Product) => void;
  openPanel: (panel: string) => void;
};
const StoreContext = createContext<Store | null>(null);
export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Store provider required");
  return store;
}
export function Wordmark() {
  return (
    <span className="wordmark">
      Core<span>Cart</span>
    </span>
  );
}

export function Storefront({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [email, setEmail] = useState("");
  const [newsletterNote, setNewsletterNote] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const hasSizes = selected?.category === "Footwear";
  const openProduct = useCallback((product: Product) => {
    setSelected(product);
    setSize(product.category === "Footwear" ? "" : "One size");
    setQuantity(1);
    setNotice("");
    setPanel("product");
  }, []);
  const toggleFavorite = useCallback(
    (id: number) =>
      setFavorites((items) =>
        items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
      ),
    [],
  );
  const openPanel = useCallback((name: string) => {
    setNotice("");
    setPanel(name);
  }, []);
  const addQuickToCart = useCallback(
    (product: Product) => {
      if (product.category === "Footwear") {
        openProduct(product);
        return;
      }
      setCart((items) => {
        const existing = items.find(
          (item) => item.product.id === product.id && item.size === "One size",
        );
        return existing
          ? items.map((item) =>
              item === existing ? { ...item, quantity: item.quantity + 1 } : item,
            )
          : [...items, { product, size: "One size", quantity: 1 }];
      });
      setNotice(`${product.name} added to your bag.`);
      setPanel("cart");
    },
    [openProduct],
  );

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("corecart-cart");
      const savedFavorites = localStorage.getItem("corecart-favorites");
      if (savedCart) setCart(JSON.parse(savedCart) as CartItem[]);
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites) as number[]);
    } catch (error) {
      console.error("Could not restore the saved CoreCart preview basket.", error);
      setNotice("Your saved basket could not be restored in this browser.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("corecart-cart", JSON.stringify(cart));
      localStorage.setItem("corecart-favorites", JSON.stringify(favorites));
    } catch (error) {
      console.error("Could not save the CoreCart preview basket in this browser.", error);
      setNotice("Your browser could not save this basket. Keep this tab open to preserve it.");
    }
  }, [cart, favorites, ready]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const store = useMemo(
    () => ({
      favorites,
      cart,
      cartCount,
      cartSubtotal,
      setCart,
      toggleFavorite,
      openProduct,
      addQuickToCart,
      openPanel,
    }),
    [
      favorites,
      cart,
      cartCount,
      cartSubtotal,
      toggleFavorite,
      openProduct,
      addQuickToCart,
      openPanel,
    ],
  );
  const navItems = [
    { label: "Home", to: "/" as const },
    { label: "Shop", to: "/shop" as const, filter: "All" },
    { label: "Clothing", to: "/shop" as const, filter: "Clothing" },
    { label: "Footwear", to: "/shop" as const, filter: "Footwear" },
    { label: "Home & living", to: "/shop" as const, filter: "Home" },
    { label: "More", to: "/shop" as const, filter: "All" },
  ] as const;

  function addToCart() {
    if (!selected || !size) return;
    setCart((items) => {
      const existing = items.find((item) => item.product.id === selected.id && item.size === size);
      return existing
        ? items.map((item) =>
            item === existing ? { ...item, quantity: item.quantity + quantity } : item,
          )
        : [...items, { product: selected, size, quantity }];
    });
    setPanel("cart");
  }

  return (
    <StoreContext.Provider value={store}>
      <div className="announcement">
        <ShoppingBag size={12} />
        <span>Good finds from independent sellers</span>
        <span className="announcement-divider">·</span>
        <span>A marketplace with more to love</span>
      </div>
      <header className="header page-width">
        <Link to="/" aria-label="CoreCart home">
          <Wordmark />
        </Link>
        <nav
          className={mobileNav ? "main-nav mobile-open" : "main-nav"}
          aria-label="Main navigation"
        >
          {navItems.map((item) =>
            item.to === "/" ? (
              <Link
                key={item.label}
                to="/"
                onClick={() => setMobileNav(false)}
                className={path === "/" ? "nav-active" : ""}
              >
                {item.label}
              </Link>
            ) : (
              <Link
                key={item.label}
                to="/shop"
                search={{ filter: item.filter }}
                onClick={() => setMobileNav(false)}
                className={path === "/shop" && item.filter === "All" ? "nav-active" : ""}
              >
                {item.label}
              </Link>
            ),
          )}
          <Link to="/careers" onClick={() => setMobileNav(false)}>
            Careers
          </Link>
        </nav>
        <div className="header-tools">
          <Button
            variant="ghost"
            size="icon"
            title="Search"
            aria-label="Search"
            onClick={() => openPanel("search")}
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Wishlist"
            aria-label="Wishlist"
            onClick={() => openPanel("wishlist")}
            className="count-control"
          >
            <Heart />
            {favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Shopping bag"
            aria-label="Shopping bag"
            onClick={() => openPanel("cart")}
            className="count-control"
          >
            <ShoppingCart />
            {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
          </Button>
          <Button variant="ghost" size="icon" title="Account" aria-label="Account" asChild>
            <Link to="/login">
              <UserRound />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle menu"
            className="menu-button"
            onClick={() => setMobileNav((value) => !value)}
          >
            <Menu />
          </Button>
        </div>
      </header>
      {children}
      <section className="benefits page-width">
        {[
          [Truck, "Independent sellers", "One marketplace, many makers"],
          [BadgeCheck, "Seller ratings", "Shop with useful context"],
          [ShoppingBag, "Easy to explore", "Good finds, all in one place"],
          [Heart, "Save your finds", "Keep a wishlist for later"],
        ].map(([Icon, title, text]) => {
          const BenefitIcon = Icon as typeof Truck;
          return (
            <div className="benefit" key={String(title)}>
              <BenefitIcon strokeWidth={1.5} />
              <div>
                <strong>{String(title)}</strong>
                <p>{String(text)}</p>
              </div>
            </div>
          );
        })}
      </section>
      <footer className="footer">
        <div className="footer-main page-width">
          <div className="footer-about">
            <Link to="/" aria-label="CoreCart home">
              <Wordmark />
            </Link>
            <p>
              A little bit of everything, from sellers worth knowing. Find your kind of good at
              CoreCart.
            </p>
            <div className="socials">
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">
                <span className="social-letter">𝕏</span>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <Instagram />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <Linkedin />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
                <Music2 />
              </a>
            </div>
          </div>
          <div className="footer-column">
            <h3>DISCOVER</h3>
            {["All finds", "Clothing", "Footwear", "Home", "Electronics", "Beauty"].map(
              (label, index) => (
                <Link key={label} to="/shop" search={{ filter: index === 0 ? "All" : label }}>
                  {label}
                </Link>
              ),
            )}
          </div>
          <div className="footer-column">
            <h3>HELP & SUPPORT</h3>
            {(
              [
                ["Contact us", "contact"],
                ["Shipping", "shipping"],
                ["Returns", "returns"],
                ["FAQs", "faq"],
                ["Size guide", "size"],
              ] as const
            ).map(([label, slug]) => (
              <Link key={slug} to="/info/$slug" params={{ slug }}>
                {label}
              </Link>
            ))}
          </div>
          <div className="footer-column">
            <h3>ABOUT CORECART</h3>
            {(
              [
                ["Our story", "about"],
                ["Careers", "careers"],
                ["Privacy", "privacy"],
                ["Terms", "terms"],
              ] as const
            ).map(([label, slug]) =>
              slug === "careers" ? (
                <Link key={slug} to="/careers">
                  {label}
                </Link>
              ) : (
                <Link key={slug} to="/info/$slug" params={{ slug }}>
                  {label}
                </Link>
              ),
            )}
          </div>
          <div className="newsletter">
            <h3>A NOTE FROM US</h3>
            <p>New finds and marketplace news, when we’re ready.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setNewsletterNote(
                  "Thanks for your interest. Newsletter signups are not connected yet, so your email was not submitted.",
                );
              }}
            >
              <input
                type="email"
                required
                placeholder="Your email address"
                aria-label="Newsletter email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button variant="ghost" size="icon" aria-label="Sign up for newsletter">
                <ArrowRight />
              </Button>
            </form>
            {newsletterNote && (
              <p role="status" className="newsletter-note">
                {newsletterNote}
              </p>
            )}
          </div>
        </div>
        <div className="footer-bottom page-width">
          <p>
            © 2026 CoreCart. All rights reserved.{" "}
            <span>
              For more inquiries, contact <a href="tel:080800800800">080-800800800</a>.
            </span>
          </p>
          <div>
            <Link to="/info/$slug" params={{ slug: "terms" }}>
              Terms & conditions
            </Link>
            <Link to="/info/$slug" params={{ slug: "privacy" }}>
              Privacy policy
            </Link>
          </div>
        </div>
      </footer>
      <Dialog
        open={!!panel}
        onOpenChange={(open) => {
          if (!open) setPanel("");
        }}
      >
        <DialogContent className="store-dialog">
          <DialogTitle>
            {panel === "product"
              ? selected?.name
              : panel === "cart"
                ? `Your bag (${cartCount})`
                : panel === "wishlist"
                  ? "Saved for later"
                  : "Search the marketplace"}
          </DialogTitle>
          <DialogDescription>
            {panel === "product"
              ? `${selected?.category} · Sold by ${selected?.seller}`
              : panel === "cart"
                ? "Items from your favourite independent sellers."
                : panel === "wishlist"
                  ? "Good finds to come back to."
                  : "Find something across the marketplace."}
          </DialogDescription>
          {panel === "product" && selected && (
            <div className="product-detail">
              <img src={selected.image} alt={selected.name} width={384} height={430} />
              <div className="detail-price">
                <strong>{money(selected.price)}</strong>
                <span>
                  <Star size={13} fill="currentColor" /> {selected.rating} ({selected.reviews})
                </span>
              </div>
              <div className="seller-detail">
                <span>
                  Sold by <strong>{selected.seller}</strong>
                </span>
                <span>
                  <Star size={13} fill="currentColor" /> {selected.sellerRating} seller rating
                </span>
              </div>
              {hasSizes && (
                <>
                  <label>Select size</label>
                  <div className="sizes">
                    {["6", "7", "8", "9", "10", "11", "12"].map((item) => (
                      <Button
                        key={item}
                        variant={size === item ? "default" : "outline"}
                        onClick={() => setSize(item)}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </>
              )}
              <label>Quantity</label>
              <div className="quantity product-quantity">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Minus />
                </Button>
                <span>{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  <Plus />
                </Button>
              </div>
              <Button size="lg" className="w-full" disabled={!size} onClick={addToCart}>
                <ShoppingBag /> Add to bag · {money(selected.price * quantity)}
              </Button>
              <p className="sample-note">
                Preview catalogue. Orders and payments are not processed.
              </p>
            </div>
          )}
          {panel === "cart" && (
            <div className="cart-content">
              {notice && (
                <p role="status" className="cart-confirmation">
                  {notice}
                </p>
              )}
              {cart.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag />
                  <p>Your bag is waiting for its first good find.</p>
                  <Button
                    onClick={() => {
                      setPanel("");
                      navigate({ to: "/shop", search: { filter: "All" } });
                    }}
                  >
                    Explore the marketplace <ArrowRight />
                  </Button>
                </div>
              ) : (
                <>
                  {cart.map((item) => (
                    <div className="cart-item" key={`${item.product.id}-${item.size}`}>
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        width={80}
                        height={80}
                      />
                      <div className="cart-item-copy">
                        <strong>{item.product.name}</strong>
                        <p>
                          {item.product.seller} ·{" "}
                          {item.size !== "One size" ? `Size ${item.size} · ` : ""}
                          {money(item.product.price)}
                        </p>
                        <div className="quantity">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Decrease ${item.product.name} quantity`}
                            onClick={() =>
                              setCart((items) =>
                                items
                                  .map((entry) =>
                                    entry === item
                                      ? { ...entry, quantity: entry.quantity - 1 }
                                      : entry,
                                  )
                                  .filter((entry) => entry.quantity > 0),
                              )
                            }
                          >
                            <Minus />
                          </Button>
                          <span>{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Increase ${item.product.name} quantity`}
                            onClick={() =>
                              setCart((items) =>
                                items.map((entry) =>
                                  entry === item
                                    ? { ...entry, quantity: entry.quantity + 1 }
                                    : entry,
                                ),
                              )
                            }
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                      <div className="cart-item-end">
                        <strong>{money(item.product.price * item.quantity)}</strong>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${item.product.name}`}
                          onClick={() =>
                            setCart((items) => items.filter((entry) => entry !== item))
                          }
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="cart-total">
                    <span>Subtotal</span>
                    <strong>{money(cartSubtotal)}</strong>
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setPanel("");
                      navigate({ to: "/checkout" });
                    }}
                  >
                    Continue to checkout <ArrowRight />
                  </Button>
                  <p className="sample-note">Checkout preview only · No payments are collected.</p>
                </>
              )}
              {notice && (
                <p role="status" className="sample-note">
                  {notice}
                </p>
              )}
            </div>
          )}
          {panel === "search" && (
            <div>
              <div className="search-field">
                <Search size={19} />
                <input
                  autoFocus
                  aria-label="Search the marketplace"
                  placeholder="Try footwear, home, or headphones..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="search-results">
                {products
                  .filter((product) =>
                    `${product.name} ${product.brand} ${product.category} ${product.seller}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((product) => (
                    <Button
                      variant="ghost"
                      className="search-result"
                      key={product.id}
                      onClick={() => openProduct(product)}
                    >
                      <img src={product.image} width={65} height={65} alt="" />
                      <span>
                        {product.name}
                        <small>{product.seller}</small>
                      </span>
                      <strong>{money(product.price)}</strong>
                    </Button>
                  ))}
              </div>
            </div>
          )}
          {panel === "wishlist" && (
            <div className="search-results">
              {favorites.length ? (
                products
                  .filter((product) => favorites.includes(product.id))
                  .map((product) => (
                    <div className="wish-row" key={product.id}>
                      <Button
                        variant="ghost"
                        className="search-result"
                        onClick={() => openProduct(product)}
                      >
                        <img src={product.image} width={65} height={65} alt="" />
                        <span>
                          {product.name}
                          <small>{product.seller}</small>
                        </span>
                        <strong>{money(product.price)}</strong>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${product.name} from wishlist`}
                        onClick={() => toggleFavorite(product.id)}
                      >
                        <X />
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="empty-state">
                  <Heart />
                  <p>Your saved finds will show up here.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StoreContext.Provider>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { favorites, toggleFavorite, openProduct, addQuickToCart } = useStore();
  const saved = favorites.includes(product.id);
  return (
    <article
      className={`product-card product-card--${product.category.toLowerCase().replaceAll(" ", "-")}`}
    >
      <div className="product-photo">
        <Button
          variant="ghost"
          className="product-image-button"
          onClick={() => openProduct(product)}
          aria-label={`View ${product.name}`}
        >
          <img src={product.image} alt={product.name} width={384} height={430} loading="lazy" />
        </Button>
        {product.label && <span className="product-label">{product.label}</span>}
        <Button
          variant="ghost"
          size="icon"
          className={saved ? "favorite-control is-saved" : "favorite-control"}
          title={saved ? "Remove from wishlist" : "Save to wishlist"}
          aria-label={`${saved ? "Unsave" : "Save"} ${product.name}`}
          aria-pressed={saved}
          onClick={() => toggleFavorite(product.id)}
        >
          <Heart fill={saved ? "currentColor" : "none"} />
        </Button>
      </div>
      <Button variant="link" className="product-name" onClick={() => openProduct(product)}>
        {product.name}
      </Button>
      <p className="product-audience">
        {product.category} <span>·</span> {product.brand}
      </p>
      <div className="product-seller">
        <span>{product.seller}</span>
        <span>
          <Star size={11} fill="currentColor" /> {product.sellerRating}
        </span>
      </div>
      <div className="product-bottom">
        <strong>{money(product.price)}</strong>
        <span>
          <Star size={11} fill="currentColor" />
          {product.rating} <small>({product.reviews})</small>
        </span>
      </div>
      <Button
        className="product-add-button"
        variant="outline"
        aria-label={`Add ${product.name} to cart`}
        onClick={() => addQuickToCart(product)}
      >
        <ShoppingCart size={15} />
        Add to cart
      </Button>
    </article>
  );
}
