export type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  rating: string;
  reviews: string;
  seller: string;
  sellerRating: string;
  image: string;
  marketplaceProductId?: string;
  sellerId?: string;
  sellerVerified?: boolean;
  label?: string;
};

export function sellerIsVerified(seller: string): boolean {
  return seller.trim().length > 0;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Nike Air Force 1 '07",
    brand: "Nike",
    category: "Footwear",
    price: 85000,
    rating: "4.8",
    reviews: "2.4k",
    seller: "The Sole House",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
    label: "Bestseller",
  },
  {
    id: 2,
    name: "Adidas Superstar",
    brand: "Adidas",
    category: "Footwear",
    price: 72000,
    rating: "4.7",
    reviews: "1.8k",
    seller: "The Sole House",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    name: "Air Jordan 4 Retro",
    brand: "Jordan",
    category: "Footwear",
    price: 120000,
    rating: "4.9",
    reviews: "3.2k",
    seller: "Lace & Legacy",
    sellerRating: "5.0",
    image:
      "https://images.unsplash.com/photo-1680204101489-2c1319c872b2?auto=format&fit=crop&w=900&q=85",
    label: "Popular",
  },
  {
    id: 4,
    name: "New Balance 530",
    brand: "New Balance",
    category: "Footwear",
    price: 95000,
    rating: "4.6",
    reviews: "980",
    seller: "The Sole House",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1680204101400-aeac783c9d87?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 5,
    name: "Vans Old Skool",
    brand: "Vans",
    category: "Footwear",
    price: 65000,
    rating: "4.7",
    reviews: "2.1k",
    seller: "Street Culture NG",
    sellerRating: "4.7",
    image:
      "https://images.unsplash.com/photo-1634624943287-6e1f2d103201?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    name: "Campus Oversized Hoodie",
    brand: "UniWear",
    category: "Clothing",
    price: 24500,
    rating: "4.8",
    reviews: "126",
    seller: "UniWear Lagos",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
    label: "Student pick",
  },
  {
    id: 7,
    name: "Ribbed Cotton Knit",
    brand: "North & Loom",
    category: "Clothing",
    price: 18500,
    rating: "4.8",
    reviews: "92",
    seller: "North & Loom",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=85",
    label: "Just landed",
  },
  {
    id: 8,
    name: "Aura Wireless Headphones",
    brand: "Sonora",
    category: "Electronics",
    price: 68000,
    rating: "4.7",
    reviews: "319",
    seller: "Sound House Lagos",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
    label: "Top rated",
  },
  {
    id: 9,
    name: "North Campus Backpack",
    brand: "Campus Supply",
    category: "Accessories",
    price: 28500,
    rating: "4.8",
    reviews: "57",
    seller: "The Study Store",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
    label: "New",
  },
  {
    id: 10,
    name: "Everyday Sunscreen SPF 50",
    brand: "Serein",
    category: "Beauty",
    price: 12500,
    rating: "4.6",
    reviews: "203",
    seller: "Serein Beauty",
    sellerRating: "4.7",
    image:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 11,
    name: "Oversized Study Tee",
    brand: "UniWear",
    category: "Clothing",
    price: 12500,
    rating: "4.8",
    reviews: "118",
    seller: "UniWear Lagos",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
    label: "Community pick",
  },
  {
    id: 12,
    name: "LED Study Desk Lamp",
    brand: "Dorm Depot",
    category: "Home",
    price: 22500,
    rating: "4.8",
    reviews: "61",
    seller: "Dorm Depot",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    label: "Student pick",
  },
  {
    id: 13,
    name: "Sonora Pocket Speaker",
    brand: "Sonora",
    category: "Electronics",
    price: 42000,
    rating: "4.7",
    reviews: "147",
    seller: "Sound House Lagos",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85",
    label: "Bestseller",
  },
  {
    id: 14,
    name: "A5 Study Notebook Set",
    brand: "Study Co.",
    category: "Accessories",
    price: 6500,
    rating: "4.9",
    reviews: "96",
    seller: "The Study Store",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85",
    label: "Small batch",
  },
  {
    id: 15,
    name: "Serein Daily Hydration",
    brand: "Serein",
    category: "Beauty",
    price: 16500,
    rating: "4.8",
    reviews: "118",
    seller: "Serein Beauty",
    sellerRating: "4.7",
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85",
    label: "Community pick",
  },
  {
    id: 16,
    name: "Noise-Cancelling Earbuds",
    brand: "Sonora",
    category: "Electronics",
    price: 38500,
    rating: "4.7",
    reviews: "38",
    seller: "Sound House Lagos",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 17,
    name: "Dorm Bedding Set",
    brand: "Dorm Depot",
    category: "Home",
    price: 32000,
    rating: "4.8",
    reviews: "52",
    seller: "Dorm Depot",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=85",
    label: "Just landed",
  },
  {
    id: 18,
    name: "Insulated Water Bottle",
    brand: "Dorm Depot",
    category: "Accessories",
    price: 9500,
    rating: "4.7",
    reviews: "81",
    seller: "Dorm Depot",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 19,
    name: "Sunday Market Sunglasses",
    brand: "Atelier Nia",
    category: "Accessories",
    price: 16500,
    rating: "4.8",
    reviews: "52",
    seller: "Atelier Nia",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85",
    label: "Just landed",
  },
  {
    id: 20,
    name: "Slim Fast-Charge Power Bank",
    brand: "Campus Tech",
    category: "Electronics",
    price: 18500,
    rating: "4.7",
    reviews: "143",
    seller: "Campus Tech Hub",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=85",
    label: "Student pick",
  },
  {
    id: 21,
    name: "Compact Alarm Clock",
    brand: "Dorm Depot",
    category: "Home",
    price: 8500,
    rating: "4.6",
    reviews: "44",
    seller: "Dorm Depot",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1508963493744-76fce69379c0?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 22,
    name: "Nourishing Lip Balm",
    brand: "Serein",
    category: "Beauty",
    price: 4500,
    rating: "4.8",
    reviews: "67",
    seller: "Serein Beauty",
    sellerRating: "4.7",
    image:
      "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85",
    label: "Small batch",
  },
];

export const categories = ["Clothing", "Footwear", "Home", "Electronics", "Accessories", "Beauty"];
export const brands = [...new Set(products.map((product) => product.brand))];
export const money = (n: number) => `₦${n.toLocaleString("en-NG")}`;

const compareAtFactors = [1.18, 1.25, 1.15, 1.3, 1.22, 1.2];

export function compareAtPrice(price: number, id: number): number {
  const factor = compareAtFactors[id % compareAtFactors.length]!;
  return Math.round((price * factor) / 500) * 500;
}

export function discountPercent(price: number, compareAt: number): number {
  return Math.round((1 - price / compareAt) * 100);
}
