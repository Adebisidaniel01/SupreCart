import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, Wordmark } from "@/components/storefront";
import footwearCover from "@/assets/category-5.jpg";
import { products, categories, type Product } from "@/lib/catalog";

const featuredProducts = categories
  .map((category) => products.find((product) => product.category === category))
  .filter((product): product is Product => product !== undefined);
const freshProducts = products.filter((product) => !featuredProducts.includes(product)).slice(-5);

function HomeSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setVisible(false), reducedMotion ? 700 : 1800);
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
      <section className="hero marketplace-hero">
        <div className="hero-showcase" aria-label="A selection of marketplace products">
          {featuredProducts.slice(0, 4).map((product, index) => (
            <div className={`hero-tile hero-tile-${index}`} key={product.id}>
              <img src={product.image} alt={product.category} />
              <span>{product.category}</span>
            </div>
          ))}
        </div>
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">A marketplace with more to love</span>
          <h1>
            Find your kind
            <br />
            of good.
          </h1>
          <p>
            Fresh finds from independent sellers.
            <br />
            Style, home, tech and everything between.
          </p>
          <div className="hero-actions">
            <Button size="lg" asChild>
              <Link to="/shop" search={{ filter: "All", query: "" }}>
                Explore the marketplace
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#categories">Browse categories</a>
            </Button>
          </div>
        </div>
        <div className="hero-note">
          <Sparkles size={16} />
          <span>Good finds, from sellers worth knowing.</span>
        </div>
      </section>
      <section className="home-value-strip" aria-label="Why shop SupreCart">
        <div>
          <span>01</span>
          <strong>Independent sellers</strong>
          <p>Find brands and makers beyond the usual.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Easy to explore</strong>
          <p>Move from fashion to home and more in one place.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Always something new</strong>
          <p>Keep discovering new things worth knowing.</p>
        </div>
      </section>
      <section className="category-section" id="categories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A little bit of everything</p>
            <h2>Explore the marketplace</h2>
          </div>
          <Link to="/shop" search={{ filter: "All", query: "" }} className="view-all">
            All categories <ArrowRight size={14} />
          </Link>
        </div>
        <div className="category-grid marketplace-categories">
          {featuredProducts.map((product, i) => {
            const category = product.category;
            const cover = category === "Footwear" ? footwearCover : product.image;
            return (
              <Link
                key={category}
                to="/shop"
                search={{ filter: category, query: "" }}
                className={`category category-card category-tone-${i}`}
              >
                <div>
                  <img src={cover} alt="" loading="lazy" />
                </div>
                <span>{category}</span>
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
      <section className="bestsellers">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A few good finds</p>
            <h2>Worth a closer look</h2>
          </div>
          <Link to="/shop" search={{ filter: "All", query: "" }} className="view-all">
            Shop everything <ArrowRight size={14} />
          </Link>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section className="sponsored-banner home-maker-banner">
        <div>
          <span className="sponsored-label">
            <Sparkles size={13} /> MADE BY INDEPENDENT SELLERS
          </span>
          <h2>
            Meet the makers
            <br />
            behind the good stuff.
          </h2>
          <p>Meet the people and small businesses behind the good finds.</p>
          <Button variant="outline" asChild>
            <Link to="/shop" search={{ filter: "All", query: "" }}>
              Discover the edit <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="sponsored-stamp">
          A little more
          <br />
          <strong>local</strong>
          <br />
          by design
        </div>
      </section>
      <section className="bestsellers latest-finds">
        <div className="section-heading">
          <div>
            <p className="eyebrow">More reasons to browse</p>
            <h2>Fresh from the marketplace</h2>
          </div>
          <Link to="/shop" search={{ filter: "All", query: "" }} className="view-all">
            See all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="product-grid">
          {freshProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
