import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  BriefcaseBusiness,
  Gem,
  Headphones,
  House,
  Shirt,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront";
import { products, categories, brands } from "@/lib/catalog";
import hero from "@/assets/hero-sneaker.jpg";

const categoryIcons = [Shirt, Boxes, House, Headphones, Gem, Sparkles];

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
        <img
          className="hero-image"
          src={hero}
          alt="A selection of carefully chosen everyday essentials"
          width={1536}
          height={768}
        />
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
        {brands.slice(0, 6).map((brand, i) => (
          <Link
            className={`brand-logo brand-${i}`}
            key={brand}
            to="/shop"
            search={{ filter: brand }}
          >
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
          {products.slice(0, 5).map((product) => (
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
          {products.slice(5).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <section className="careers-teaser">
        <div>
          <p className="eyebrow">People make the marketplace</p>
          <h2>Want to build something good?</h2>
          <p>We’re growing thoughtfully. See where we’re at right now.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/careers">
            Our careers page <BriefcaseBusiness size={16} />
          </Link>
        </Button>
      </section>
    </main>
  );
}
