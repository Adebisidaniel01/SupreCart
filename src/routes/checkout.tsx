import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { trackAddShippingInfo, trackBeginCheckout, trackPreviewOrder } from "@/lib/analytics";

type DeliveryMethod = "doorstep" | "pickup";
type PaymentMethod = "paystack" | "bank-transfer" | "pay-on-delivery";
type ShippingDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  method: DeliveryMethod;
  lga: string;
  community: string;
  streetAddress: string;
  landmark: string;
  pickupStationId: string;
  pickupStationName: string;
  pickupStationAddress: string;
  note: string;
};
type PickupStation = { id: string; name: string; address: string; lga: string };
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
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  deliveryDestination: string;
  shipments: { seller: string; trackingNumber: string }[];
};

const VAT_RATE = 0.075;
const PREVIEW_DOORSTEP_FEE = 2500;
const PREVIEW_PICKUP_STATIONS: PickupStation[] = [
  {
    id: "ilorin-west-gra",
    name: "GRA Pickup Point",
    address: "12 Ahmadu Bello Way, GRA",
    lga: "Ilorin West",
  },
  {
    id: "ilorin-south-tanke",
    name: "Tanke Pickup Point",
    address: "8 University Road, Tanke",
    lga: "Ilorin South",
  },
  {
    id: "ilorin-east-fate",
    name: "Fate Pickup Point",
    address: "4 Fate Road, Fate",
    lga: "Ilorin East",
  },
];
const KWARA_LGAS = [
  "Asa",
  "Baruten",
  "Edu",
  "Ekiti",
  "Ifelodun",
  "Ilorin East",
  "Ilorin South",
  "Ilorin West",
  "Irepodun",
  "Isin",
  "Kaiama",
  "Moro",
  "Offa",
  "Oke Ero",
  "Oyun",
  "Pategi",
];

