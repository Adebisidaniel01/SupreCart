import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, Wordmark } from "@/components/storefront";
import { products, categories, money, type Product } from "@/lib/catalog";

const editProducts = [1, 6, 7, 8]
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => product !== undefined);

const freshProducts = [11, 12, 13, 15]
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => product !== undefined);

const heroMain = products.find((product) => product.id === 1)!;
const heroSide = [7, 9]
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => product !== undefined);
const averageRating = (
  products.reduce((total, product) => total + Number(product.rating), 0) / products.length
).toFixed(1);

function HomeSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setVisible(false), reducedMotion ? 600 : 1100);
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SupreCart — Good finds, all in one place" },
      {
        name: "description",
        content:
          "Discover independent sellers and considered finds across fashion, footwear, home, tech, beauty and more.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="page-width home-main">
      <HomeSplash />

      <section className="hero marketplace-hero home-hero">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">INDEPENDENT FINDS, ONE MARKETPLACE</span>
          <h1>
            Good things,
            <br />
            <em>found here.</em>
          </h1>
          <p>
            Thoughtful pieces from independent sellers, gathered in one easy place. Take a look
            around — your next favourite is probably already here.
          </p>
          <div className="hero-actions">
            <Button size="lg" asChild>
              <Link to="/shop" search={{ filter: "All", query: "" }}>
                Start exploring <ArrowRight size={15} />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#categories">
                Browse categories <ArrowUpRight size={15} />
              </a>
            </Button>
          </div>
          <div className="hero-metrics" aria-label="Marketplace highlights">
            <div>
              <strong>{products.length}</strong>
              <span>curated finds</span>
            </div>
            <div>
              <strong>{categories.length}</strong>
              <span>categories</span>
            </div>
            <div>
              <strong>{averageRating}</strong>
              <span>average rating</span>
            </div>
          </div>
        </div>

        <div className="hero-showcase" aria-label="A selection of marketplace products">
          <Link
            to="/shop"
            search={{ filter: heroMain.category, query: "" }}
            className="hero-tile hero-tile-large"
          >
            <img src={heroMain.image} alt={heroMain.name} />
            <span className="hero-tile-tag">{heroMain.category}</span>
            <span className="hero-tile-meta">
              <strong>{heroMain.name}</strong>
              <em>{money(heroMain.price)}</em>
            </span>
          </Link>
          {heroSide.map((product) => (
            <Link
              key={product.id}
              to="/shop"
              search={{ filter: product.category, query: "" }}
              className="hero-tile hero-tile-side"
            >
              <img src={product.image} alt={product.name} />
              <span className="hero-tile-tag">{product.category}</span>
            </Link>
          ))}
        </div>

        <div className="hero-floating-card">
          <span className="hero-floating-icon">
            <BadgeCheck size={17} />
          </span>
          <div>
            <strong>Seller checked</strong>
            <span>Real people, good finds</span>
          </div>
          <span className="hero-floating-rating">
            <Star size={11} fill="currentColor" /> 4.9
          </span>
        </div>
      </section>

      <section className="home-value-strip" aria-label="Why shop SupreCart">
        <div>
          <span>01</span>
          <strong>Curated, not crowded</strong>
          <p>A considered mix of pieces worth making room for.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Sellers with a story</strong>
          <p>Independent businesses, makers and local favourites.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Easy to explore</strong>
          <p>Clear categories, useful details and a wishlist for later.</p>
        </div>
      </section>

      <section className="category-section" id="categories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">START WITH WHAT YOU LOVE</p>
            <h2>Good things, by category</h2>
          </div>
          <Link to="/shop" search={{ filter: "All", query: "" }} className="view-all">
            All categories <ArrowRight size={14} />
          </Link>
        </div>
        <div className="category-grid marketplace-categories home-categories">
          {categories.map((category, index) => {
            const product = products.find((item) => item.category === category);
            if (!product) return null;
            const count = products.filter((item) => item.category === category).length;
            return (
              <Link
                key={category}
                to="/shop"
                search={{ filter: category, query: "" }}
                className={`category category-card category-tone-${index}`}
              >
                <div>
                  <img src={product.image} alt="" loading="lazy" />
                </div>
                <span>{category}</span>
                <small className="category-count">{count} finds</small>
                <ArrowUpRight className="category-arrow" size={16} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="sponsored-grid home-edits" aria-label="Marketplace edits">
        <Link
          to="/shop"
          search={{ filter: "Home", query: "" }}
          className="sponsored-card sponsored-home"
        >
          <span className="sponsored-label">
            <Sparkles size={13} /> THE HOME EDIT
          </span>
          <strong>
            Make room
            <br />
            for good things.
          </strong>
          <span className="sponsored-card-link">
            Explore home <ArrowRight size={14} />
          </span>
        </Link>
        <Link
          to="/shop"
          search={{ filter: "Beauty", query: "" }}
          className="sponsored-card sponsored-beauty"
        >
          <span className="sponsored-label">
            <Sparkles size={13} /> EVERYDAY BEAUTY
          </span>
          <strong>
            A softer kind
            <br />
            of everyday.
          </strong>
          <span className="sponsored-card-link">
            Explore beauty <ArrowRight size={14} />
          </span>
        </Link>
      </section>

      <section className="bestsellers home-edit">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE SUPRECART EDIT</p>
            <h2>Finds worth a closer look</h2>
          </div>
          <Link to="/shop" search={{ filter: "All", query: "" }} className="view-all">
            Shop everything <ArrowRight size={14} />
          </Link>
        </div>
        <div className="product-grid home-product-grid">
          {editProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="sponsored-banner home-maker-banner">
        <div>
          <span className="sponsored-label">
            <Sparkles size={13} /> FOR INDEPENDENT SELLERS
          </span>
          <h2>
            Good finds deserve
            <br />
            a good home.
          </h2>
          <p>
            Bring your products to a marketplace built around discovery, thoughtful browsing and
            the people behind every find.
          </p>
          <Button asChild>
            <Link to="/sellers">
              Sell on SupreCart <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="sponsored-stamp">
          More room
          <br />
          <strong>to grow</strong>
          <br />
          by design
        </div>
      </section>

      <section className="bestsellers latest-finds">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MORE REASONS TO BROWSE</p>
            <h2>Fresh from the marketplace</h2>
          </div>
          <Link to="/shop" search={{ filter: "All", query: "" }} className="view-all">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="product-grid home-product-grid">
          {freshProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
