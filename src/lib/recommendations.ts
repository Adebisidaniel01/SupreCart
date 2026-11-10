import { products, type Product } from "@/lib/catalog";

export type RecommendationOrder = {
  items: string;
  status?: string;
};

export type RecommendationCartLine = {
  product: { id: number };
  quantity: number;
};

export type RecommendationSource = "content" | "collaborative" | "hybrid" | "popular";

export type Recommendation = {
  product: Product;
  score: number;
  contentScore: number;
  collaborativeScore: number;
  popularityScore: number;
  source: RecommendationSource;
  reason: string;
};

export type RecommendationInput = {
  favorites?: readonly number[];
  cart?: readonly RecommendationCartLine[];
  orders?: readonly RecommendationOrder[];
  focusProductId?: number;
  excludeProductIds?: readonly number[];
  limit?: number;
  contentWeight?: number;
  collaborativeWeight?: number;
};

const productById = new Map(products.map((product) => [product.id, product]));
const productNames = [...products].sort((a, b) => b.name.length - a.name.length);
const defaultLimit = 4;
const contentWeight = 0.6;
const collaborativeWeight = 0.4;

const seededInteractions: Record<string, ReadonlyArray<readonly [number, number]>> = {
  "seed-runner-01": [
    [1, 3],
    [2, 2],
    [4, 3],
    [18, 2],
  ],
  "seed-runner-02": [
    [1, 2],
    [3, 3],
    [5, 2],
    [19, 1],
  ],
  "seed-sneaker-01": [
    [1, 3],
    [2, 2],
    [3, 3],
    [4, 2],
    [5, 1],
  ],
  "seed-street-01": [
    [5, 3],
    [6, 3],
    [11, 2],
    [19, 2],
    [9, 1],
  ],
  "seed-street-02": [
    [3, 2],
    [5, 2],
    [6, 2],
    [19, 3],
    [7, 1],
  ],
  "seed-campus-01": [
    [9, 3],
    [12, 2],
    [14, 2],
    [18, 2],
    [20, 2],
    [21, 1],
  ],
  "seed-campus-02": [
    [6, 2],
    [9, 2],
    [11, 3],
    [12, 2],
    [17, 1],
    [18, 1],
  ],
  "seed-dorm-01": [
    [9, 2],
    [12, 3],
    [14, 2],
    [17, 3],
    [18, 2],
    [21, 2],
  ],
  "seed-beauty-01": [
    [10, 3],
    [15, 3],
    [22, 2],
  ],
  "seed-beauty-02": [
    [6, 1],
    [10, 2],
    [15, 2],
    [19, 1],
    [22, 2],
  ],
  "seed-tech-01": [
    [8, 3],
    [13, 2],
    [16, 2],
    [20, 2],
  ],
  "seed-tech-02": [
    [8, 2],
    [9, 1],
    [13, 3],
    [16, 1],
    [20, 2],
  ],
  "seed-style-01": [
    [6, 2],
    [7, 3],
    [11, 1],
    [19, 2],
    [10, 1],
  ],
  "seed-gift-01": [
    [10, 1],
    [14, 1],
    [15, 1],
    [18, 1],
    [19, 1],
    [22, 1],
  ],
};

type WeightMap = Map<number, number>;
type FeatureVector = Map<string, number>;
type CollaborativeModel = {
  norms: Map<number, number>;
  dots: Map<string, number>;
};

const priceBands = [10000, 25000, 50000, 100000] as const;
const contentTokens = new Map<number, FeatureVector>();
const tokenStopWords = new Set(["and", "for", "the", "with", "set", "of"]);

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-");
}

function priceBand(price: number) {
  const band = priceBands.findIndex((limit) => price <= limit);
  return band === -1 ? "100k-plus" : `band-${band}`;
}

function nameTokens(name: string) {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !tokenStopWords.has(token));
}

function buildContentVector(product: Product) {
  const vector: FeatureVector = new Map();
  const add = (key: string, weight: number) => {
    vector.set(key, (vector.get(key) ?? 0) + weight);
  };

  add(`category:${slug(product.category)}`, 3);
  add(`brand:${slug(product.brand)}`, 2.2);
  add(`seller:${slug(product.seller)}`, 1.2);
  add(`price:${priceBand(product.price)}`, 0.8);
  if (product.label) add(`label:${slug(product.label)}`, 0.5);
  for (const token of nameTokens(product.name)) add(`token:${token}`, 0.6);

  return vector;
}

function getContentVector(product: Product) {
  const cached = contentTokens.get(product.id);
  if (cached) return cached;
  const vector = buildContentVector(product);
  contentTokens.set(product.id, vector);
  return vector;
}

