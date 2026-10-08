import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Gem,
  Headphones,
  House,
  Shirt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront";
import { products, categories, brands, type Product } from "@/lib/catalog";

const categoryIcons = [Shirt, Boxes, House, Headphones, Gem, Sparkles];
const featuredProducts = categories
  .map((category) => products.find((product) => product.category === category))
  .filter((product): product is Product => product !== undefined);
const freshProducts = products.filter((product) => !featuredProducts.includes(product)).slice(-5);

function BrandMark({ brand }: { brand: string }) {
  const mark = brand.toLowerCase();
  if (mark === "nike") {
    return (
      <svg viewBox="0 0 100 48" role="img" aria-label="Nike logo">
        <path d="M4 32c7 16 22 14 38 7L97 13 43 29C23 35 12 37 4 32Z" fill="currentColor" />
      </svg>
    );
  }
  if (mark === "adidas") {
    return (
      <svg viewBox="0 0 58 48" role="img" aria-label="Adidas logo">
        <path
          d="M4 35h10L5 19l7-4 12 20h10L19 10l7-4 18 29h10L34 3l-9 5 1 2-8 5-2-3-9 5z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (mark === "new balance") {
    return (
      <svg viewBox="0 0 72 48" role="img" aria-label="New Balance logo">
        <path
          d="M3 36 18 9h9L13 36h-5l15-27h8L16 36h-5L26 9h8L19 36h-5L30 9h8L23 36h-5L34 9h8L27 36h-5L38 9h8L31 36h-5L42 9h8L35 36h-6L47 9h7L41 36h-6L52 9h8L45 36h-5L56 9h8L50 36h-7L64 9h5L54 36Z"
          fill="currentColor"
        />
        <text x="9" y="46" fontSize="9" fontWeight="800" letterSpacing="2" fill="currentColor">
          new balance
        </text>
      </svg>
    );
  }
  if (mark === "vans") {
    return (
      <svg viewBox="0 0 78 48" role="img" aria-label="Vans logo">
        <path d="M3 12h13l7 20 8-20h13L30 40H17Z" fill="currentColor" />
        <text x="41" y="35" fontSize="26" fontWeight="900" fontStyle="italic" fill="currentColor">
          V
        </text>
      </svg>
    );
  }
  const initials = brand
    .split(/\s|&/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="brand-monogram" aria-label={`${brand} logo`} role="img">
      {initials}
    </span>
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
                Explore the marketplace <ArrowRight />
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
      <section className="brand-strip" id="brands">
        <h2>BRANDS TO KNOW</h2>
        {brands.map((brand, i) => (
          <Link
            className={`brand-logo brand-${i}`}
            key={brand}
            to="/shop"
            search={{ filter: brand }}
          >
            <BrandMark brand={brand} />
            <span>{brand}</span>
          </Link>
        ))}
        <Link className="view-all" to="/shop" search={{ filter: "Brands" }}>
          All brands <ArrowRight size={13} />
        </Link>
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
          {categories.map((category, i) => {
            const Icon = categoryIcons[i] ?? Boxes;
            return (
              <Link
                key={category}
                to="/shop"
                search={{ filter: category }}
                className={`category category-card category-tone-${i}`}
              >
                <div>
                  <Icon size={29} strokeWidth={1.5} />
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
