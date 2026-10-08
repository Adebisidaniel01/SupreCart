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
    <div className="home-splash" role="status" aria-label="Loading CoreCart">
      <Wordmark />
      <p>Find your kind of good.</p>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CoreCart — Good finds, all in one place" },
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
              <Link to="/shop" search={{ filter: "All" }}>
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
      <section className="category-section" id="categories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A little bit of everything</p>
            <h2>Explore the marketplace</h2>
          </div>
          <Link to="/shop" search={{ filter: "All" }} className="view-all">
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
                search={{ filter: category }}
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
      <section className="sponsored-grid" aria-label="Sponsored seller collections">
        <Link to="/shop" search={{ filter: "Home" }} className="sponsored-card sponsored-home">
          <span className="sponsored-label">
            <Sparkles size={13} /> SPONSORED · FORM & FIELD
          </span>
          <strong>
            Make room
            <br />
            for good things.
          </strong>
          <span className="sponsored-card-link">
            Explore home <ArrowRight size={14} />
          </span>
          <span className="ad-disclosure">Paid placement</span>
        </Link>
        <Link to="/shop" search={{ filter: "Beauty" }} className="sponsored-card sponsored-beauty">
          <span className="sponsored-label">
            <Sparkles size={13} /> SPONSORED · SEREIN
          </span>
          <strong>
            A softer kind
            <br />
            of everyday.
          </strong>
          <span className="sponsored-card-link">
            Explore beauty <ArrowRight size={14} />
          </span>
          <span className="ad-disclosure">Paid placement</span>
        </Link>
      </section>
      <section className="bestsellers">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Picked by the community</p>
            <h2>Good finds, loved often</h2>
          </div>
          <Link to="/shop" search={{ filter: "All" }} className="view-all">
            Shop everything <ArrowRight size={14} />
          </Link>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section className="sponsored-banner">
        <div>
          <span className="sponsored-label">
            <Sparkles size={13} /> SPONSORED COLLECTION
          </span>
          <h2>
            Meet the makers
            <br />
            behind the good stuff.
          </h2>
          <p>Discover independent brands and products picked for you.</p>
          <Button variant="outline" asChild>
            <Link to="/shop" search={{ filter: "All" }}>
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
        <span className="ad-disclosure">Paid placement</span>
      </section>
      <section className="bestsellers latest-finds">
        <div className="section-heading">
          <div>
            <p className="eyebrow">More reasons to browse</p>
            <h2>Fresh from the marketplace</h2>
          </div>
          <Link to="/shop" search={{ filter: "All" }} className="view-all">
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
