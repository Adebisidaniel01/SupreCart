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
import { useActiveAccount } from "@/hooks/use-active-account";
import { money, type Product } from "@/lib/catalog";
import { trackAddShippingInfo, trackBeginCheckout, trackCheckoutOrder } from "@/lib/analytics";
import { cleanEmail, cleanMultiline, cleanPhone, cleanText } from "@/lib/input";

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
type CheckoutOrder = {
  batchNumber: string;
  createdAt: string;
  buyerEmail: string;
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
const DOORSTEP_FEE = 2500;
const PICKUP_STATIONS: PickupStation[] = [
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

type BagDetails = { recipient: string; phone: string; city: string; note: string };

function readBagDetails(): BagDetails | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("suprecart-bag-details");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BagDetails>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      recipient: typeof parsed.recipient === "string" ? parsed.recipient : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      city: typeof parsed.city === "string" ? parsed.city : "",
      note: typeof parsed.note === "string" ? parsed.note : "",
    };
  } catch {
    return null;
  }
}

function createReference(prefix: string) {
  const token = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12).toUpperCase();
  if (!token) throw new Error("Secure order references are not available in this browser.");
  return `${prefix}-${token}`;
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — SupreCart" },
      {
        name: "description",
        content: "Review your itemized receipt, tax and delivery fees in SupreCart checkout.",
      },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { cart, cartSubtotal, setCart } = useStore();
  const { account } = useActiveAccount();
  const navigate = useNavigate();
  const [step, setStep] = useState<"delivery" | "receipt" | "complete">("delivery");
  const [details, setDetails] = useState<ShippingDetails | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [orderError, setOrderError] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("doorstep");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paystack");
  const [bagDetails] = useState(readBagDetails);
  const bagNameParts = (bagDetails?.recipient ?? "").trim().split(/\s+/).filter(Boolean);
  const bagFirstName = bagNameParts[0] ?? "";
  const bagLastName = bagNameParts.slice(1).join(" ");
  const doorstepFee = DOORSTEP_FEE;
  const pickupStations = PICKUP_STATIONS;

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
      firstName: cleanText(data.get("firstName"), 80),
      lastName: cleanText(data.get("lastName"), 80),
      email: cleanEmail(data.get("email")),
      phone: cleanPhone(data.get("phone")),
      method,
      lga: cleanText(data.get("lga"), 80),
      community: cleanText(data.get("community"), 120),
      streetAddress: cleanText(data.get("streetAddress"), 200),
      landmark: cleanText(data.get("landmark"), 160),
      pickupStationId: station?.id ?? "",
      pickupStationName: station?.name ?? "",
      pickupStationAddress: station?.address ?? "",
      note: cleanMultiline(data.get("note"), 500),
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

  function confirmOrder() {
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
      const newOrder: CheckoutOrder = {
        batchNumber: createReference("CC-BATCH"),
        createdAt: new Date().toISOString(),
        buyerEmail: account?.email ?? details.email,
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
      const savedOrders = localStorage.getItem("suprecart-checkout-orders");
      const orders = savedOrders ? (JSON.parse(savedOrders) as CheckoutOrder[]) : [];
      localStorage.setItem("suprecart-checkout-orders", JSON.stringify([newOrder, ...orders]));
      trackCheckoutOrder({
        transactionId: newOrder.batchNumber,
        cart,
        value: total,
        tax: vat,
        shipping: deliveryFee,
        paymentType: paymentMethod,
        deliveryMethod: details.method,
      });
      setOrder(newOrder);
      setCart([]);
      setStep("complete");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Could not save the SupreCart order.", error);
      setOrderError("We couldn’t save your order in this browser. Please try again.");
    }
  }

  if (cart.length === 0 && step !== "complete")
    return (
      <main id="main-content" tabIndex={-1} className="page-width checkout-empty">
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
    <main id="main-content" tabIndex={-1} className="page-width checkout-main">
      <Link to="/shop" search={{ filter: "All", query: "" }} className="back-link">
        <ArrowLeft size={15} /> Back to shopping
      </Link>
      <div className="checkout-heading">
        <div>
          <p className="eyebrow">THE SUPRECART MARKETPLACE</p>
          <h1>{step === "complete" ? "Order receipt" : "Checkout"}</h1>
          <p className="shop-intro">No order is placed and no payment is collected.</p>
        </div>
        <span className="secure-label">
          <ReceiptText size={14} /> Itemized receipt
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
                <b>3</b> Confirm
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
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    defaultValue={bagFirstName}
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    defaultValue={bagLastName}
                    required
                  />
                </label>
              </div>
              <div className="field-pair">
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    defaultValue={account?.email ?? ""}
                    required
                  />
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    placeholder="+234"
                    defaultValue={bagDetails?.phone ?? ""}
                    required
                  />
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
                      <input
                        name="community"
                        autoComplete="address-level2"
                        defaultValue={bagDetails?.city ?? ""}
                        required
                      />
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
                  defaultValue={bagDetails?.note ?? ""}
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
                <Button size="lg" onClick={confirmOrder}>
                  Confirm order <ArrowRight size={16} />
                </Button>
              </div>
              {orderError && (
                <p className="form-error" role="alert">
                  {orderError}
                </p>
              )}
              <p className="payment-note">
                Payment selection is a stored in this browser. No payment will be initiated or
                collected. Live Paystack checkout requires a secured server integration and verified
                payment callbacks.
              </p>
            </div>
          )}
          {step === "complete" && order && (
            <div className="checkout-card checkout-complete order-receipt">
              <span className="success-mark">
                <Check />
              </span>
              <p className="eyebrow">ORDER CONFIRMATION</p>
              <h2>Your receipt is ready.</h2>
              <p>
                These references are stored in this browser only. No order was sent to a seller and
                no parcel is being shipped.
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
                    ? "Paystack"
                    : order.paymentMethod === "bank-transfer"
                      ? "Bank transfer"
                      : "Pay on delivery / collection"}
                </strong>
              </div>
              <p className="order-created-at">
                Created {new Date(order.createdAt).toLocaleString("en-NG")}
              </p>
              <h3>Tracking references</h3>
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
                  ? "Saved on this device"
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
          <p className="local-data-note">
            <ShieldCheck size={15} /> Estimate only: tax and delivery rates must be confirmed before
            live checkout.
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
