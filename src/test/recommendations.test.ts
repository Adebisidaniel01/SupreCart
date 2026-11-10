import { describe, expect, it } from "vitest";

import { products } from "@/lib/catalog";
import { contentSimilarity, recommendProducts } from "@/lib/recommendations";

function product(id: number) {
  const found = products.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing seeded product ${id}`);
  return found;
}

describe("recommendation algorithms", () => {
  it("scores content similarity from product features", () => {
    const footwear = contentSimilarity(product(1), product(2));
    const unrelated = contentSimilarity(product(1), product(10));

    expect(footwear).toBeGreaterThan(unrelated);
    expect(footwear).toBeGreaterThan(0.35);
  });

  it("uses content similarity for a focused product", () => {
    const recommendations = recommendProducts({ focusProductId: 10, limit: 3 });

    expect(recommendations).toHaveLength(3);
    expect(
      recommendations
        .slice(0, 2)
        .map((entry) => entry.product.id)
        .sort(),
    ).toEqual([15, 22]);
    expect(recommendations[0]?.reason).toMatch(/Similar to Everyday Sunscreen SPF 50/);
    expect(recommendations.every((entry) => entry.contentScore > 0)).toBe(true);
  });

  it("uses item co-occurrence for collaborative recommendations", () => {
    const recommendations = recommendProducts({
      favorites: [5],
      contentWeight: 0,
      collaborativeWeight: 1,
      limit: 4,
    });
    const ids = recommendations.map((entry) => entry.product.id);

    expect(recommendations.every((entry) => entry.collaborativeScore > 0)).toBe(true);
    expect(ids.some((id) => [6, 11, 19].includes(id))).toBe(true);
  });

  it("falls back to seeded popularity for a cold start", () => {
    const recommendations = recommendProducts({ limit: 4 });

    expect(recommendations).toHaveLength(4);
    expect(recommendations.every((entry) => entry.source === "popular")).toBe(true);
    expect(recommendations.every((entry) => entry.popularityScore > 0)).toBe(true);
  });

  it("excludes focused, saved and explicitly excluded products", () => {
    const recommendations = recommendProducts({
      focusProductId: 1,
      favorites: [2],
      excludeProductIds: [3],
      limit: 22,
    });
    const ids = recommendations.map((entry) => entry.product.id);

    expect(ids).not.toContain(1);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(3);
    expect(new Set(ids).size).toBe(ids.length);
    expect(recommendations.every((entry) => entry.score >= 0)).toBe(true);
  });
});
