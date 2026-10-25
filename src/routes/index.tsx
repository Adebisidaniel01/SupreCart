import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, Wordmark } from "@/components/storefront";
import { products, categories, money, type Product } from "@/lib/catalog";

const editProducts = [7, 6, 9]
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => product !== undefined);

const freshProducts = [11, 12, 13, 15]
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => product !== undefined);

const heroMain = products.find((product) => product.id === 7) ?? products[0]!;
const heroSide = [9, 1]
  .map((id) => products.find((product) => product.id === id))
  .filter((product): product is Product => product !== undefined);

const makers = [
  {
    name: "Form & Field",
    discipline: "Ceramics · Ilorin",
    note: "Quiet forms shaped by hand, made to be used every day rather than saved for later.",
    category: "Home",
    product: products.find((product) => product.id === 17) ?? heroMain,
  },
  {
    name: "Atelier Nia",
    discipline: "Leather · Lagos",
    note: "Small-batch leather goods with clean lines, honest hardware and a long life ahead.",
    category: "Accessories",
    product: products.find((product) => product.id === 9) ?? heroMain,
  },
  {
    name: "Serein Beauty",
    discipline: "Skincare · Abuja",
    note: "Botanical rituals built around simple ingredients, slow mornings and everyday care.",
    category: "Beauty",
    product: products.find((product) => product.id === 10) ?? heroMain,
  },
];

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

