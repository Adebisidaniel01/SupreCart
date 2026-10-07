import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront";
import { products, categories, brands } from "@/lib/catalog";

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>) => ({
    filter: typeof search["filter"] === "string" ? search["filter"] : "All",
  }),
  head: () => ({
    meta: [
      { title: "Shop the marketplace — CoreCart" },
      {
        name: "description",
        content:
          "Browse thoughtfully selected products from independent sellers across the CoreCart marketplace.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { filter } = Route.useSearch();
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const options = ["All", ...categories, ...brands];
  const visible = useMemo(
    () =>
      products
        .filter(
          (p) =>
            filter === "All" || filter === "Brands" || p.category === filter || p.brand === filter,
        )
        .sort((a, b) =>
          sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : a.id - b.id,
        ),
    [filter, sort],
  );
  return (
    <main className="page-width shop-main">
      <div className="shop-heading">
        <div>
          <p className="eyebrow">THE CORECART MARKETPLACE</p>
          <h1>
            {filter === "All" ? "Shop everything" : filter === "Brands" ? "Brands to know" : filter}
          </h1>
          <p className="shop-intro">Good finds, from sellers worth knowing.</p>
        </div>
        <span>{visible.length} finds</span>
      </div>
      <div className="shop-toolbar">
        <Button variant="outline" onClick={() => setFiltersOpen((x) => !x)}>
          <SlidersHorizontal /> Categories & brands
        </Button>
        <label>
          Sort by{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>
      {filtersOpen && (
        <div className="filter-options">
          {options.map((x) => (
            <Button asChild key={x} variant={filter === x ? "default" : "outline"}>
              <Link to="/shop" search={{ filter: x }}>
                {x}
              </Link>
            </Button>
          ))}
        </div>
      )}
      <div className="sponsored-inline">
        <span>
          <Sparkles size={14} /> SPONSORED
        </span>
        <strong>Made with care by independent sellers.</strong>
        <span>Paid placement</span>
      </div>
      <div className="product-grid shop-products">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {visible.length === 0 && (
        <div className="collection-empty">
          <h2>New finds are on their way.</h2>
          <p>This collection is coming soon.</p>
        </div>
      )}
    </main>
  );
}
