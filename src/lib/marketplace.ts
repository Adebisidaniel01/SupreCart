import type { Product } from "./catalog";
import { supabase } from "./supabase";

type LiveProduct = {
  id: string;
  seller_id: string;
  name: string;
  category: string;
  price: number | string;
  inventory: number;
  image_path: string;
};

type SellerProfile = { id: string; first_name: string; last_name: string };
type ProductRating = { product_id: string; review_count: number; average_rating: number | string };

export async function loadLiveMarketplaceProducts(): Promise<Product[]> {
  const client = supabase;
  if (!client) return [];
  const { data, error } = await client
    .from("products")
    .select("id, seller_id, name, category, price, inventory, image_path")
    .eq("published", true)
    .gt("inventory", 0)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as LiveProduct[];
  if (!rows.length) return [];
  const sellerIds = [...new Set(rows.map((product) => product.seller_id))];
  const [sellersResult, ratingsResult] = await Promise.all([
    client.from("public_seller_profiles").select("id, first_name, last_name").in("id", sellerIds),
    client
      .from("seller_product_ratings")
      .select("product_id, review_count, average_rating")
      .in(
        "product_id",
        rows.map((product) => product.id),
      ),
  ]);
  if (sellersResult.error) throw sellersResult.error;
  if (ratingsResult.error) throw ratingsResult.error;
  const sellers = new Map(
    ((sellersResult.data ?? []) as SellerProfile[]).map((seller) => [
      seller.id,
      `${seller.first_name} ${seller.last_name}`.trim(),
    ]),
  );
  const ratings = new Map(
    ((ratingsResult.data ?? []) as ProductRating[]).map((rating) => [rating.product_id, rating]),
  );
  return rows.map((product) => {
    const rating = ratings.get(product.id);
    const averageRating = rating ? Number(rating.average_rating).toFixed(1) : "0.0";
    return {
      id: Number.parseInt(product.id.replaceAll("-", "").slice(0, 12), 16),
      name: product.name,
      brand: sellers.get(product.seller_id) ?? "SupreCart seller",
      category: product.category,
      price: Number(product.price),
      rating: averageRating,
      reviews: String(rating?.review_count ?? 0),
      seller: sellers.get(product.seller_id) ?? "SupreCart seller",
      sellerRating: averageRating,
      image: client.storage.from("product-images").getPublicUrl(product.image_path).data.publicUrl,
    };
  });
}