function createReference(prefix: string) {
  const token = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12).toUpperCase();
  if (!token) throw new Error("Secure preview order references are not available in this browser.");
  return `${prefix}-${token}`;
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout preview — SupreCart" },
      {
        name: "description",
        content:
          "Review your itemized receipt, tax and delivery fees in the SupreCart checkout preview.",
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
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("doorstep");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paystack");
  const doorstepFee = PREVIEW_DOORSTEP_FEE;
  const pickupStations = PREVIEW_PICKUP_STATIONS;

  const sellers = [...new Set(cart.map((item) => item.product.seller))];
  const deliveryFee =
    details?.method === "doorstep" && doorstepFee !== null ? doorstepFee * sellers.length : 0;
  const vat = cart.reduce(
    (sum, item) => sum + Math.round(item.product.price * item.quantity * VAT_RATE),
    0,
  );
  const total = cartSubtotal + vat + deliveryFee;
  const checkoutTracked = useRef(false);

  useEffect(() => {
    if (checkoutTracked.current || cart.length === 0) return;
    checkoutTracked.current = true;
    trackBeginCheckout(cart);
  }, [cart]);

  function submitDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const method = String(data.get("deliveryMethod")) as DeliveryMethod;
    const station = pickupStations.find((item) => item.id === String(data.get("pickupStationId")));
    if (method === "pickup" && !station) {
      setOrderError("Choose an active pickup station.");
      return;
    }
    const nextDetails: ShippingDetails = {
      firstName: String(data.get("firstName")).trim(),
      lastName: String(data.get("lastName")).trim(),
      email: String(data.get("email")).trim().toLowerCase(),
      phone: String(data.get("phone")).trim(),
      method,
      lga: String(data.get("lga") ?? "").trim(),
      community: String(data.get("community") ?? "").trim(),
      streetAddress: String(data.get("streetAddress") ?? "").trim(),
      landmark: String(data.get("landmark") ?? "").trim(),
      pickupStationId: station?.id ?? "",
      pickupStationName: station?.name ?? "",
      pickupStationAddress: station?.address ?? "",
      note: String(data.get("note")).trim(),
    };
    setOrderError("");
    setDetails(nextDetails);
    setStep("receipt");
    trackAddShippingInfo(
      cart,
      nextDetails.method === "pickup" ? "Pickup station" : "Doorstep delivery",
    );
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
        deliveryState: "Kwara",
        deliveryMethod: details.method,
        paymentMethod,
        deliveryDestination:
          details.method === "pickup"
            ? `${details.pickupStationName} — ${details.pickupStationAddress}`
            : `${details.streetAddress}, ${details.community}, ${details.lga}, Kwara${details.landmark ? ` · Near ${details.landmark}` : ""}`,
        shipments: sellers.map((seller) => ({
          seller,
          trackingNumber: createReference("CC-TRACK"),
        })),
      };
      const savedOrders = localStorage.getItem("suprecart-preview-orders");
      const orders = savedOrders ? (JSON.parse(savedOrders) as PreviewOrder[]) : [];
      localStorage.setItem("suprecart-preview-orders", JSON.stringify([orderPreview, ...orders]));
      trackPreviewOrder({
        transactionId: orderPreview.batchNumber,
        cart,
        value: total,
        tax: vat,
        shipping: deliveryFee,
        paymentType: paymentMethod,
        deliveryMethod: details.method,
      });
      setOrder(orderPreview);
      setCart([]);
      setStep("complete");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Could not save the SupreCart preview order.", error);
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
          <Link to="/shop" search={{ filter: "All", query: "" }}>
            Explore the marketplace <ArrowRight size={16} />
          </Link>
        </Button>
      </main>
    );

  return (
    <main className="page-width checkout-main">
      <Link to="/shop" search={{ filter: "All", query: "" }} className="back-link">
        <ArrowLeft size={15} /> Back to shopping
      </Link>
      <div className="checkout-heading">
        <div>
          <p className="eyebrow">THE SUPRECART MARKETPLACE</p>
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
                  <h2>Choose how to receive your order</h2>
                  <p>Delivery is currently available in Kwara State only.</p>
                </div>
              </div>
              <fieldset className="delivery-method-options">
                <legend>Delivery option</legend>
                <label>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="doorstep"
                    checked={deliveryMethod === "doorstep"}
                    onChange={() => setDeliveryMethod("doorstep")}
                  />
                  <span>
                    <strong>Doorstep delivery</strong>
                    <small>{money(doorstepFee)} per seller shipment</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="pickup"
                    checked={deliveryMethod === "pickup"}
                    onChange={() => setDeliveryMethod("pickup")}
                  />
                  <span>
                    <strong>Pick up from a station</strong>
                    <small>Collect your order from a SupreCart pickup location</small>
                  </span>
                </label>
              </fieldset>
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
              {deliveryMethod === "doorstep" ? (
                <>
                  <div className="field-pair">
                    <label>
                      Kwara LGA
                      <select name="lga" required defaultValue="">
                        <option value="" disabled>
                          Select your LGA
                        </option>
                        {KWARA_LGAS.map((lga) => (
                          <option key={lga}>{lga}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Community / area
                      <input name="community" autoComplete="address-level2" required />
                    </label>
                  </div>
                  <label>
                    Street address
                    <input name="streetAddress" autoComplete="street-address" required />
                  </label>
                  <label>
                    Nearby landmark <span className="optional-label">Optional</span>
                    <input name="landmark" placeholder="A nearby landmark to help the rider" />
                  </label>
                </>
              ) : (
                <label>
                  Pickup station
                  <select name="pickupStationId" required defaultValue="">
                    <option value="" disabled>
                      Select a pickup station
                    </option>
                    {pickupStations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name} — {station.lga}
                      </option>
                    ))}
                  </select>
                  {pickupStations.length === 0 && (
                    <small>No active pickup stations are configured yet.</small>
                  )}
                </label>
              )}
              <label>
                {deliveryMethod === "pickup" ? "Pickup note" : "Delivery note"}{" "}
                <span className="optional-label">Optional</span>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Anything the delivery person should know?"
                />
              </label>
              {orderError && (
                <p role="alert" className="form-error">
                  {orderError}
                </p>
              )}
              <Button size="lg" type="submit">
                Review receipt <ArrowRight size={16} />
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
                  {details.method === "pickup"
                    ? `${details.pickupStationName}, ${details.pickupStationAddress}`
                    : `${details.streetAddress}, ${details.community}, ${details.lga}, Kwara`}
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
                <Truck size={15} />{" "}
                {details.method === "pickup"
                  ? "Pickup selected. No doorstep delivery fee is included."
                  : `Doorstep delivery in Kwara is charged per seller shipment (${sellers.length} ${sellers.length === 1 ? "seller" : "sellers"}).`}
              </p>
              <fieldset className="payment-method-options">
                <legend>Choose a payment option</legend>
                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paystack"
                    checked={paymentMethod === "paystack"}
                    onChange={() => setPaymentMethod("paystack")}
                  />
                  <span>
                    <strong>Paystack</strong>
                    <small>Card, bank, and supported Paystack channels</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank-transfer"
                    checked={paymentMethod === "bank-transfer"}
                    onChange={() => setPaymentMethod("bank-transfer")}
                  />
                  <span>
                    <strong>Bank transfer</strong>
                    <small>Transfer instructions would be provided at live checkout</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pay-on-delivery"
                    checked={paymentMethod === "pay-on-delivery"}
                    onChange={() => setPaymentMethod("pay-on-delivery")}
                  />
                  <span>
                    <strong>Pay on delivery / collection</strong>
                    <small>Shown for planning only; availability is not yet confirmed</small>
                  </span>
                </label>
              </fieldset>
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
                Payment selection is a preview only. No payment will be initiated or collected. Live
                Paystack checkout requires a secured server integration and verified payment
                callbacks.
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
                  <MapPin size={15} />{" "}
                  {order.deliveryMethod === "pickup" ? "Pickup station" : "Delivery address"}
                </span>
                <strong>{order.deliveryDestination}</strong>
              </div>
              <div className="reference-card">
                <span>
                  <ClipboardList size={15} /> Batch number
                </span>
                <strong>{order.batchNumber}</strong>
              </div>
              <div className="reference-card">
                <span>Selected payment option</span>
                <strong>
                  {order.paymentMethod === "paystack"
                    ? "Paystack (preview)"
                    : order.paymentMethod === "bank-transfer"
                      ? "Bank transfer (preview)"
                      : "Pay on delivery / collection (preview)"}
                </strong>
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
              <Button
                onClick={() => navigate({ to: "/shop", search: { filter: "All", query: "" } })}
              >
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
            deliveryState={
              step === "complete" && order ? order.deliveryState : details ? "Kwara" : undefined
            }
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
