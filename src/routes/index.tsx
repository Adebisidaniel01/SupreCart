import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, Wordmark } from "@/components/storefront";
import { accountFirstName, useActiveAccount } from "@/hooks/use-active-account";
import { products, categories, type Product } from "@/lib/catalog";

function pickProducts(ids: number[]): Product[] {
  return ids
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => product !== undefined);
}

const topProducts = pickProducts([1, 7, 8]);
const freshProducts = pickProducts([11, 13, 15]);

const averageRating = (
  products.reduce((total, product) => total + Number(product.rating), 0) / products.length
).toFixed(1);

const sellerCount = new Set(products.map((product) => product.seller)).size;

function HomeSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setVisible(false), reducedMotion ? 600 : 1200);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="home-splash" role="status" aria-label="Loading SupreCart">
      <Wordmark />
      <p>Good finds. Good things ahead.</p>
      <span className="home-splash-loader" aria-hidden="true">
        <span />
      </span>
      <span className="home-splash-caption">INDEPENDENT FINDS, ALL IN ONE PLACE</span>
    </div>
  );
}

function AppProductSection({
  kicker,
  title,
  note,
  items,
}: {
  kicker: string;
  title: string;
  note?: string;
  items: Array<{ product: Product; note?: string }>;
}) {
  return (
    <section className="app-section">
      <div className="app-section-head">
        <div>
          <p className="app-kicker">{kicker}</p>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        <Link to="/shop" search={{ filter: "All", query: "" }} className="app-section-link">
          See all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="app-product-grid">
        {items.map(({ product, note: productNote }) => (
          <ProductCard key={product.id} product={product} note={productNote ?? ""} />
        ))}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SupreCart — Good finds, all in one place" },
      {
        name: "description",
        content:
          "Shop safely with escrow protection. Considered pieces from independent sellers across fashion, footwear, home, tech, beauty and more.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { account } = useActiveAccount();
  const firstName = accountFirstName(account);
  const isSeller = account?.role === "seller";

  return (
    <main id="main-content" tabIndex={-1} className="app-home">
      <h1 className="app-sr-only">SupreCart marketplace</h1>
      {!account && <HomeSplash />}
      <div className="page-width app-home-inner">
        {account && (
          <section className="app-greeting" aria-label="Your account">
            <div>
              <strong>
                {isSeller ? `Seller studio · ${firstName}` : `Welcome back, ${firstName}.`}
              </strong>
              <span>
                {isSeller
                  ? "Manage your listings, orders and buyer conversations."
                  : "Your saved finds and bag are right where you left them."}
              </span>
            </div>
            <Link to={isSeller ? "/sellers" : "/account"}>
              {isSeller ? "Open seller studio" : "Your account"} <ArrowUpRight size={14} />
            </Link>
          </section>
        )}

        <section className="app-escrow" aria-label="Escrow buyer protection">
          <span className="app-escrow-icon">
            <ShieldCheck aria-hidden="true" />
          </span>
          <div className="app-escrow-copy">
            <strong>Pay safe with escrow</strong>
            <p>We hold your payment until you confirm delivery.</p>
            <div className="app-escrow-meta">
              <span>
                <ShieldCheck size={12} /> Buyer protection
              </span>
              <span>
                <BadgeCheck size={12} /> Verified sellers
              </span>
              <span>
                <Truck size={12} /> Campus delivery
              </span>
            </div>
          </div>
          <Link to="/support" className="app-escrow-link">
            How it works <ArrowRight size={14} />
          </Link>
        </section>

        <section className="app-section" id="categories" aria-label="Shop by category">
          <div className="app-section-head">
            <div>
              <p className="app-kicker">Browse</p>
              <h2>Shop by category</h2>
              <p>
                {averageRating} average rating across {products.length} finds from {sellerCount}{" "}
                independent sellers.
              </p>
            </div>
            <Link to="/shop" search={{ filter: "All", query: "" }} className="app-section-link">
              All categories <ArrowRight size={14} />
            </Link>
          </div>
          <div className="app-cat-rail">
            {categories.map((category) => {
              const categoryProducts = products.filter((product) => product.category === category);
              const image = categoryProducts[0]?.image;
              return (
                <Link
                  key={category}
                  to="/shop"
                  search={{ filter: category, query: "" }}
                  className="app-cat-card"
                  aria-label={`Shop ${category}`}
                >
                  <span className="app-cat-img">
                    {image && <img src={image} alt="" loading="lazy" />}
                  </span>
                  <span className="app-cat-meta">
                    <strong>{category}</strong>
                    <small>
                      {categoryProducts.length} {categoryProducts.length === 1 ? "find" : "finds"}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <AppProductSection
          kicker="Trending now"
          title="Top products"
          note="The pieces shoppers are adding to their bags this week."
          items={topProducts.map((product) => ({ product }))}
        />

        {!account && (
          <section className="app-seller-banner">
            <div>
              <p className="app-kicker">For independent sellers</p>
              <h2>Good finds deserve a good home.</h2>
              <p>
                Bring your products to a marketplace built around discovery, thoughtful browsing and
                the people behind every find.
              </p>
            </div>
            <Button asChild>
              <Link to="/sellers">
                Sell on SupreCart <ArrowRight size={16} />
              </Link>
            </Button>
          </section>
        )}

        <AppProductSection
          kicker="Just landed"
          title="Fresh from the marketplace"
          note="New arrivals, small batches and student picks."
          items={freshProducts.map((product) => ({ product }))}
        />

        <section className="app-escrow" aria-label="Escrow reminder">
          <span className="app-escrow-icon">
            <BadgeCheck aria-hidden="true" />
          </span>
          <div className="app-escrow-copy">
            <strong>Every order is protected.</strong>
            <p>
              From checkout to delivery, your payment stays in escrow until you confirm the item
              arrived as described.
            </p>
          </div>
          <Link to="/support" className="app-escrow-link">
            Read the safety guide <ArrowRight size={14} />
          </Link>
        </section>
      </div>
    </main>
  );
}
