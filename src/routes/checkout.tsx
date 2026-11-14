import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { createOrderSettlements, type OrderSettlement } from "@/lib/orders";

type DeliveryMethod = "doorstep" | "pickup";
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
  deliveryDestination: string;
  shipments: { seller: string; trackingNumber: string }[];
  settlements: OrderSettlement[];
};

const VAT_RATE = 0.075;
const DOORSTEP_FEE = 2500;

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
  const doorstepFee = DOORSTEP_FEE;

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

  function beginReceipt() {
    const name = account?.name.trim() ?? "";
    const [firstName = "", ...rest] = name.split(/\s+/);
    setDetails({
      firstName,
      lastName: rest.join(" "),
      email: account?.email ?? "",
      phone: "",
      method: "doorstep",
      lga: "",
      community: "",
      streetAddress: "",
      landmark: "",
      pickupStationId: "",
      pickupStationName: "",
      pickupStationAddress: "",
      note: "",
    });
    setOrderError("");
    setStep("receipt");
    trackAddShippingInfo(cart, "Doorstep delivery");
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
      const settlements = createOrderSettlements(lines);
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
        deliveryDestination:
          details.method === "pickup"
            ? [details.pickupStationName, details.pickupStationAddress].filter(Boolean).join(" — ")
            : `${[details.streetAddress, details.community, details.lga, "Kwara"].filter(Boolean).join(", ")}${details.landmark ? ` · Near ${details.landmark}` : ""}`,
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
        value: total,
        tax: vat,
        shipping: deliveryFee,
        paymentType: "paystack",
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
                <b>3</b> Save
              </span>
            </div>
          )}
          {step === "delivery" && (
            <div className="checkout-card account-form">
              <div className="checkout-card-title">
                <MapPin size={19} />
                <div>
                  <h2>Your delivery details</h2>
                  <p>Your saved address and contact details are loaded from the backend.</p>
                </div>
              </div>
              <div className="delivery-summary">
                <strong>{account?.name || "Signed-in buyer"}</strong>
                {account?.email && <span>{account.email}</span>}
                <span>
                  Address, phone number, and delivery option are filled in automatically at
                  checkout.
                </span>
              </div>
              {orderError && (
                <p role="alert" className="form-error">
                  {orderError}
                </p>
              )}
              <Button size="lg" type="button" onClick={beginReceipt}>
                Review receipt <ArrowRight size={16} />
              </Button>
            </div>
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
                  {[details.firstName, details.lastName].filter(Boolean).join(" ") ||
                    "Signed-in buyer"}
                </strong>
                <span>
                  {details.method === "pickup"
                    ? [details.pickupStationName, details.pickupStationAddress]
                        .filter(Boolean)
                        .join(", ") || "Pickup station loaded from the backend"
                    : [details.streetAddress, details.community, details.lga, "Kwara"]
                        .filter(Boolean)
                        .join(", ") || "Delivery address loaded from the backend"}
                </span>
                {(details.email || details.phone) && (
                  <span>{[details.email, details.phone].filter(Boolean).join(" · ")}</span>
                )}
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
              <p className="payment-note">
                <ShieldCheck size={14} /> Paystack is the only payment option. No payment is
                initiated or collected in this demo.
              </p>
              <div className="checkout-actions">
                <Button size="lg" onClick={confirmOrder}>
                  Save receipt <ArrowRight size={16} />
                </Button>
              </div>
              {orderError && (
                <p className="form-error" role="alert">
                  {orderError}
                </p>
              )}
              <p className="payment-note">
                <ShieldCheck size={14} /> Escrow model: SupreCart would hold the item funds, deduct
                its commission after delivery is confirmed, then release the seller net. This
                receipt does not move money or create a real escrow record.
              </p>
              <p className="payment-note">
                Live Paystack checkout requires a secured server integration and verified payment
                callbacks.
              </p>
            </div>
          )}
          {step === "complete" && order && (
            <div className="checkout-card checkout-complete order-receipt">
              <span className="success-mark">
                <Check />
              </span>
              <p className="eyebrow">RECEIPT SAVED</p>
              <h2>Your receipt is saved.</h2>
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
                <span>Payment option</span>
                <strong>Paystack</strong>
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
              <div className="checkout-escrow-summary">
                <div className="checkout-escrow-heading">
                  <ShieldCheck size={17} />
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
                  <div className="checkout-escrow-row" key={settlement.seller}>
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
