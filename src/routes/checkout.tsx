import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  GraduationCap,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/components/storefront";
import { useActiveAccount } from "@/hooks/use-active-account";
import { money, type Product } from "@/lib/catalog";
import { trackAddShippingInfo, trackBeginCheckout, trackCheckoutOrder } from "@/lib/analytics";
import { createOrderSettlements, getProfile, type OrderSettlement } from "@/lib/orders";
import { cleanEmail } from "@/lib/input";

type DeliveryMethod = "deliver" | "pickup";
type DeliveryArea = "on-campus" | "off-campus";
type CheckoutDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
  method: DeliveryMethod;
  area: DeliveryArea;
};
type ReceiptLine = {
  product: Product;
  size: string;
  quantity: number;
  subtotal: number;
};
type CheckoutOrder = {
  batchNumber: string;
  createdAt: string;
  buyerEmail: string;
  lines: ReceiptLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryState: string;
  deliveryMethod: DeliveryMethod;
  deliveryArea: DeliveryArea;
  deliveryDestination: string;
  shipments: { seller: string; trackingNumber: string }[];
  settlements: OrderSettlement[];
};

const DELIVERY_FEE = 250;
const addressKey = (email: string) => `suprecart-addresses:${cleanEmail(email)}`;

function createReference(prefix: string) {
  const token = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12).toUpperCase();
  if (!token) throw new Error("Secure order references are not available in this browser.");
  return `${prefix}-${token}`;
}

function readSavedDelivery(email: string) {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(addressKey(email));
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return null;
    const entries = parsed as unknown[];
    const entry =
      entries.find(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          (item as { is_default?: unknown }).is_default === true,
      ) ?? entries[0];
    if (typeof entry !== "object" || entry === null) return null;
    const record = entry as Record<string, unknown>;
    const value = (key: string) => (typeof record[key] === "string" ? record[key].trim() : "");
    const name = [value("first_name"), value("last_name")].filter(Boolean).join(" ");
    const address = [value("street_address"), value("community"), value("lga")]
      .filter(Boolean)
      .join(", ");
    return { name, phone: value("phone"), address };
  } catch (cause) {
    console.error("Could not read the saved delivery address.", cause);
    return null;
  }
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — SupreCart" },
      {
        name: "description",
        content: "Confirm your delivery details, review your items and see your order total.",
      },
    ],
  }),
  component: Checkout,
});

function CheckoutTopbar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="co-topbar">
      {onBack ? (
        <button type="button" className="co-back" onClick={onBack} aria-label="Back to checkout">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <Link
          to="/shop"
          search={{ filter: "All", query: "" }}
          className="co-back"
          aria-label="Back to shopping"
        >
          <ArrowLeft size={20} />
        </Link>
      )}
      <h1>{title}</h1>
    </header>
  );
}