function EditorialProduct({
  product,
  feature = false,
  index,
}: {
  product: Product;
  feature?: boolean;
  index: number;
}) {
  const { favorites, toggleFavorite, openProduct } = useStore();
  const saved = favorites.includes(product.id);

  return (
    <article
      className={`editorial-product ${feature ? "is-feature" : ""}`}
      style={{ "--editorial-index": index } as CSSProperties}
    >
      <div className="editorial-product-frame">
        <button
          type="button"
          className="editorial-product-image"
          onClick={() => openProduct(product)}
          aria-label={`View ${product.name}`}
        >
          <img src={product.image} alt={product.name} loading={feature ? "eager" : "lazy"} />
          <span className="editorial-product-view">
            View piece <ArrowUpRight size={14} />
          </span>
        </button>
        <button
          type="button"
          className={`editorial-product-heart ${saved ? "is-saved" : ""}`}
          onClick={() => toggleFavorite(product.id)}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          aria-pressed={saved}
        >
          <Heart size={15} fill={saved ? "currentColor" : "none"} />
        </button>
        {product.label && <span className="editorial-product-label">{product.label}</span>}
      </div>
      <div className="editorial-product-info">
        <div className="editorial-product-meta">
          <span>{product.brand}</span>
          <span>{product.category}</span>
        </div>
        <button
          type="button"
          className="editorial-product-name"
          onClick={() => openProduct(product)}
        >
          {product.name}
        </button>
        <div className="editorial-product-bottom">
          <strong>{money(product.price)}</strong>
          <span>by {product.seller}</span>
        </div>
      </div>
    </article>
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
    <main className="page-width home-main editorial-home">
      <HomeSplash />

      <section className="editorial-hero">
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
            <a href="#makers" className="editorial-text-link">
              Meet the makers <ArrowUpRight size={15} />
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

      <div className="editorial-marquee" aria-hidden="true">
        <div>
          <span>Made slowly</span>
          <i />
          <span>Chosen carefully</span>
          <i />
          <span>Sent with care</span>
          <i />
          <span>Found here</span>
          <i />
          <span>Made slowly</span>
          <i />
          <span>Chosen carefully</span>
          <i />
          <span>Sent with care</span>
          <i />
          <span>Found here</span>
          <i />
        </div>
      </div>

      <section className="editorial-edit" id="edit">
        <header className="editorial-section-head">
          <div>
            <p className="editorial-eyebrow">01 / THE OPENING EDIT</p>
            <h2>
              Pieces that ask you
              <br />
              to <em>slow down.</em>
            </h2>
          </div>
          <p className="editorial-section-note">
            A first look at the things we keep coming back to — tactile, useful and quietly
            beautiful.
          </p>
          <Link to="/shop" search={{ filter: "All", query: "" }} className="editorial-text-link">
            Shop all finds <ArrowRight size={14} />
          </Link>
        </header>
        <div className="editorial-edit-grid">
          {editProducts.map((product, index) => (
            <EditorialProduct
              key={product.id}
              product={product}
              feature={index === 0}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="editorial-story">
        <div className="editorial-story-art">
          <img src={heroMain.image} alt="A considered home still life" loading="lazy" />
          <span className="editorial-story-caption">
            <span>FORM & FIELD</span>
            <span>Hand-thrown stoneware · Ilorin</span>
          </span>
        </div>
        <div className="editorial-story-copy">
          <p className="editorial-eyebrow">02 / THE POINT OF VIEW</p>
          <h2>
            Made slowly.
            <br />
            <em>Chosen carefully.</em>
          </h2>
          <p>
            SupreCart began with a simple idea: the best things rarely arrive in a hurry. So we look
            for independent shops with a point of view, pieces with a little weight and detail, and
            the kind of finds that settle into a life rather than crowd it.
          </p>
          <p>
            Every seller is reviewed by hand. Every edit is small on purpose. What you see here is
            the good stuff, without the endless scroll.
          </p>
          <div className="editorial-story-facts">
            <div>
              <strong>Hand-reviewed</strong>
              <span>Every seller, every time</span>
            </div>
            <div>
              <strong>Small-batch</strong>
              <span>Made with intention</span>
            </div>
            <div>
              <strong>Built to last</strong>
              <span>Chosen beyond the season</span>
            </div>
          </div>
          <Link to="/shop" search={{ filter: "Home", query: "" }} className="editorial-text-link">
            Explore the home edit <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="editorial-index">
        <header className="editorial-section-head editorial-index-head">
          <div>
            <p className="editorial-eyebrow">03 / FIND YOUR NEXT OBSESSION</p>
            <h2>
              A place for
              <br />
              <em>every good thing.</em>
            </h2>
          </div>
          <p className="editorial-section-note">
            Start with a category, then follow your curiosity. The best finds are rarely in the
            first place you look.
          </p>
        </header>
        <div className="editorial-index-list">
          {categories.slice(0, 6).map((category, index) => {
            const product = products.find((item) => item.category === category);
            const count = products.filter((item) => item.category === category).length;
            if (!product) return null;
            return (
              <Link
                key={category}
                to="/shop"
                search={{ filter: category, query: "" }}
                className="editorial-index-row"
              >
                <span className="editorial-index-number">{String(index + 1).padStart(2, "0")}</span>
                <strong>{category}</strong>
                <span className="editorial-index-count">
                  {count} {count === 1 ? "piece" : "pieces"}
                </span>
                <span className="editorial-index-thumb">
                  <img src={product.image} alt="" loading="lazy" />
                </span>
                <ArrowUpRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="editorial-makers" id="makers">
        <header className="editorial-makers-head">
          <p className="editorial-eyebrow">04 / MEET THE MAKERS</p>
          <h2>
            The hands behind
            <br />
            <em>the good things.</em>
          </h2>
          <p>
            Behind every listing is a person with a practice, a point of view and a reason for
            making what they make. These are a few of the shops we are glad to know.
          </p>
        </header>
        <div className="editorial-maker-grid">
          {makers.map((maker, index) => (
            <article key={maker.name} className="editorial-maker">
              <div className="editorial-maker-art">
                <img src={maker.product.image} alt={maker.product.name} loading="lazy" />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <p className="editorial-maker-discipline">{maker.discipline}</p>
              <h3>{maker.name}</h3>
              <p>{maker.note}</p>
              <Link
                to="/shop"
                search={{ filter: maker.category, query: "" }}
                className="editorial-text-link"
              >
                Shop the shop <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="editorial-new">
        <header className="editorial-section-head">
          <div>
            <p className="editorial-eyebrow">05 / JUST IN</p>
            <h2>
              Freshly found,
              <br />
              <em>quietly good.</em>
            </h2>
          </div>
          <p className="editorial-section-note">
            New arrivals from the sellers we are watching. A little texture, a little colour, a lot
            of repeat visits.
          </p>
          <Link to="/shop" search={{ filter: "All", query: "" }} className="editorial-text-link">
            See everything new <ArrowRight size={14} />
          </Link>
        </header>
        <div className="editorial-new-grid">
          {freshProducts.map((product, index) => (
            <EditorialProduct key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      <section className="editorial-invite">
        <div className="editorial-invite-copy">
          <p className="editorial-eyebrow">06 / FOR INDEPENDENT SELLERS</p>
          <h2>
            A good shop deserves
            <br />
            <em>a good room.</em>
          </h2>
          <p>
            Bring what you make to a marketplace built around discovery, considered browsing and the
            people behind every find. Apply from your SupreCart account.
          </p>
          <Button size="lg" asChild>
            <Link to="/sellers">
              Start your application <ArrowRight size={15} />
            </Link>
          </Button>
          <span className="editorial-invite-note">
            <Sparkles size={13} /> One buyer account. A seller studio when you are ready.
          </span>
        </div>
        <div className="editorial-invite-art">
          <img src={products.find((product) => product.id === 12)?.image} alt="" loading="lazy" />
          <div>
            <span>GOOD BUSINESS, GROWING.</span>
            <strong>
              More room
              <br />
              to make.
            </strong>
          </div>
        </div>
      </section>

      <section className="editorial-values" aria-label="The SupreCart promise">
        <div>
          <span>01</span>
          <strong>Considered, not crowded</strong>
          <p>A small, useful edit rather than an endless wall of stuff.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Sellers with a story</strong>
          <p>Independent businesses, makers and local favourites.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Easy to live with</strong>
          <p>Clear details, saved finds and a calmer way to browse.</p>
        </div>
      </section>
    </main>
  );
}
