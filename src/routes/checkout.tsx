import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  MapPin,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/components/storefront";
import { money, type Product } from "@/lib/catalog";

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
type ReceiptLine = {
  product: Product;
  size: string;
  quantity: number;
  subtotal: number;
  vat: number;
};
type PreviewOrder = {
  batchNumber: string;
  createdAt: string;
  lines: ReceiptLine[];
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  deliveryState: string;
  shipments: { seller: string; trackingNumber: string }[];
};

const VAT_RATE = 0.075;
const DELIVERY_BY_STATE: Record<string, number> = {
  lagos: 2500,
  "federal capital territory": 3500,
  fct: 3500,
  ogun: 3500,
  oyo: 3500,
  osun: 3500,
  ekiti: 4500,
  edo: 4500,
  delta: 4500,
  rivers: 4500,
  kano: 5500,
  kaduna: 5500,
  enugu: 5500,
  anambra: 5500,
  abia: 5500,
  plateau: 5500,
  default: 6500,
};

function deliveryPerSeller(state: string) {
  return DELIVERY_BY_STATE[state.trim().toLowerCase()] ?? DELIVERY_BY_STATE["default"] ?? 0;
}

function createReference(prefix: string) {
  const token = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12).toUpperCase();
  if (!token) throw new Error("Secure preview order references are not available in this browser.");
  return `${prefix}-${token}`;
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout preview — CoreCart" },
      {
        name: "description",
        content:
          "Review your itemized receipt, tax and delivery fees in the CoreCart checkout preview.",
      },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { cart, cartSubtotal, setCart } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<"delivery" | "receipt" | "complete">("delivery");
  const [details, setDetails] = useState<ShippingDetails | null>(null);
  const [order, setOrder] = useState<PreviewOrder | null>(null);
  const [orderError, setOrderError] = useState("");

  const sellers = [...new Set(cart.map((item) => item.product.seller))];
  const deliveryFee = details ? deliveryPerSeller(details.state) * sellers.length : 0;
  const vat = cart.reduce(
    (sum, item) => sum + Math.round(item.product.price * item.quantity * VAT_RATE),
    0,
  );
  const total = cartSubtotal + vat + deliveryFee;

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
    setStep("receipt");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmPreviewOrder() {
    if (!details || cart.length === 0) return;
    setOrderError("");
    try {
      const lines = cart.map((item) => {
        const subtotal = item.product.price * item.quantity;
        return {
          product: item.product,
          size: item.size,
          quantity: item.quantity,
          subtotal,
          vat: Math.round(subtotal * VAT_RATE),
        };
      });
      const orderPreview: PreviewOrder = {
        batchNumber: createReference("CC-BATCH"),
        createdAt: new Date().toISOString(),
        lines,
        subtotal: cartSubtotal,
        vat,
        deliveryFee,
        total,
        deliveryState: details.state,
        shipments: sellers.map((seller) => ({
          seller,
          trackingNumber: createReference("CC-TRACK"),
        })),
      };
      const savedOrders = localStorage.getItem("corecart-preview-orders");
      const orders = savedOrders ? (JSON.parse(savedOrders) as PreviewOrder[]) : [];
      localStorage.setItem("corecart-preview-orders", JSON.stringify([orderPreview, ...orders]));
      setOrder(orderPreview);
      setCart([]);
      setStep("complete");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Could not save the CoreCart preview order.", error);
      setOrderError("We couldn’t save your demo order in this browser. Please try again.");
    }
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
          <h1>{step === "complete" ? "Preview order receipt" : "Checkout"}</h1>
          <p className="shop-intro">
            Demo checkout only. No real order is placed or payment collected.
          </p>
        </div>
        <span className="secure-label">
          <ReceiptText size={14} /> Itemized receipt preview
        </span>
      </div>
      <div className="checkout-layout">
        <section className="checkout-flow">
          {step !== "complete" && (
            <div className="checkout-steps">
              <span className={step === "delivery" ? "step-active" : "step-done"}>
                <b>1</b> Delivery
              </span>
              <span className={step === "receipt" ? "step-active" : ""}>
                <b>2</b> Receipt
              </span>
              <span>
                <b>3</b> Confirm preview
              </span>
            </div>
          )}
          {step === "delivery" && (
            <form className="checkout-card account-form" onSubmit={submitDelivery}>
              <div className="checkout-card-title">
                <MapPin size={19} />
                <div>
                  <h2>Where should we send it?</h2>
                  <p>Delivery cost is estimated from your destination state.</p>
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
                  <input
                    name="state"
                    autoComplete="address-level1"
                    placeholder="e.g. Lagos"
                    required
                  />
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
                Generate receipt <ArrowRight size={16} />
              </Button>
            </form>
          )}
          {step === "receipt" && details && (
            <div className="checkout-card receipt-card">
              <div className="checkout-card-title">
                <ReceiptText size={19} />
                <div>
                  <h2>Your itemized receipt</h2>
                  <p>Review the items, estimated tax and destination delivery charges.</p>
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
                {details.note && <span>Delivery note: {details.note}</span>}
              </div>
              <div className="receipt-lines">
                {cart.map((item) => {
                  const lineSubtotal = item.product.price * item.quantity;
                  return (
                    <div className="receipt-line" key={`${item.product.id}-${item.size}`}>
                      <img src={item.product.image} alt="" />
                      <div className="receipt-line-info">
                        <strong>{item.product.name}</strong>
                        <span>
                          {item.product.seller} · Qty {item.quantity}
                          {item.size !== "One size" ? ` · Size ${item.size}` : ""}
                        </span>
                        <span>
                          {money(item.product.price)} × {item.quantity}
                        </span>
                      </div>
                      <div className="receipt-line-price">
                        <strong>{money(lineSubtotal)}</strong>
                        <span>VAT {money(Math.round(lineSubtotal * VAT_RATE))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="delivery-explainer">
                <Truck size={15} /> Delivery to {details.state} is charged per seller shipment (
                {sellers.length} {sellers.length === 1 ? "seller" : "sellers"}).
              </p>
              <div className="checkout-actions">
                <Button variant="outline" onClick={() => setStep("delivery")}>
                  <ArrowLeft size={16} /> Edit delivery
                </Button>
                <Button size="lg" onClick={confirmPreviewOrder}>
                  Confirm preview order <ArrowRight size={16} />
                </Button>
              </div>
              {orderError && (
                <p className="form-error" role="alert">
                  {orderError}
                </p>
              )}
              <p className="payment-preview">
                Preview estimates only: VAT is shown at 7.5%. Delivery rates are demo rates and will
                need confirmation before launch. No payment will be collected.
              </p>
            </div>
          )}
          {step === "complete" && order && (
            <div className="checkout-card checkout-complete order-receipt">
              <span className="success-mark">
                <Check />
              </span>
              <p className="eyebrow">DEMO ORDER CONFIRMATION</p>
              <h2>Your preview receipt is ready.</h2>
              <p>
                These sample references are stored in this browser only. No order was sent to a
                seller and no parcel is being shipped.
              </p>
              <div className="reference-card">
                <span>
                  <ClipboardList size={15} /> Batch number
                </span>
                <strong>{order.batchNumber}</strong>
              </div>
              <p className="order-created-at">
                Preview created {new Date(order.createdAt).toLocaleString("en-NG")}
              </p>
              <h3>Demo tracking references</h3>
              {order.shipments.map((shipment) => (
                <div className="reference-card" key={shipment.trackingNumber}>
                  <span>
                    <Truck size={15} /> {shipment.seller}
                  </span>
                  <strong>{shipment.trackingNumber}</strong>
                </div>
              ))}
              <ReceiptBreakdown
                subtotal={order.subtotal}
                vat={order.vat}
                deliveryFee={order.deliveryFee}
                total={order.total}
                deliveryState={order.deliveryState}
              />
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
              <h2>{step === "complete" ? "Receipt summary" : "Your basket"}</h2>
              <p>
                {step === "complete"
                  ? "Saved as a local preview only"
                  : `${cart.reduce((sum, item) => sum + item.quantity, 0)} items from independent sellers`}
              </p>
            </div>
          </div>
          {(step === "complete" && order ? order.lines : cart).map((entry) => {
            const isReceiptLine = isReceiptEntry(entry);
            const item = isReceiptLine
              ? {
                  product: entry.product,
                  quantity: entry.quantity,
                  lineTotal: entry.subtotal,
                }
              : {
                  product: entry.product,
                  quantity: entry.quantity,
                  lineTotal: entry.product.price * entry.quantity,
                };
            return (
              <div
                className="checkout-summary-line"
                key={`${item.product.id}-${item.quantity}-${isReceiptLine ? entry.size : ""}`}
              >
                <img src={item.product.image} alt="" />
                <div>
                  <strong>{item.product.name}</strong>
                  <span>
                    {item.product.seller} · Qty {item.quantity}
                  </span>
                </div>
                <b>{money(item.lineTotal)}</b>
              </div>
            );
          })}
          <ReceiptBreakdown
            subtotal={step === "complete" && order ? order.subtotal : cartSubtotal}
            vat={step === "complete" && order ? order.vat : vat}
            deliveryFee={step === "complete" && order ? order.deliveryFee : deliveryFee}
            total={step === "complete" && order ? order.total : total}
            deliveryState={step === "complete" && order ? order.deliveryState : details?.state}
          />
          <p className="demo-disclaimer">
            <ShieldCheck size={15} /> Demo estimate only: tax and delivery rates must be confirmed
            before live checkout.
          </p>
        </aside>
      </div>
    </main>
  );
}

function ReceiptBreakdown({
  subtotal,
  vat,
  deliveryFee,
  total,
  deliveryState,
}: {
  subtotal: number;
  vat: number;
  deliveryFee: number;
  total: number;
  deliveryState: string | undefined;
}) {
  return (
    <div className="summary-totals receipt-breakdown">
      <span>Items subtotal</span>
      <strong>{money(subtotal)}</strong>
      <span>VAT (7.5%)</span>
      <strong>{money(vat)}</strong>
      <span>Delivery{deliveryState ? ` · ${deliveryState}` : ""}</span>
      <strong>{deliveryState ? money(deliveryFee) : "Calculated after address"}</strong>
      <span className="summary-total">Estimated total</span>
      <strong className="summary-total">{money(total)}</strong>
    </div>
  );
}

function isReceiptEntry(
  entry: ReceiptLine | { product: Product; quantity: number; size: string },
): entry is ReceiptLine {
  return "subtotal" in entry;
}