function Checkout() {
  const { cart, cartSubtotal, setCart } = useStore();
  const { account } = useActiveAccount();
  const navigate = useNavigate();
  const [step, setStep] = useState<"checkout" | "receipt" | "complete">("checkout");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("deliver");
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>("on-campus");
  const [contact, setContact] = useState({ name: "", phone: "", address: "" });
  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [orderError, setOrderError] = useState("");
  const checkoutTracked = useRef(false);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const sellers = [...new Set(cart.map((item) => item.product.seller))];
  const deliveryFee = deliveryMethod === "deliver" ? DELIVERY_FEE : 0;
  const total = cartSubtotal + deliveryFee;
  const receiptFee = details?.method === "deliver" ? DELIVERY_FEE : 0;
  const receiptTotal = cartSubtotal + receiptFee;

  useEffect(() => {
    if (!account) {
      setContact({ name: "", phone: "", address: "" });
      return;
    }
    const profile = getProfile(account.email, account.name);
    const saved = readSavedDelivery(account.email);
    setContact({
      name: saved?.name || profile.name || account.name,
      phone: saved?.phone || profile.phone,
      address: saved?.address || "",
    });
  }, [account]);

  useEffect(() => {
    if (checkoutTracked.current || cart.length === 0) return;
    checkoutTracked.current = true;
    trackBeginCheckout(cart);
  }, [cart]);

  function beginReceipt() {
    setDetails({
      name: contact.name || account?.name || "Signed-in buyer",
      email: account?.email ?? "",
      phone: contact.phone,
      address: contact.address,
      method: deliveryMethod,
      area: deliveryArea,
    });
    setOrderError("");
    setStep("receipt");
    trackAddShippingInfo(cart, deliveryMethod === "pickup" ? "Pick up" : "Deliver to me");
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
        };
      });
      const settlements = createOrderSettlements(lines);
      const fee = details.method === "deliver" ? DELIVERY_FEE : 0;
      const orderTotal = cartSubtotal + fee;
      const destination = [
        details.area === "on-campus" ? "On campus" : "Off campus",
        details.method === "pickup"
          ? "Area office pickup"
          : details.address || "Delivery address on file",
      ]
        .filter(Boolean)
        .join(" · ");
      const newOrder: CheckoutOrder = {
        batchNumber: createReference("CC-BATCH"),
        createdAt: new Date().toISOString(),
        buyerEmail: account?.email ?? details.email,
        lines,
        subtotal: cartSubtotal,
        deliveryFee: fee,
        total: orderTotal,
        deliveryState: "Kwara",
        deliveryMethod: details.method,
        deliveryArea: details.area,
        deliveryDestination: destination,
        shipments: sellers.map((seller) => ({
          seller,
          trackingNumber: createReference("CC-TRACK"),
        })),
        settlements,
      };
      const savedOrders = localStorage.getItem("suprecart-checkout-orders");
      let orders: CheckoutOrder[] = [];
      if (savedOrders) {
        try {
          const parsed: unknown = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            orders = parsed
              .filter(
                (entry): entry is CheckoutOrder =>
                  typeof entry === "object" &&
                  entry !== null &&
                  typeof (entry as CheckoutOrder).batchNumber === "string",
              )
              .slice(0, 100);
          }
        } catch (cause) {
          console.error("Could not read the saved checkout orders.", cause);
        }
      }
      localStorage.setItem(
        "suprecart-checkout-orders",
        JSON.stringify([newOrder, ...orders].slice(0, 100)),
      );
      trackCheckoutOrder({
        transactionId: newOrder.batchNumber,
        cart,
        value: orderTotal,
        tax: 0,
        shipping: fee,
        paymentType: "paystack",
        deliveryMethod: details.method,
      });
      setOrder(newOrder);
      setCart([]);
      setStep("complete");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Could not save the SupreCart order.", error);
      setOrderError("We couldn’t save your receipt in this browser. Please try again.");
    }
  }

  if (cart.length === 0 && step !== "complete")
    return (
      <main id="main-content" tabIndex={-1} className="co-page">
        <CheckoutTopbar title="Checkout" />
        <div className="co-empty">
          <PackageCheck size={40} />
          <p className="eyebrow">YOUR BAG IS EMPTY</p>
          <h2>Good finds are waiting.</h2>
          <p>Add a few things to your bag before heading to checkout.</p>
          <Button asChild>
            <Link to="/shop" search={{ filter: "All", query: "" }}>
              Explore the marketplace <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </main>
    );

  if (step === "complete" && order)
    return (
      <main id="main-content" tabIndex={-1} className="co-page">
        <CheckoutTopbar title="Order receipt" />
        <div className="co-content">
          <section className="co-card co-complete">
            <span className="co-success">
              <Check size={22} />
            </span>
            <p className="co-eyebrow">RECEIPT SAVED</p>
            <h2>Your receipt is saved.</h2>
            <p className="co-complete-copy">
              These references are stored in this browser only. No order was sent to a seller and no
              parcel is being shipped.
            </p>
            <div className="co-reference-card">
              <span>
                <MapPin size={15} />{" "}
                {order.deliveryMethod === "pickup" ? "Pickup point" : "Delivery address"}
              </span>
              <strong>{order.deliveryDestination}</strong>
            </div>
            <div className="co-reference-card">
              <span>
                <ClipboardList size={15} /> Batch number
              </span>
              <strong>{order.batchNumber}</strong>
            </div>
            <div className="co-reference-card">
              <span>Payment option</span>
              <strong>Paystack</strong>
            </div>
            <p className="co-created-at">
              Created {new Date(order.createdAt).toLocaleString("en-NG")}
            </p>
            <h3 className="co-subtitle">Tracking references</h3>
            {order.shipments.map((shipment) => (
              <div className="co-reference-card" key={shipment.trackingNumber}>
                <span>
                  <Truck size={15} /> {shipment.seller}
                </span>
                <strong>{shipment.trackingNumber}</strong>
              </div>
            ))}
            <div className="co-escrow-summary">
              <div className="co-escrow-heading">
                <ShieldCheck size={18} />
                <div>
                  <strong>
                    {money(
                      order.settlements.reduce((sum, settlement) => sum + settlement.gross, 0),
                    )}{" "}
                    held in escrow until you confirm delivery
                  </strong>
                  <span>
                    SupreCart deducts its seller commission, then releases the net amount to the
                    seller. This is a local demonstration, not a real payout.
                  </span>
                </div>
              </div>
              {order.settlements.map((settlement) => (
                <div className="co-escrow-row" key={settlement.seller}>
                  <span>
                    <strong>{settlement.seller}</strong>
                    <small>
                      {money(settlement.gross)} item value / {money(settlement.commission)}{" "}
                      commission
                    </small>
                  </span>
                  <b>{money(settlement.sellerNet)} seller net</b>
                </div>
              ))}
            </div>
            <div className="co-summary">
              <div className="co-summary-row">
                <span>Items</span>
                <strong>{money(order.subtotal)}</strong>
              </div>
              <div className="co-summary-row">
                <span>Delivery</span>
                <strong>{order.deliveryFee === 0 ? "Free" : money(order.deliveryFee)}</strong>
              </div>
              <div className="co-summary-row co-summary-total">
                <span>Total</span>
                <strong>{money(order.total)}</strong>
              </div>
            </div>
            <button
              type="button"
              className="co-secondary-button"
              onClick={() => navigate({ to: "/shop", search: { filter: "All", query: "" } })}
            >
              Keep exploring <ArrowRight size={16} />
            </button>
            <p className="co-demo-note">
              No payment was collected and no real order exists on SupreCart.
            </p>
          </section>
        </div>
      </main>
    );

  if (step === "receipt" && details)
    return (
      <main id="main-content" tabIndex={-1} className="co-page">
        <CheckoutTopbar
          title="Review receipt"
          onBack={() => {
            setStep("checkout");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        <div className="co-content">
          <section className="co-card">
            <h2 className="co-title">Delivery details</h2>
            <div className="co-detail-list">
              <div className="co-detail-row">
                <span className="co-detail-icon">
                  <MapPin size={18} />
                </span>
                <div className="co-detail-copy">
                  <span className="co-detail-label">
                    {details.method === "pickup" ? "Pickup point" : "Delivery address"}
                  </span>
                  <strong>
                    {details.method === "pickup"
                      ? "Area office pickup"
                      : details.address || "Delivery address on file"}
                  </strong>
                </div>
              </div>
              <div className="co-detail-row">
                <span className="co-detail-icon">
                  <Phone size={18} />
                </span>
                <div className="co-detail-copy">
                  <span className="co-detail-label">Phone number</span>
                  <strong>{details.phone || "No phone number on file"}</strong>
                </div>
              </div>
              <div className="co-detail-row">
                <span className="co-detail-icon">
                  <Truck size={18} />
                </span>
                <div className="co-detail-copy">
                  <span className="co-detail-label">Delivery option</span>
                  <strong>
                    {details.method === "pickup" ? "Pick up" : "Deliver to me"} ·{" "}
                    {details.area === "on-campus" ? "On campus" : "Off campus"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="co-card">
            <h2 className="co-title">Your items ({itemCount})</h2>
            {cart.map((item) => {
              const lineTotal = item.product.price * item.quantity;
              return (
                <div className="co-receipt-line" key={`${item.product.id}-${item.size}`}>
                  <img src={item.product.image} alt="" />
                  <div className="co-receipt-line-copy">
                    <strong>{item.product.name}</strong>
                    <span>
                      {item.product.seller} · Qty {item.quantity}
                      {item.size !== "One size" ? ` · Size ${item.size}` : ""}
                    </span>
                  </div>
                  <b>{money(lineTotal)}</b>
                </div>
              );
            })}
          </section>

          <section className="co-card">
            <h2 className="co-title">Summary</h2>
            <div className="co-summary">
              <div className="co-summary-row">
                <span>Items</span>
                <strong>{money(cartSubtotal)}</strong>
              </div>
              <div className="co-summary-row">
                <span>Delivery</span>
                <strong>{receiptFee === 0 ? "Free" : money(receiptFee)}</strong>
              </div>
              <div className="co-summary-row co-summary-total">
                <span>Total</span>
                <strong>{money(receiptTotal)}</strong>
              </div>
            </div>
          </section>

          <p className="co-escrow-note">
            <ShieldCheck size={18} />
            <span>
              Your money stays with SupreCart until you confirm you&apos;ve received your order.
            </span>
          </p>
          <p className="co-demo-note">
            This is a local receipt. No payment is collected and no order is sent to a seller.
          </p>
          {orderError && (
            <p className="co-error" role="alert">
              {orderError}
            </p>
          )}
        </div>
        <div className="co-bottom-bar">
          <div className="co-bottom-inner">
            <button type="button" className="co-place-order" onClick={confirmOrder}>
              <span>Save receipt</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    );

  return (
    <main id="main-content" tabIndex={-1} className="co-page">
      <CheckoutTopbar title="Checkout" />
      <div className="co-content">
        <section className="co-card">
          <h2 className="co-title">Your items ({itemCount})</h2>
          <div className="co-item-list">
            {cart.map((item) => (
              <div className="co-item" key={`${item.product.id}-${item.size}`}>
                <img src={item.product.image} alt="" />
                <div className="co-item-info">
                  <div className="co-item-top">
                    <strong>{item.product.name}</strong>
                    <b>{money(item.product.price * item.quantity)}</b>
                  </div>
                  <span className="co-item-meta">
                    Qty {item.quantity}
                    {item.size !== "One size" ? ` · Size ${item.size}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="co-card">
          <h2 className="co-title">How do you want it?</h2>
          <div className="co-options" role="radiogroup" aria-label="Delivery method">
            <button
              type="button"
              role="radio"
              aria-checked={deliveryMethod === "deliver"}
              className={`co-option ${deliveryMethod === "deliver" ? "is-selected" : ""}`}
              onClick={() => setDeliveryMethod("deliver")}
            >
              <span className="co-option-icon">
                <Truck size={20} />
              </span>
              <span className="co-option-copy">
                <strong>Deliver to me</strong>
                <span>A SupreCart rider brings it to you</span>
              </span>
              <span
                className={`co-radio ${deliveryMethod === "deliver" ? "is-checked" : ""}`}
                aria-hidden="true"
              >
                {deliveryMethod === "deliver" && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={deliveryMethod === "pickup"}
              className={`co-option ${deliveryMethod === "pickup" ? "is-selected" : ""}`}
              onClick={() => setDeliveryMethod("pickup")}
            >
              <span className="co-option-icon">
                <Store size={20} />
              </span>
              <span className="co-option-copy">
                <strong>Pick up</strong>
                <span>Collect it free at the area office</span>
              </span>
              <span
                className={`co-radio ${deliveryMethod === "pickup" ? "is-checked" : ""}`}
                aria-hidden="true"
              >
                {deliveryMethod === "pickup" && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          </div>
        </section>

        <section className="co-card">
          <h2 className="co-title">Where are you?</h2>
          <div className="co-options" role="radiogroup" aria-label="Delivery area">
            <button
              type="button"
              role="radio"
              aria-checked={deliveryArea === "on-campus"}
              className={`co-option ${deliveryArea === "on-campus" ? "is-selected" : ""}`}
              onClick={() => setDeliveryArea("on-campus")}
            >
              <span className="co-option-icon">
                <GraduationCap size={20} />
              </span>
              <span className="co-option-copy">
                <strong>On campus</strong>
                <span>On campus delivery</span>
              </span>
              <span
                className={`co-radio ${deliveryArea === "on-campus" ? "is-checked" : ""}`}
                aria-hidden="true"
              >
                {deliveryArea === "on-campus" && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={deliveryArea === "off-campus"}
              className={`co-option ${deliveryArea === "off-campus" ? "is-selected" : ""}`}
              onClick={() => setDeliveryArea("off-campus")}
            >
              <span className="co-option-icon">
                <MapPin size={20} />
              </span>
              <span className="co-option-copy">
                <strong>Off campus</strong>
                <span>Off campus delivery</span>
              </span>
              <span
                className={`co-radio ${deliveryArea === "off-campus" ? "is-checked" : ""}`}
                aria-hidden="true"
              >
                {deliveryArea === "off-campus" && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          </div>

          <div className="co-detail-list">
            <div className="co-detail-row">
              <span className="co-detail-icon">
                <MapPin size={18} />
              </span>
              <div className="co-detail-copy">
                <span className="co-detail-label">Delivery address</span>
                <strong>
                  {contact.address ||
                    (account
                      ? "Add a delivery address in your account"
                      : "Sign in to load your delivery address")}
                </strong>
              </div>
            </div>
            <div className="co-detail-row">
              <span className="co-detail-icon">
                <Phone size={18} />
              </span>
              <div className="co-detail-copy">
                <span className="co-detail-label">Phone number</span>
                <strong>
                  {contact.phone ||
                    (account ? "No phone number on file" : "Sign in to load your phone number")}
                </strong>
              </div>
            </div>
          </div>
          <p className="co-loaded-note">Delivery details are loaded from your account.</p>
        </section>

        <section className="co-card">
          <h2 className="co-title">Summary</h2>
          <div className="co-summary">
            <div className="co-summary-row">
              <span>Items</span>
              <strong>{money(cartSubtotal)}</strong>
            </div>
            <div className="co-summary-row">
              <span>Delivery</span>
              <strong>{deliveryFee === 0 ? "Free" : money(deliveryFee)}</strong>
            </div>
            <div className="co-summary-row co-summary-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
        </section>

        <p className="co-escrow-note">
          <ShieldCheck size={18} />
          <span>
            Your money stays with SupreCart until you confirm you&apos;ve received your order.
          </span>
        </p>
        <p className="co-demo-note">
          Demo checkout — no order is placed and no payment is collected.
        </p>
      </div>
      <div className="co-bottom-bar">
        <div className="co-bottom-inner">
          <button type="button" className="co-place-order" onClick={beginReceipt}>
            <span>Place order</span>
            <span className="co-place-sep" aria-hidden="true">
              -
            </span>
            <span className="co-place-total">{money(total)}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