function cosineSimilarity(left: FeatureVector, right: FeatureVector) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const weight of left.values()) leftNorm += weight * weight;
  for (const weight of right.values()) rightNorm += weight * weight;
  if (!leftNorm || !rightNorm) return 0;

  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  for (const [feature, weight] of small) {
    const other = large.get(feature);
    if (other) dot += weight * other;
  }

  return dot / Math.sqrt(leftNorm * rightNorm);
}

export function contentSimilarity(left: Product, right: Product) {
  return cosineSimilarity(getContentVector(left), getContentVector(right));
}

function addWeight(weights: WeightMap, id: number, weight: number) {
  if (!productById.has(id) || !Number.isFinite(weight) || weight <= 0) return;
  weights.set(id, (weights.get(id) ?? 0) + weight);
}

function orderWeight(status: string | undefined) {
  if (status === "Cancelled") return 0;
  if (status === "Cancellation requested") return 1.5;
  if (status === "Delivered") return 4;
  if (status === "In transit") return 3.5;
  return 3;
}

function userInteractions(input: RecommendationInput) {
  const weights: WeightMap = new Map();

  for (const id of input.favorites ?? []) addWeight(weights, id, 3);

  for (const line of input.cart ?? []) {
    const quantity = Number.isFinite(line.quantity) ? Math.min(Math.max(line.quantity, 1), 5) : 1;
    addWeight(weights, line.product.id, 2.5 + quantity * 0.25);
  }

  for (const order of input.orders ?? []) {
    const weight = orderWeight(order.status);
    if (!weight) continue;
    const items = order.items.toLowerCase();
    for (const product of productNames) {
      if (!items.includes(product.name.toLowerCase())) continue;
      addWeight(weights, product.id, weight);
    }
  }

  return weights;
}

function profileVector(weights: WeightMap) {
  const vector: FeatureVector = new Map();
  for (const [id, weight] of weights) {
    const product = productById.get(id);
    if (!product) continue;
    for (const [feature, value] of getContentVector(product)) {
      vector.set(feature, (vector.get(feature) ?? 0) + value * weight);
    }
  }
  return vector;
}

function pairKey(left: number, right: number) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function buildCollaborativeModel(profiles: ReadonlyArray<WeightMap>) {
  const norms = new Map<number, number>();
  const dots = new Map<string, number>();

  for (const profile of profiles) {
    const entries = [...profile.entries()];
    for (const [id, weight] of entries) {
      norms.set(id, (norms.get(id) ?? 0) + weight * weight);
    }
    for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
      const left = entries[leftIndex]!;
      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const right = entries[rightIndex]!;
        const key = pairKey(left[0], right[0]);
        dots.set(key, (dots.get(key) ?? 0) + left[1] * right[1]);
      }
    }
  }

  return { norms, dots };
}

