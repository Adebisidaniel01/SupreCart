import nike from '@/assets/product-0.jpg';
import adidas from '@/assets/product-1.jpg';
import jordan from '@/assets/product-2.jpg';
import newBalance from '@/assets/product-3.jpg';
import vans from '@/assets/product-4.jpg';
import running from '@/assets/category-0.jpg';
import lifestyle from '@/assets/category-1.jpg';
import basketball from '@/assets/category-2.jpg';
import training from '@/assets/category-3.jpg';
import sneakers from '@/assets/category-4.jpg';
import slides from '@/assets/category-5.jpg';
import boots from '@/assets/category-6.jpg';

export const products = [
  { id: 1, name: "Nike Air Force 1 '07", brand: 'Nike', audience: "Men's Shoes", category: 'Lifestyle', price: 115, rating: '4.8', reviews: '2.4k', image: nike },
  { id: 2, name: 'Adidas Superstar', brand: 'Adidas', audience: 'Unisex Shoes', category: 'Sneakers', price: 90, rating: '4.7', reviews: '1.8k', image: adidas },
  { id: 3, name: 'Air Jordan 4 Retro', brand: 'Nike', audience: "Men's Shoes", category: 'Basketball', price: 210, rating: '4.9', reviews: '3.2k', image: jordan },
  { id: 4, name: 'New Balance 530', brand: 'New Balance', audience: 'Unisex Shoes', category: 'Running', price: 120, rating: '4.6', reviews: '980', image: newBalance },
  { id: 5, name: 'Vans Old Skool', brand: 'Vans', audience: 'Unisex Shoes', category: 'Lifestyle', price: 70, rating: '4.7', reviews: '2.1k', image: vans },
];
export type Product = (typeof products)[number];
export const categories = [
  { name: 'Running', image: running }, { name: 'Lifestyle', image: lifestyle },
  { name: 'Basketball', image: basketball }, { name: 'Training', image: training },
  { name: 'Sneakers', image: sneakers }, { name: 'Slides', image: slides }, { name: 'Boots', image: boots },
];
export const brands = ['Nike', 'Adidas', 'Puma', 'New Balance', 'Converse', 'Vans'];
export const money = (n: number) => `$${n.toFixed(2)}`;