import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const pages: Record<string, { title: string; eyebrow: string; body: string[] }> = {
  about: {
    title: "Good finds, good people.",
    eyebrow: "ABOUT SUPRECART",
    body: [
      "SupreCart is a buyer-first marketplace bringing independent sellers and thoughtful finds together in one easy place.",
      "From everyday style and footwear to home, tech, accessories and beauty, we’re here to make discovering something great feel simple.",
      "This preview uses illustrative seller and product details; live inventory will be confirmed before launch.",
    ],
  },
  contact: {
    title: "We’re here to help.",
    eyebrow: "CONTACT",
    body: [
      "For other enquiries, call us on 09015505210.",
      "Full customer-care hours and dedicated support channels will be shared when live checkout launches.",
    ],
  },
  shipping: {
    title: "Delivery, made clear.",
    eyebrow: "SHIPPING INFORMATION",
    body: [
      "Delivery options, destinations, costs and estimated arrival times will be confirmed at checkout when our delivery partners are connected.",
      "Submitting checkout details here does not create a delivery request.",
    ],
  },
  returns: {
    title: "A little peace of mind.",
    eyebrow: "RETURNS & EXCHANGES",
    body: [
      "Our final returns and exchanges policy will be published before the marketplace opens for orders.",
      "This storefront does not accept orders or process returns.",
    ],
  },
  faq: {
    title: "The essentials, answered.",
    eyebrow: "FREQUENTLY ASKED QUESTIONS",
    body: [
      "Is SupreCart live? The storefront is currently a product and buyer-experience showcase.",
      "Can I place an order? You can explore checkout, but orders and payments are not processed.",
      "Are sellers and ratings real? Seller names, ratings and products shown here are seeded marketplace content.",
    ],
  },
  "privacy-terms": {
    title: "Privacy & terms.",
    eyebrow: "PRIVACY & TERMS",
    body: [
      "Cart, wishlist and account details are stored only in your browser. Do not enter sensitive personal or payment information.",
      "If you allow analytics cookies, we use Google Analytics to understand how the storefront and seller portal are used. Analytics can see product and cart events, but never your name, email address, delivery address, password or payment details.",
      "Product descriptions, prices, seller information and ratings are illustrative and may not represent items available for purchase. No order, payment, delivery, subscription or seller transaction is created through this storefront.",
      "No actual email verification, newsletter signup, account authentication or payment service is connected yet. A complete privacy notice and marketplace terms will be published before launch.",
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
  cookies: {
    title: "Cookies, kept simple.",
    eyebrow: "COOKIE POLICY",
    body: [
      "SupreCart uses one essential first-party cookie to remember your cookie choice. It does not track you across other sites.",
      "If you allow analytics, we load Google Analytics (GA4) to measure page views, searches, cart activity, wishlist use, checkout steps and errors. Google Analytics cookies stay off until you accept analytics, and you can reject or manage them from the banner. Marketing cookies are not installed.",
      "To change your mind, clear this site's cookies and choose again from the banner.",
      "Cart, wishlist and account details are stored only in your browser. Do not enter sensitive personal or payment information.",
    ],
  },
};

export const Route = createFileRoute("/info/$slug")({
  head: () => ({ meta: [{ title: "Marketplace information — SupreCart" }] }),
  component: InfoPage,
});

function InfoPage() {
  const { slug } = Route.useParams();
  const page = pages[slug];
  if (!page) {
    return (
      <main id="main-content" tabIndex={-1} className="page-width info-page">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} /> Back to SupreCart
        </Link>
        <section className="info-card">
          <p className="eyebrow">INFORMATION · NOT FOUND</p>
          <h1>That page isn’t here.</h1>
          <p>
            The information page you’re looking for may have moved. Head back to the marketplace or
            get in touch with customer care.
          </p>
          <Button asChild>
            <Link to="/">Back to SupreCart</Link>
          </Button>
        </section>
      </main>
    );
  }
  return (
    <main id="main-content" tabIndex={-1} className="page-width info-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back to SupreCart
      </Link>
      <section className="info-card">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        {page.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <Button asChild>
          <Link to="/shop" search={{ filter: "All", query: "" }}>
            Explore the marketplace <ArrowRight size={16} />
          </Link>
        </Button>
      </section>
    </main>
  );
}