function collaborativeSimilarity(left: number, right: number, model: CollaborativeModel) {
  if (left === right) return 1;
  const leftNorm = model.norms.get(left) ?? 0;
  const rightNorm = model.norms.get(right) ?? 0;
  if (!leftNorm || !rightNorm) return 0;
  const dot = model.dots.get(pairKey(left, right)) ?? 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

function collaborativeScores(
  weights: WeightMap,
  candidates: readonly Product[],
  model: CollaborativeModel,
) {
  const scores = new Map<number, number>();
  const interactions = [...weights.entries()];
  if (!interactions.length) return scores;

  const totalWeight = interactions.reduce((sum, [, weight]) => sum + weight, 0);
  let maximum = 0;

  for (const candidate of candidates) {
    let score = 0;
    for (const [id, weight] of interactions) {
      score += weight * collaborativeSimilarity(candidate.id, id, model);
    }
    const normalized = totalWeight > 0 ? score / totalWeight : 0;
    scores.set(candidate.id, normalized);
    maximum = Math.max(maximum, normalized);
  }

  if (maximum > 0) {
    for (const [id, score] of scores) scores.set(id, score / maximum);
  }

  return scores;
}

function popularityScores(candidates: readonly Product[]) {
  const totals = new Map<number, number>();
  for (const profile of Object.values(seededInteractions)) {
    for (const [id, weight] of profile) {
      totals.set(id, (totals.get(id) ?? 0) + weight);
    }
  }

  const maximum = Math.max(...totals.values(), 0);
  return new Map(
    candidates.map((product) => {
      const total = totals.get(product.id) ?? 0;
      return [product.id, maximum > 0 ? total / maximum : 0] as const;
    }),
  );
}

function reviewCount(value: string) {
  const normalized = value.trim().toLowerCase();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return normalized.endsWith("k") ? parsed * 1000 : parsed;
}

function qualityScore(product: Product) {
  const rating = Number.parseFloat(product.rating);
  const reviews = reviewCount(product.reviews);
  const ratingScore = Number.isFinite(rating) ? Math.min(Math.max(rating / 5, 0), 1) : 0;
  const reviewScore = Math.min(reviews / 3200, 1);
  return ratingScore * 0.7 + reviewScore * 0.3;
}

function bestContentMatch(candidate: Product, weights: WeightMap) {
  let bestId = 0;
  let bestScore = 0;
  const candidateVector = getContentVector(candidate);

  for (const [id, weight] of weights) {
    if (id === candidate.id) continue;
    const product = productById.get(id);
    if (!product) continue;
    const score = cosineSimilarity(candidateVector, getContentVector(product)) * weight;
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return productById.get(bestId);
}

function recommendationSource(
  content: number,
  collaborative: number,
  hasHistory: boolean,
  focus: Product | undefined,
): RecommendationSource {
  if (!hasHistory && !focus) return "popular";
  if (!focus && content >= collaborative * 1.25) return "content";
  if (!focus && collaborative >= content * 1.25) return "collaborative";
  if (!hasHistory && focus) return "content";
  return "hybrid";
}

function recommendationReason(
  source: RecommendationSource,
  candidate: Product,
  focus: Product | undefined,
  weights: WeightMap,
) {
  if (focus) return `Similar to ${focus.name}`;
  if (source === "popular") return "Popular with SupreCart shoppers";
  if (source === "content") {
    const match = bestContentMatch(candidate, weights);
    return match ? `Matches your interest in ${match.name}` : "Matches your saved finds";
  }
  return "Shoppers with similar baskets liked this";
}

function seededProfiles() {
  const localProfiles = Object.values(seededInteractions).map((entries) => {
    const weights: WeightMap = new Map();
    for (const [id, weight] of entries) addWeight(weights, id, weight);
    return weights;
  });
  return localProfiles;
}

const baseProfiles = seededProfiles();

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

export function recommendProducts(input: RecommendationInput = {}): Recommendation[] {
  const limit = Number.isFinite(input.limit)
    ? Math.max(0, Math.floor(input.limit ?? 0))
    : defaultLimit;
  if (!limit) return [];

  const focus = input.focusProductId ? productById.get(input.focusProductId) : undefined;
  const weights = userInteractions(input);
  const hasHistory = weights.size > 0;
  const excluded = new Set<number>([
    ...(input.excludeProductIds ?? []),
    ...weights.keys(),
    ...(focus ? [focus.id] : []),
  ]);
  const candidates = products.filter((product) => !excluded.has(product.id));
  if (!candidates.length) return [];

  const model = buildCollaborativeModel([...baseProfiles, weights]);
  const collaborative = collaborativeScores(weights, candidates, model);
  const popularity = popularityScores(candidates);
  const focusVector = focus ? getContentVector(focus) : null;
  const userVector = hasHistory ? profileVector(weights) : null;
  const weightsForBlend = {
    content:
      Number.isFinite(input.contentWeight) && (input.contentWeight ?? 0) >= 0
        ? (input.contentWeight ?? contentWeight)
        : contentWeight,
    collaborative:
      Number.isFinite(input.collaborativeWeight) && (input.collaborativeWeight ?? 0) >= 0
        ? (input.collaborativeWeight ?? collaborativeWeight)
        : collaborativeWeight,
  };

  return candidates
    .map((candidate) => {
      const candidateVector = getContentVector(candidate);
      const focusContent = focusVector ? cosineSimilarity(candidateVector, focusVector) : 0;
      const historyContent = userVector ? cosineSimilarity(candidateVector, userVector) : 0;
      const content = focus
        ? hasHistory
          ? focusContent * 0.7 + historyContent * 0.3
          : focusContent
        : historyContent;
      const collaborativeScore = collaborative.get(candidate.id) ?? 0;
      const popularityScore = popularity.get(candidate.id) ?? 0;
      const quality = qualityScore(candidate);
      const score = focus
        ? content * 0.7 + collaborativeScore * 0.25 + quality * 0.05
        : hasHistory
          ? content * weightsForBlend.content +
            collaborativeScore * weightsForBlend.collaborative +
            quality * 0.05
          : popularityScore * 0.6 + quality * 0.4;
      const source = recommendationSource(content, collaborativeScore, hasHistory, focus);

      return {
        product: candidate,
        score,
        contentScore: content,
        collaborativeScore,
        popularityScore,
        quality,
        source,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.quality !== left.quality) return right.quality - left.quality;
      return left.product.id - right.product.id;
    })
    .slice(0, limit)
    .map(({ quality: _quality, ...recommendation }) => ({
      ...recommendation,
      score: round(recommendation.score),
      contentScore: round(recommendation.contentScore),
      collaborativeScore: round(recommendation.collaborativeScore),
      popularityScore: round(recommendation.popularityScore),
      reason: recommendationReason(recommendation.source, recommendation.product, focus, weights),
    }));
}
