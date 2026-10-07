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
];

export const categories = ["Clothing", "Footwear", "Home", "Electronics", "Accessories", "Beauty"];
export const brands = [
  "Nike",
  "Adidas",
  "Jordan",
  "New Balance",
  "Vans",
  "North & Loom",
  "Form & Field",
  "Sonora",
];
export const money = (n: number) => `₦${n.toLocaleString("en-NG")}`;
