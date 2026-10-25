import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, Wordmark } from "@/components/storefront";
import { products, categories, money, type Product } from "@/lib/catalog";

const editProducts = [1, 6, 7, 8]
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => product !== undefined);

const freshProducts = [11, 12, 13, 15]
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => product !== undefined);

const heroMain = products.find((product) => product.id === 7) ?? products[0]!;
const heroSide = [9, 1]
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
          "Discover considered pieces from independent sellers across fashion, footwear, home, tech, beauty and more.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="home-main home-hybrid">
      <HomeSplash />

      <div className="home-hybrid-hero">
        <section className="page-width editorial-hero">
          <div className="editorial-hero-copy">
            <p className="editorial-eyebrow">THE SUPRECART EDIT · VOL. 01</p>
            <h1>
              Objects with
              <br />
              <em>a life of their own.</em>
            </h1>
            <p className="editorial-hero-lead">
              Independent makers, considered pieces and the quiet pleasure of finding something that
              feels like yours. Gathered slowly, from people who care how things are made.
            </p>
            <div className="editorial-hero-actions">
              <Button size="lg" asChild>
                <Link to="/shop" search={{ filter: "All", query: "" }}>
                  Shop the edit <ArrowRight size={15} />
                </Link>
              </Button>
              <a href="#categories" className="editorial-text-link">
                Browse categories <ArrowUpRight size={15} />
              </a>
            </div>
            <dl className="editorial-hero-facts">
              <div>
                <dt>Curated finds</dt>
                <dd>{products.length}</dd>
              </div>
              <div>
                <dt>Independent sellers</dt>
                <dd>24</dd>
              </div>
              <div>
                <dt>Average rating</dt>
                <dd>{averageRating}</dd>
              </div>
            </dl>
          </div>

          <div className="editorial-hero-visual">
            <Link
              to="/shop"
              search={{ filter: heroMain.category, query: "" }}
              className="editorial-hero-main"
            >
              <img src={heroMain.image} alt={heroMain.name} />
              <span className="editorial-image-tag">{heroMain.category}</span>
              <span className="editorial-image-caption">
                <span>01</span>
                <strong>{heroMain.name}</strong>
                <em>{money(heroMain.price)}</em>
              </span>
            </Link>
            {heroSide.map((product, index) => (
              <Link
                key={product.id}
                to="/shop"
                search={{ filter: product.category, query: "" }}
                className={`editorial-hero-side side-${index + 1}`}
              >
                <img src={product.image} alt={product.name} />
                <span className="editorial-image-tag">{product.category}</span>
              </Link>
            ))}
            <div className="editorial-hero-stamp">
              <BadgeCheck size={15} />
              <span>Independent sellers, checked by real people</span>
            </div>
          </div>
        </section>
      </div>

      <div className="page-width home-hybrid-body">
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
            {categories.slice(0, 6).map((category) => {
              const product = products.find((item) => item.category === category);
              if (!product) return null;
              return (
                <Link
                  key={category}
                  to="/shop"
                  search={{ filter: category, query: "" }}
                  className="category category-card"
                  aria-label={category}
                >
                  <div>
                    <img src={product.image} alt={category} loading="lazy" />
                  </div>
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
              <br />a good home.
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
      </div>
    </main>
  );
}
