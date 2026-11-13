import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront";
import { products, categories, brands } from "@/lib/catalog";
import { trackFilterProducts, trackViewSearchResults } from "@/lib/analytics";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: typeof search["filter"] === "string" ? search["filter"] : "All",
    query: typeof search["query"] === "string" ? search["query"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Shop the marketplace — SupreCart" },
      {
        name: "description",
        content:
          "Browse thoughtfully selected products from independent sellers across the SupreCart marketplace.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { filter, query } = Route.useSearch();
  const [sort, setSort] = useState("featured");
  const allProducts = useMemo(() => products, []);
  const options = ["All", ...new Set([...categories, ...brands])];
  const visible = useMemo(
    () =>
      allProducts
        .filter(
          (p) =>
            (filter === "All" ||
              filter === "Brands" ||
              p.category === filter ||
              p.brand === filter) &&
            (!query ||
              `${p.name} ${p.brand} ${p.category} ${p.seller}`
                .toLowerCase()
                .includes(query.toLowerCase())),
        )
        .sort((a, b) =>
          sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : a.id - b.id,
        ),
    [allProducts, filter, query, sort],
  );
  const lastTrackedFilter = useRef("");
  useEffect(() => {
    const key = `${query}|${filter}`;
    if (key === lastTrackedFilter.current) return;
    lastTrackedFilter.current = key;
    if (query) trackViewSearchResults(query, visible.length, filter);
    else if (filter !== "All") trackFilterProducts(filter, visible.length);
  }, [filter, query, visible.length]);

  return (
    <main id="main-content" tabIndex={-1} className="page-width app-shop">
      <div className="app-shop-head">
        <div>
          <p className="app-kicker">The SupreCart marketplace</p>
          <h1>
            {filter === "All" ? "Shop everything" : filter === "Brands" ? "Brands to know" : filter}
          </h1>
          <p className="app-shop-intro">
            {query ? `Showing results for “${query}”.` : "Good finds, from sellers worth knowing."}
          </p>
        </div>
        <span className="app-shop-count">
          {visible.length} {visible.length === 1 ? "find" : "finds"}
        </span>
      </div>

      <nav className="app-chips" aria-label="Filter by category or brand">
        {options.map((option) => (
          <Link
            key={option}
            to="/shop"
            search={{ filter: option, query }}
            className={`app-chip${filter === option ? " is-active" : ""}`}
          >
            {option}
          </Link>
        ))}
      </nav>

      <div className="app-shop-toolbar">
        <span className="app-trust-line">
          <ShieldCheck size={13} /> Every order is protected by escrow
        </span>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>

      <div className="app-product-grid">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="collection-empty">
          <h2>No finds match this view.</h2>
          <p>
            {query
              ? `Nothing matched “${query.trim()}”. Try another product, brand, or seller.`
              : "Try a different category or brand."}
          </p>
          <Button asChild>
            <Link to="/shop" search={{ filter: "All", query: "" }}>
              Clear filters
            </Link>
          </Button>
        </div>
      )}
    </main>
  );
}
