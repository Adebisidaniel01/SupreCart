import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const pages: Record<string, { title: string; eyebrow: string; body: string[] }> = {
  about: {
    title: "Good finds, good people.",
    eyebrow: "ABOUT CORECART",
    body: [
      "CoreCart is a buyer-first marketplace bringing independent sellers and thoughtful finds together in one easy place.",
      "From everyday style and footwear to home, tech, accessories and beauty, we’re here to make discovering something great feel simple.",
      "Our seller and product details are preview content while the marketplace is being prepared for launch.",
    ],
  },
  contact: {
    title: "We’re here to help.",
    eyebrow: "CONTACT",
    body: [
      "For more inquiries, contact us on 080-800800800.",
      "Our customer-care hours and dedicated support channels will be shared when the marketplace launches.",
    ],
  },
  shipping: {
    title: "Delivery, made clear.",
    eyebrow: "SHIPPING INFORMATION",
    body: [
      "Delivery options, destinations, costs and estimated arrival times will be confirmed at checkout when our delivery partners are connected.",
      "This storefront is a preview. Submitting checkout details here does not create a delivery request.",
    ],
  },
  returns: {
    title: "A little peace of mind.",
    eyebrow: "RETURNS & EXCHANGES",
    body: [
      "Our final returns and exchanges policy will be published before the marketplace opens for orders.",
      "This preview does not accept orders or process returns.",
    ],
  },
  faq: {
    title: "The essentials, answered.",
    eyebrow: "FREQUENTLY ASKED QUESTIONS",
    body: [
      "Is CoreCart live? The storefront is currently a product and buyer-experience preview.",
      "Can I place an order? You can explore the checkout preview, but orders and payments are not processed.",
      "Are sellers and ratings real? Seller names, ratings and products shown here are sample marketplace content.",
    ],
  },
  privacy: {
    title: "Your trust matters.",
    eyebrow: "PRIVACY",
    body: [
      "This preview stores demo cart, wishlist and account details only in your browser. Do not enter sensitive personal or payment information.",
      "No actual email verification, newsletter signup, account authentication or payment service is connected yet. A complete privacy notice will be published before launch.",
    ],
  },
  terms: {
    title: "A marketplace in preview.",
    eyebrow: "TERMS",
    body: [
      "CoreCart is currently a demonstration storefront. Product descriptions, prices, seller information and ratings are illustrative and may not represent items available for purchase.",
      "No order, payment, delivery, subscription or seller transaction is created through this preview.",
    ],
  },
  size: {
    title: "Find your right fit.",
    eyebrow: "SIZE GUIDE",
    body: [
      "Where sizing applies, displayed sizes are illustrative. Fit and sizing can vary by maker and product.",
      "Check the product details or contact the seller for exact measurements before ordering once the marketplace is live.",
    ],
  },
};

export const Route = createFileRoute("/info/$slug")({
  head: () => ({ meta: [{ title: "Marketplace information — CoreCart" }] }),
  component: InfoPage,
});

function InfoPage() {
  const { slug } = Route.useParams();
  const page = pages[slug] ?? pages.about;
  return (
    <main className="page-width info-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back to CoreCart
      </Link>
      <section className="info-card">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        {page.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <Button asChild>
          <Link to="/shop" search={{ filter: "All" }}>
            Explore the marketplace <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
    </main>
  );
}
