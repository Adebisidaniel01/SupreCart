import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/components/storefront";
import { money } from "@/lib/catalog";

type ShippingDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  note: string;
};

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout preview — CoreCart" },
      {
        name: "description",
        content: "Review your basket and delivery details in the CoreCart checkout preview.",
      },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { cart, cartSubtotal } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<"delivery" | "review" | "complete">("delivery");
  const [details, setDetails] = useState<ShippingDetails | null>(null);

  function submitDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setDetails({
      firstName: String(data.get("firstName")).trim(),
      lastName: String(data.get("lastName")).trim(),
      email: String(data.get("email")).trim(),
      phone: String(data.get("phone")).trim(),
      address: String(data.get("address")).trim(),
      city: String(data.get("city")).trim(),
      state: String(data.get("state")).trim(),
      note: String(data.get("note")).trim(),
    });
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (cart.length === 0 && step !== "complete")
    return (
      <main className="page-width checkout-empty">
        <PackageCheck size={36} />
        <p className="eyebrow">YOUR BAG IS EMPTY</p>
        <h1>Good finds are waiting.</h1>
        <p>Add a few things to your bag before heading to checkout.</p>
        <Button asChild>
          <Link to="/shop" search={{ filter: "All" }}>
            Explore the marketplace <ArrowRight size={16} />
          </Link>
        </Button>
      </main>
    );

  return (
    <main className="page-width checkout-main">
      <Link to="/shop" search={{ filter: "All" }} className="back-link">
        <ArrowLeft size={15} /> Back to shopping
      </Link>
      <div className="checkout-heading">
        <div>
          <p className="eyebrow">THE CORECART MARKETPLACE</p>
          <h1>{step === "complete" ? "Preview complete" : "Checkout"}</h1>
          <p className="shop-intro">This is a checkout preview. No payment will be collected.</p>
        </div>
        <span className="secure-label">
          <LockKeyhole size={14} /> Checkout preview
        </span>
      </div>
      <div className="checkout-layout">
        <section className="checkout-flow">
          {step !== "complete" && (
            <div className="checkout-steps">
              <span className={step === "delivery" ? "step-active" : "step-done"}>
                <b>1</b> Delivery
              </span>
              <span className={step === "review" ? "step-active" : ""}>
                <b>2</b> Review
              </span>
              <span>
                <b>3</b> Finish
              </span>
            </div>
          )}
          {step === "delivery" && (
            <form className="checkout-card account-form" onSubmit={submitDelivery}>
              <div className="checkout-card-title">
                <MapPin size={19} />
                <div>
                  <h2>Where should we send it?</h2>
                  <p>Enter delivery details for this preview.</p>
                </div>
              </div>
              <div className="field-pair">
                <label>
                  First name
                  <input name="firstName" autoComplete="given-name" required />
                </label>
                <label>
                  Last name
                  <input name="lastName" autoComplete="family-name" required />
                </label>
              </div>
              <div className="field-pair">
                <label>
                  Email address
                  <input type="email" name="email" autoComplete="email" required />
                </label>
                <label>
                  Phone number
                  <input type="tel" name="phone" autoComplete="tel" placeholder="+234" required />
                </label>
              </div>
              <label>
                Street address
                <input name="address" autoComplete="street-address" required />
              </label>
              <div className="field-pair">
                <label>
                  City
                  <input name="city" autoComplete="address-level2" required />
                </label>
                <label>
                  State
                  <input name="state" autoComplete="address-level1" required />
                </label>
              </div>
              <label>
                Delivery note <span className="optional-label">Optional</span>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Anything the delivery person should know?"
                />
              </label>
              <Button size="lg" type="submit">
                Review your basket <ArrowRight size={16} />
              </Button>
            </form>
          )}
          {step === "review" && details && (
            <div className="checkout-card">
              <div className="checkout-card-title">
                <ShieldCheck size={19} />
                <div>
                  <h2>Review before you continue</h2>
                  <p>Check the details below. No payment is taken in this preview.</p>
                </div>
              </div>
              <div className="delivery-summary">
                <strong>
                  {details.firstName} {details.lastName}
                </strong>
                <span>
                  {details.address}, {details.city}, {details.state}
                </span>
                <span>
                  {details.email} · {details.phone}
                </span>
                {details.note && <span>Note: {details.note}</span>}
              </div>
              <div className="checkout-lines">
                {cart.map((item) => (
                  <div className="checkout-line" key={`${item.product.id}-${item.size}`}>
                    <img src={item.product.image} alt="" />
                    <div>
                      <strong>{item.product.name}</strong>
                      <span>
                        {item.product.seller} · Qty {item.quantity}
                        {item.size ? ` · ${item.size}` : ""}
                      </span>
                    </div>
                    <strong>{money(item.product.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
              <p className="payment-preview">
                Payment options will be connected before launch. This preview does not collect card
                or bank details.
              </p>
              <div className="checkout-actions">
                <Button variant="outline" onClick={() => setStep("delivery")}>
                  <ArrowLeft size={16} /> Edit delivery
                </Button>
                <Button size="lg" onClick={() => setStep("complete")}>
                  Finish preview <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}
          {step === "complete" && (
            <div className="checkout-card checkout-complete">
              <span className="success-mark">
                <Check />
              </span>
              <p className="eyebrow">THANKS FOR TRYING THE PREVIEW</p>
              <h2>Your checkout preview is complete.</h2>
              <p>
                No order was placed and no payment or email was sent. Real checkout will be
                available when secure payment and delivery services are connected.
              </p>
              <Button onClick={() => navigate({ to: "/shop", search: { filter: "All" } })}>
                Keep exploring <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </section>
        <aside className="order-summary">
          <div className="checkout-card-title">
            <PackageCheck size={19} />
            <div>
              <h2>Your basket</h2>
              <p>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items from independent sellers
              </p>
            </div>
          </div>
          {cart.map((item) => (
            <div className="checkout-summary-line" key={`${item.product.id}-${item.size}`}>
              <img src={item.product.image} alt="" />
              <div>
                <strong>{item.product.name}</strong>
                <span>
                  {item.product.seller} · Qty {item.quantity}
                </span>
              </div>
              <b>{money(item.product.price * item.quantity)}</b>
            </div>
          ))}
          <div className="summary-totals">
            <span>Subtotal</span>
            <strong>{money(cartSubtotal)}</strong>
            <span>Delivery</span>
            <span>Calculated at launch</span>
            <span className="summary-total">Total preview</span>
            <strong className="summary-total">{money(cartSubtotal)}</strong>
          </div>
          <p className="demo-disclaimer">
            <ShieldCheck size={15} /> Preview only: prices, delivery, and payment are not final.
          </p>
        </aside>
      </div>
    </main>
  );
}
