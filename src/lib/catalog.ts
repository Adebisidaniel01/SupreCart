import nike from "@/assets/product-0.jpg";
import adidas from "@/assets/product-1.jpg";
import jordan from "@/assets/product-2.jpg";
import newBalance from "@/assets/product-3.jpg";
import vans from "@/assets/product-4.jpg";

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
  label?: string;
};

export const products: Product[] = [
  {
    id: 1,
    name: "Nike Air Force 1 '07",
    brand: "Nike",
    category: "Footwear",
    price: 185000,
    rating: "4.8",
    reviews: "2.4k",
    seller: "The Sole House",
    sellerRating: "4.9",
    image: nike,
    label: "Bestseller",
  },
  {
    id: 2,
    name: "Adidas Superstar",
    brand: "Adidas",
    category: "Footwear",
    price: 145000,
    rating: "4.7",
    reviews: "1.8k",
    seller: "The Sole House",
    sellerRating: "4.8",
    image: adidas,
  },
  {
    id: 3,
    name: "Air Jordan 4 Retro",
    brand: "Jordan",
    category: "Footwear",
    price: 320000,
    rating: "4.9",
    reviews: "3.2k",
    seller: "Lace & Legacy",
    sellerRating: "5.0",
    image: jordan,
    label: "Popular",
  },
  {
    id: 4,
    name: "New Balance 530",
    brand: "New Balance",
    category: "Footwear",
    price: 175000,
    rating: "4.6",
    reviews: "980",
    seller: "The Sole House",
    sellerRating: "4.9",
    image: newBalance,
  },
  {
    id: 5,
    name: "Vans Old Skool",
    brand: "Vans",
    category: "Footwear",
    price: 110000,
    rating: "4.7",
    reviews: "2.1k",
    seller: "Street Culture NG",
    sellerRating: "4.7",
    image: vans,
  },
  {
    id: 6,
    name: "Everyday Linen Shirt",
    brand: "North & Loom",
    category: "Clothing",
    price: 38500,
    rating: "4.8",
    reviews: "126",
    seller: "North & Loom",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85",
    label: "New",
  },
  {
    id: 7,
    name: "Studio Ceramic Set",
    brand: "Form & Field",
    category: "Home",
    price: 52000,
    rating: "4.9",
    reviews: "84",
    seller: "Form & Field",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 8,
    name: "Aura Wireless Headphones",
    brand: "Sonora",
    category: "Electronics",
    price: 128000,
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
    name: "Everyday Leather Tote",
    brand: "Atelier Nia",
    category: "Accessories",
    price: 68000,
    rating: "4.8",
    reviews: "57",
    seller: "Atelier Nia",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 10,
    name: "Botanical Skin Ritual",
    brand: "Serein",
    category: "Beauty",
    price: 42000,
    rating: "4.6",
    reviews: "203",
    seller: "Serein Beauty",
    sellerRating: "4.7",
    image:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 11,
    name: "Ribbed Cotton Knit",
    brand: "North & Loom",
    category: "Clothing",
    price: 46500,
    rating: "4.8",
    reviews: "92",
    seller: "North & Loom",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=85",
    label: "Just landed",
  },
  {
    id: 12,
    name: "Sculpted Stoneware Vase",
    brand: "Form & Field",
    category: "Home",
    price: 36500,
    rating: "4.8",
    reviews: "61",
    seller: "Form & Field",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 13,
    name: "Sonora Pocket Speaker",
    brand: "Sonora",
    category: "Electronics",
    price: 89500,
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
    name: "Everyday Leather Wallet",
    brand: "Atelier Nia",
    category: "Accessories",
    price: 31500,
    rating: "4.7",
    reviews: "43",
    seller: "Atelier Nia",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 15,
    name: "Serein Daily Hydration",
    brand: "Serein",
    category: "Beauty",
    price: 29500,
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
    name: "Weekend Oxford Shirt",
    brand: "North & Loom",
    category: "Clothing",
    price: 42000,
    rating: "4.7",
    reviews: "73",
    seller: "North & Loom",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 17,
    name: "Hand-thrown Coffee Cups",
    brand: "Form & Field",
    category: "Home",
    price: 28000,
    rating: "4.9",
    reviews: "96",
    seller: "Form & Field",
    sellerRating: "4.8",
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85",
    label: "Small batch",
  },
  {
    id: 18,
    name: "Studio Ambient Table Light",
    brand: "Sonora",
    category: "Electronics",
    price: 74000,
    rating: "4.6",
    reviews: "38",
    seller: "Sound House Lagos",
    sellerRating: "4.9",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 19,
    name: "Sunday Market Sunglasses",
    brand: "Atelier Nia",
    category: "Accessories",
    price: 38500,
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
    name: "Serein Botanical Cleanser",
    brand: "Serein",
    category: "Beauty",
    price: 24500,
    rating: "4.7",
    reviews: "81",
    seller: "Serein Beauty",
    sellerRating: "4.7",
    image:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85",
  },
];

export const categories = ["Clothing", "Footwear", "Home", "Electronics", "Accessories", "Beauty"];
export const brands = [...new Set(products.map((product) => product.brand))];
export const money = (n: number) => `₦${n.toLocaleString("en-NG")}`;
