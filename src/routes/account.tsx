import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  CreditCard,
  Clock3,
  Globe,
  House,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearAccount,
  ensureSellerAccount,
  findAccount,
  getAccountModeration,
  readActiveAccount,
  saveAccount,
  type Account,
} from "@/lib/accounts";
import { deleteAccountData } from "@/lib/account-cleanup";
import {
  canCancelOrder,
  cancelOrder,
  getOrders,
  getProfile,
  saveProfile as saveStoredProfile,
  type Order,
} from "@/lib/orders";
import {
  getSellerApplication,
  submitSellerApplication as saveSellerApplication,
  subscribeSellerApplications,
  type SellerApplication,
} from "@/lib/seller-applications";
import { trackEvent } from "@/lib/analytics";
import { avatarErrorMessage, processAvatarFile } from "@/lib/avatar";
import { cleanEmail, cleanMultiline, cleanPhone, cleanText } from "@/lib/input";
import {
  accountPreferenceScope,
  createPaymentMethod,
  currencyOptions,
  defaultAccountPreferences,
  languageOptions,
  nigerianBanks,
  readAccountPreferences,
  saveAccountPreferences,
  timezoneOptions,
  type AccountPreferences,
  type NotificationPreferences,
  type RegionPreferences,
} from "@/lib/account-preferences";

type BuyerOrder = Order;

type BuyerAddress = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lga: string;
  community: string;
  street_address: string;
  landmark: string;
  is_default: boolean;
};

const addressStorageKey = (email: string) => `suprecart-addresses:${email.toLowerCase()}`;

function readLocalAddresses(email: string): BuyerAddress[] {
  try {
    const saved = window.localStorage.getItem(addressStorageKey(email));
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is BuyerAddress =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as BuyerAddress).id === "string",
    );
  } catch (cause) {
    console.error("Could not read the local SupreCart delivery addresses.", cause);
    return [];
  }
}

function writeLocalAddresses(email: string, addresses: BuyerAddress[]) {
  try {
    window.localStorage.setItem(addressStorageKey(email), JSON.stringify(addresses));
  } catch (cause) {
    console.error("Could not save the local SupreCart delivery addresses.", cause);
  }
}

type AccountSection = "overview" | "orders" | "addresses" | "seller" | "settings";

type SettingsTab = "profile" | "notifications" | "region" | "payments" | "security" | "danger";

const cancellationReasons = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price",
  "Delivery is taking too long",
  "Need to change the delivery details",
  "Other",
] as const;

function orderStatusClass(status: BuyerOrder["status"]) {
  if (status === "Cancellation requested") return " is-requested";
  if (status === "Cancelled") return " is-cancelled";
  return "";
}

const settingsTabs = [
  ["profile", "Profile", UserRound],
  ["notifications", "Notifications", Bell],
  ["region", "Region & language", Globe],
  ["payments", "Payment methods", CreditCard],
  ["security", "Security", Lock],
  ["danger", "Danger zone", AlertTriangle],
] as const;

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — SupreCart" },
      { name: "description", content: "View your SupreCart buyer account." },
    ],
  }),
  component: BuyerAccount,
});

function BuyerAccount() {
  const navigate = useNavigate();
  const [sessionAccount, setSessionAccount] = useState<Account | null>(null);
  const [sessionProfile, setSessionProfile] = useState({ name: "", phone: "" });
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [section, setSection] = useState<AccountSection>("overview");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultAccountPreferences);
  const [preferencesScope, setPreferencesScope] = useState("");
  const [sellerApplication, setSellerApplication] = useState<SellerApplication | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderNotice, setOrderNotice] = useState("");

  useEffect(() => {
    const activeAccount = readActiveAccount();
    if (!activeAccount) {
      void navigate({ to: "/login" });
      return;
    }
    if (activeAccount.role === "seller") {
      void navigate({ to: "/sellers" });
      return;
    }
    setSessionAccount(activeAccount);
    setSessionProfile(getProfile(activeAccount.email, activeAccount.name));
    setOrders(getOrders(activeAccount.email));
    setAddresses(readLocalAddresses(activeAccount.email));
    setError("");
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!sessionAccount) {
      setSellerApplication(null);
      return;
    }
    const syncApplication = () => setSellerApplication(getSellerApplication(sessionAccount.email));
    syncApplication();
    return subscribeSellerApplications(syncApplication);
  }, [sessionAccount]);

  useEffect(() => {
    const syncSection = () => {
      if (window.location.hash === "#seller") {
        setSection("seller");
      } else if (window.location.hash === "#settings") {
        setSection("settings");
        setSettingsTab("profile");
      }
    };
    syncSection();
    window.addEventListener("hashchange", syncSection);
    return () => window.removeEventListener("hashchange", syncSection);
  }, []);

  const identity = sessionAccount?.email ?? "";
  const moderation = sessionAccount ? getAccountModeration(sessionAccount.email) : null;
  const preferencesKey = useMemo(
    () => (identity ? accountPreferenceScope("buyer", identity) : ""),
    [identity],
  );

  useEffect(() => {
    if (!preferencesKey) return;
    setPreferencesScope(preferencesKey);
    setPreferences(readAccountPreferences(preferencesKey));
  }, [preferencesKey]);

  function updatePreferences(next: AccountPreferences) {
    setPreferences(next);
    if (preferencesScope) saveAccountPreferences(preferencesScope, next);
  }

  function setNotification(key: keyof NotificationPreferences, value: boolean) {
    updatePreferences({
      ...preferences,
      notifications: { ...preferences.notifications, [key]: value },
    });
  }

  function setRegion(patch: Partial<RegionPreferences>) {
    updatePreferences({ ...preferences, region: { ...preferences.region, ...patch } });
  }

  function submitSellerApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionAccount) {
      setError("Sign in to your buyer account before applying to sell.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const application = saveSellerApplication({
      email: sessionAccount.email,
      name: sessionAccount.name,
      storeName: cleanText(form.get("storeName"), 120),
      phone: cleanPhone(form.get("phone")),
      productDescription: cleanMultiline(form.get("productDescription"), 1000),
      bankName: cleanText(form.get("bankName"), 120),
      bankAccountNumber: cleanText(form.get("bankAccountNumber"), 20).replace(/\D/g, ""),
    });
    setSellerApplication(application);
    setError("");
    setNotice("Your seller application is pending review. Nothing is live until it is approved.");
    trackEvent("seller_application_submitted", { status: "pending" });
  }

  async function onAvatarFile(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const result = await processAvatarFile(file);
    input.value = "";
    if (!result.ok) {
      setError(avatarErrorMessage(result.code));
      return;
    }
    updatePreferences({ ...preferences, avatarDataUrl: result.dataUrl });
    setError("");
    setNotice("Profile photo saved in this browser only.");
  }

  function removeAvatar() {
    updatePreferences({ ...preferences, avatarDataUrl: "" });
    setNotice("Profile photo removed from this browser.");
  }

  function addPaymentMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const brand = cleanText(form.get("brand"), 40);
    const last4 = cleanText(form.get("last4"), 10).replace(/\D/g, "");
    const expiry = cleanText(form.get("expiry"), 5);
    if (last4.length < 4 || !/^\d{2}\/\d{2}$/.test(expiry)) {
      setError("Enter the last 4 digits and an expiry in MM/YY format.");
      return;
    }
    const method = createPaymentMethod({ brand, last4, expiry });
    method.isDefault = preferences.paymentMethods.length === 0;
    updatePreferences({ ...preferences, paymentMethods: [...preferences.paymentMethods, method] });
    formElement.reset();
    setError("");
    setNotice("Payment method saved in this browser. No real card is stored or charged.");
  }

  function removePaymentMethod(id: string) {
    const remaining = preferences.paymentMethods.filter((method) => method.id !== id);
    if (remaining.length && !remaining.some((method) => method.isDefault)) {
      remaining[0] = { ...remaining[0]!, isDefault: true };
    }
    updatePreferences({ ...preferences, paymentMethods: remaining });
  }

  function setDefaultPaymentMethod(id: string) {
    updatePreferences({
      ...preferences,
      paymentMethods: preferences.paymentMethods.map((method) => ({
        ...method,
        isDefault: method.id === id,
      })),
    });
  }

  function signOutOtherSessions() {
    setNotice("This app keeps one session in this browser, so there are no other devices.");
  }

  async function removeAccount() {
    if (sessionAccount) {
      deleteAccountData(sessionAccount.email);
      setSessionAccount(null);
      await navigate({ to: "/login" });
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionAccount) return;
    const form = new FormData(event.currentTarget);
    const name = cleanText(form.get("name"), 120);
    const phone = cleanPhone(form.get("phone"));
    if (!name) {
      setError("Enter your name before saving.");
      return;
    }
    saveStoredProfile(sessionAccount.email, { name, phone });
    setSessionAccount({ ...sessionAccount, name });
    setSessionProfile({ name, phone });
    setError("");
    setNotice("Your profile has been updated in this browser.");
  }

  function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionAccount) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nextAddress: BuyerAddress = {
      id: crypto.randomUUID(),
      first_name: cleanText(form.get("first_name"), 80),
      last_name: cleanText(form.get("last_name"), 80),
      email: cleanEmail(form.get("email")),
      phone: cleanPhone(form.get("phone")),
      lga: cleanText(form.get("lga"), 80),
      community: cleanText(form.get("community"), 120),
      street_address: cleanText(form.get("street_address"), 200),
      landmark: cleanText(form.get("landmark"), 160),
      is_default: addresses.length === 0 || form.get("is_default") === "on",
    };
    const updated = [
      ...(nextAddress.is_default
        ? addresses.map((address) => ({ ...address, is_default: false }))
        : addresses),
      nextAddress,
    ];
    setAddresses(updated);
    writeLocalAddresses(sessionAccount.email, updated);
    formElement.reset();
    setNotice("Delivery address saved in this browser.");
  }

  function removeAddress(addressId: string) {
    if (!sessionAccount) return;
    const updated = addresses.filter((address) => address.id !== addressId);
    setAddresses(updated);
    writeLocalAddresses(sessionAccount.email, updated);
  }

  async function signOut() {
    clearAccount();
    setSessionAccount(null);
    await navigate({ to: "/login" });
  }

  async function openSellerStudio() {
    if (!sessionAccount) return;
    const sellerAccount =
      findAccount(sessionAccount.email, "seller") ??
      (sellerApplication?.status === "approved" ? ensureSellerAccount(sessionAccount) : null);
    if (!sellerAccount) {
      setSection("seller");
      return;
    }
    saveAccount(sellerAccount);
    await navigate({ to: "/sellers" });
  }

  function beginCancelOrder(orderId: string) {
    setCancellingOrderId(orderId);
    setOrderError("");
    setOrderNotice("");
  }

  function confirmCancelOrder(orderId: string, reason: string) {
    if (!sessionAccount) return;
    try {
      setOrders(cancelOrder(sessionAccount.email, orderId, reason));
      setCancellingOrderId("");
      setOrderError("");
      setOrderNotice(
        `Cancellation request for order ${orderId} was saved and is awaiting review. No payment or refund has been processed.`,
      );
    } catch (cause) {
      setOrderError(
        cause instanceof Error
          ? cause.message
          : "Could not request cancellation for this order in this browser.",
      );
    }
  }

  const firstName = sessionProfile.name || "there";
  const [addressFirstName = "", ...addressLastNameParts] = firstName.split(/\s+/);
  const addressLastName = addressLastNameParts.join(" ");

  return (
    <main id="main-content" tabIndex={-1} className="account-page account-dashboard-layout">
      <section className="account-panel account-dashboard buyer-account-shell">
        <header className="buyer-account-hero">
          <div className="buyer-account-hero-top">
            <Link to="/" className="back-link">
              <ArrowLeft size={15} /> Back to SupreCart
            </Link>
            <div className="buyer-account-hero-actions">
              <span className="buyer-account-status">
                <ShieldCheck size={14} /> Buyer account
              </span>
              <Button variant="outline" onClick={() => void signOut()}>
                <LogOut size={15} /> Sign out
              </Button>
            </div>
          </div>
          <div className="buyer-account-identity">
            <span className="account-avatar buyer-account-avatar">
              {preferences.avatarDataUrl ? (
                <img src={preferences.avatarDataUrl} alt="" />
              ) : (
                <UserRound size={30} />
              )}
            </span>
            <div>
              <p className="eyebrow">YOUR ACCOUNT</p>
              <h1>Good to see you, {firstName}.</h1>
              <p className="buyer-account-meta">
                <span>{sessionAccount?.email}</span>
                <span className="buyer-account-meta-dot" aria-hidden="true" />
                <span>{sessionProfile.phone || "No phone added yet"}</span>
              </p>
            </div>
          </div>
          {sessionAccount && (
            <p className="local-data-note" role="status">
              ACCOUNT DATA - This account, its orders and profile edits live in this browser only.
              No real order is placed and no payment is taken.
            </p>
          )}
        </header>

        {loading && <p className="account-intro">Loading your account...</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!loading && (
          <>
            <nav className="buyer-account-nav" aria-label="Account sections">
              {(
                [
                  ["overview", "Overview", House],
                  ["orders", "Orders", Package],
                  ["addresses", "Addresses", MapPin],
                  ["seller", "Sell with us", Store],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  type="button"
                  key={key}
                  className={section === key ? "active" : ""}
                  onClick={() => {
                    setSection(key);
                    setError("");
                    setNotice("");
                  }}
                >
                  <Icon size={17} /> {label}
                </button>
              ))}
              <Link to="/messages" search={{ productId: undefined }}>
                <MessageCircle size={17} /> Messages
              </Link>
              <button
                type="button"
                className={section === "settings" ? "active" : ""}
                onClick={() => {
                  setSection("settings");
                  setSettingsTab("profile");
                  setError("");
                  setNotice("");
                  setConfirmDelete(false);
                }}
              >
                <Settings size={17} /> Settings
              </button>
            </nav>
            <div className="buyer-account-content">
              <div className="account-dashboard-main">
                {moderation?.status === "warned" && (
                  <p className="account-warning-note" role="alert">
                    <AlertTriangle size={14} />
                    {moderation.reason || "An administrator has warned this account."}
                  </p>
                )}
                {notice && (
                  <p className="account-success-note" role="status">
                    {notice}
                  </p>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                {section === "overview" && (
                  <>
                    <section className="account-summary-grid">
                      <article className="account-summary-card">
                        <span>ORDERS</span>
                        <strong>{orders.length}</strong>
                        <button type="button" onClick={() => setSection("orders")}>
                          View order history <ArrowRight size={14} />
                        </button>
                      </article>
                      <article className="account-summary-card">
                        <span>SAVED ADDRESSES</span>
                        <strong>{addresses.length}</strong>
                        <button type="button" onClick={() => setSection("addresses")}>
                          Manage delivery details <ArrowRight size={14} />
                        </button>
                      </article>
                      <article className="account-summary-card account-summary-seller">
                        <span>SELL WITH SUPRECART</span>
                        <strong>
                          {sellerApplication
                            ? sellerApplication.status === "approved"
                              ? "Approved"
                              : sellerApplication.status === "pending"
                                ? "In review"
                                : "Not approved"
                            : "Not applied"}
                        </strong>
                        <button
                          type="button"
                          onClick={() =>
                            sellerApplication?.status === "approved"
                              ? void openSellerStudio()
                              : setSection("seller")
                          }
                        >
                          {sellerApplication?.status === "approved"
                            ? "Open seller studio"
                            : sellerApplication?.status === "pending"
                              ? "View application"
                              : "Start your application"}{" "}
                          <ArrowRight size={14} />
                        </button>
                      </article>
                    </section>
                    <section className="account-dashboard-card">
                      <div className="account-profile-heading">
                        <span className="account-avatar">
                          {preferences.avatarDataUrl ? (
                            <img src={preferences.avatarDataUrl} alt="" />
                          ) : (
                            <UserRound size={22} />
                          )}
                        </span>
                        <h2>Profile overview</h2>
                      </div>
                      <dl>
                        <div>
                          <dt>Name</dt>
                          <dd>{sessionProfile.name || firstName}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{sessionAccount?.email}</dd>
                        </div>
                        <div>
                          <dt>Phone</dt>
                          <dd>{sessionProfile.phone || "Not added"}</dd>
                        </div>
                        <div>
                          <dt>Account type</dt>
                          <dd className="account-verification">
                            <ShieldCheck size={15} />
                            Buyer · stored in this browser
                          </dd>
                        </div>
                      </dl>
                    </section>
                    <section className="account-dashboard-card">
                      <div className="account-dashboard-section-heading">
                        <h2>Recent orders</h2>
                        <button type="button" onClick={() => setSection("orders")}>
                          See all
                        </button>
                      </div>
                      {orders.length ? (
                        <ul className="account-order-list">
                          {orders.slice(0, 3).map((order) => (
                            <li key={order.id}>
                              <Package size={16} />
                              <span>Order {order.id}</span>
                              <span
                                className={`account-order-status${orderStatusClass(order.status)}`}
                              >
                                {order.status}
                              </span>
                              <time dateTime={order.created_at}>
                                {new Date(order.created_at).toLocaleDateString()}
                              </time>
                              {order.items && <small>{order.items}</small>}
                              {order.total !== undefined && (
                                <strong>
                                  {new Intl.NumberFormat("en-NG", {
                                    style: "currency",
                                    currency: "NGN",
                                    maximumFractionDigits: 0,
                                  }).format(order.total)}
                                </strong>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="account-intro">Your order history will appear here.</p>
                      )}
                    </section>
                    <Button
                      size="lg"
                      onClick={() =>
                        navigate({ to: "/shop", search: { filter: "All", query: "" } })
                      }
                    >
                      Explore the marketplace <ArrowRight size={16} />
                    </Button>
                  </>
                )}
                {section === "orders" && (
                  <section className="account-dashboard-card">
                    <div className="account-dashboard-section-heading">
                      <h2>Order history</h2>
                      <span>{orders.length}</span>
                    </div>
                    {orderNotice && (
                      <p className="account-success-note" role="status">
                        {orderNotice}
                      </p>
                    )}
                    {orderError && (
                      <p className="account-warning-note" role="alert">
                        <AlertTriangle size={15} />
                        {orderError}
                      </p>
                    )}
                    {orders.length ? (
                      <ul className="account-order-list">
                        {orders.map((order) => (
                          <li key={order.id}>
                            <Package size={16} />
                            <span>Order {order.id}</span>
                            <span
                              className={`account-order-status${orderStatusClass(order.status)}`}
                            >
                              {order.status}
                            </span>
                            <time dateTime={order.created_at}>
                              {new Date(order.created_at).toLocaleDateString()}
                            </time>
                            {order.items && <small>{order.items}</small>}
                            {order.delivery && <small>Delivery: {order.delivery}</small>}
                            {order.total !== undefined && (
                              <strong>
                                {new Intl.NumberFormat("en-NG", {
                                  style: "currency",
                                  currency: "NGN",
                                  maximumFractionDigits: 0,
                                }).format(order.total)}
                              </strong>
                            )}
                            {order.status === "Cancellation requested" ? (
                              <div className="account-order-refund">
                                <p>
                                  <strong>Refund status:</strong> Pending review
                                </p>
                                {order.cancellation_reason && (
                                  <p>Reason: {order.cancellation_reason}</p>
                                )}
                                <ol className="account-refund-timeline">
                                  <li className="is-complete">
                                    <span>Request submitted</span>
                                    {order.cancellation_requested_at && (
                                      <time dateTime={order.cancellation_requested_at}>
                                        {new Date(
                                          order.cancellation_requested_at,
                                        ).toLocaleDateString()}
                                      </time>
                                    )}
                                  </li>
                                  <li>
                                    <span>Seller and logistics review</span>
                                  </li>
                                  <li>
                                    <span>Refund processed</span>
                                  </li>
                                </ol>
                                <p className="account-order-note">
                                  Requested. No payment or refund has been processed yet.
                                </p>
                              </div>
                            ) : order.status === "Cancelled" ? (
                              <p className="account-order-note">
                                Cancelled
                                {order.cancelled_at
                                  ? ` on ${new Date(order.cancelled_at).toLocaleDateString()}`
                                  : ""}
                                . No payment or refund was processed.
                              </p>
                            ) : cancellingOrderId === order.id ? (
                              <form
                                className="account-order-cancel"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const form = new FormData(event.currentTarget);
                                  confirmCancelOrder(order.id, cleanText(form.get("reason"), 300));
                                }}
                              >
                                <p>
                                  Request cancellation for order {order.id}? It will be reviewed
                                  before any refund is processed. This request is saved in this
                                  browser only.
                                </p>
                                <label>
                                  Cancellation reason
                                  <select name="reason" required defaultValue="">
                                    <option value="" disabled>
                                      Select a reason
                                    </option>
                                    {cancellationReasons.map((reason) => (
                                      <option key={reason} value={reason}>
                                        {reason}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="account-confirm-actions">
                                  <Button size="sm" variant="destructive" type="submit">
                                    Submit request
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={() => setCancellingOrderId("")}
                                  >
                                    Keep order
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <div className="account-order-actions">
                                {canCancelOrder(order) ? (
                                  <button
                                    type="button"
                                    className="account-danger-link"
                                    onClick={() => beginCancelOrder(order.id)}
                                  >
                                    Cancel order
                                  </button>
                                ) : (
                                  <span className="account-order-note">
                                    {order.status === "Processing"
                                      ? "The 24-hour cancellation window for this order has closed."
                                      : "Cancellation is only available before dispatch."}
                                  </span>
                                )}
                                <Link
                                  to="/support"
                                  search={{ orderId: order.id }}
                                  className="account-inline-link"
                                >
                                  Get help
                                </Link>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="account-intro">
                        No orders yet. Order history is kept in this browser only.
                      </p>
                    )}
                    <p className="account-intro account-order-support">
                      Need help with an order? <Link to="/support">Chat with customer care</Link>.
                    </p>
                  </section>
                )}
                {section === "addresses" && (
                  <>
                    <section className="account-dashboard-card">
                      <h2>Delivery addresses</h2>
                      <p className="local-data-note">
                        Addresses are stored in this browser only and are not shared with any
                        delivery service.
                      </p>
                      {addresses.length ? (
                        <div className="account-address-list">
                          {addresses.map((address) => (
                            <article key={address.id} className="account-address-card">
                              <div>
                                <strong>
                                  {address.first_name} {address.last_name}
                                </strong>
                                {address.is_default && <span>DEFAULT</span>}
                              </div>
                              <p>
                                {address.street_address}, {address.community}, {address.lga}
                              </p>
                              <small>
                                {address.phone} · {address.email}
                                {address.landmark ? ` · ${address.landmark}` : ""}
                              </small>
                              <button
                                type="button"
                                className="account-danger-link"
                                onClick={() => removeAddress(address.id)}
                              >
                                Remove address
                              </button>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="account-intro">No saved delivery addresses yet.</p>
                      )}
                    </section>
                    <form className="account-dashboard-card account-form" onSubmit={addAddress}>
                      <h2>Add a delivery address</h2>
                      <div className="field-pair">
                        <label>
                          First name
                          <input name="first_name" defaultValue={addressFirstName} required />
                        </label>
                        <label>
                          Last name
                          <input name="last_name" defaultValue={addressLastName} required />
                        </label>
                      </div>
                      <div className="field-pair">
                        <label>
                          Email
                          <input
                            name="email"
                            type="email"
                            defaultValue={sessionAccount?.email ?? ""}
                            required
                          />
                        </label>
                        <label>
                          Phone
                          <input name="phone" type="tel" required />
                        </label>
                      </div>
                      <div className="field-pair">
                        <label>
                          Kwara LGA
                          <input name="lga" placeholder="e.g. Ilorin West" required />
                        </label>
                        <label>
                          Community
                          <input name="community" required />
                        </label>
                      </div>
                      <label>
                        Street address
                        <input name="street_address" required />
                      </label>
                      <label>
                        Landmark (optional)
                        <input name="landmark" />
                      </label>
                      <label className="account-checkbox">
                        <input name="is_default" type="checkbox" />
                        Make this my default delivery address
                      </label>
                      <Button type="submit">Save address</Button>
                    </form>
                  </>
                )}
                {section === "seller" && (
                  <>
                    <section className="account-dashboard-card seller-account-hero">
                      <span className="seller-account-kicker">
                        <Store size={15} /> SELL ON SUPRECART
                      </span>
                      <h2>
                        {sellerApplication?.status === "approved"
                          ? "Your studio is ready."
                          : sellerApplication?.status === "pending"
                            ? "Your application is with us."
                            : sellerApplication?.status === "rejected"
                              ? "Let’s try that again."
                              : "Bring what you make to more people."}
                      </h2>
                      <p className="account-intro">
                        {sellerApplication?.status === "approved"
                          ? "Manage products, orders and payouts in the seller studio, or update your details here whenever life changes."
                          : sellerApplication?.status === "pending"
                            ? "Our team reviews every seller application by hand. Nothing goes live until your shop is approved."
                            : sellerApplication?.status === "rejected"
                              ? sellerApplication.reviewNote ||
                                "Your application was not approved this time. You can update your details and submit again."
                              : "Tell us a little about your shop. Approved sellers can manage products, orders and payouts in a dedicated studio."}
                      </p>
                      {sellerApplication && (
                        <div className={`seller-application-state is-${sellerApplication.status}`}>
                          {sellerApplication.status === "approved" ? (
                            <BadgeCheck size={18} />
                          ) : sellerApplication.status === "pending" ? (
                            <Clock3 size={18} />
                          ) : (
                            <AlertTriangle size={18} />
                          )}
                          <div>
                            <strong>
                              {sellerApplication.status === "approved"
                                ? "Approved seller"
                                : sellerApplication.status === "pending"
                                  ? "Pending review"
                                  : "Application not approved"}
                            </strong>
                            <span>
                              {sellerApplication.storeName} · Submitted{" "}
                              {new Date(sellerApplication.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </section>

                    {sellerApplication?.status === "approved" ? (
                      <section className="account-dashboard-card seller-studio-card">
                        <div>
                          <div className="account-dashboard-section-heading">
                            <h2>Seller studio</h2>
                            <span>APPROVED</span>
                          </div>
                          <p className="account-intro">
                            Your shop, orders and payouts live in one focused workspace. Seller
                            changes are kept in this browser only.
                          </p>
                        </div>
                        <Button onClick={() => void openSellerStudio()}>
                          Open seller studio <ArrowRight size={15} />
                        </Button>
                      </section>
                    ) : sellerApplication?.status === "pending" ? (
                      <section className="account-dashboard-card">
                        <h2>What happens next</h2>
                        <ol className="seller-review-steps">
                          <li>
                            <span>01</span>
                            <div>
                              <strong>We review your details</strong>
                              <p>Our team checks your shop, products and payout information.</p>
                            </div>
                          </li>
                          <li>
                            <span>02</span>
                            <div>
                              <strong>You get an answer here</strong>
                              <p>
                                Your account dashboard updates when the application is reviewed.
                              </p>
                            </div>
                          </li>
                          <li>
                            <span>03</span>
                            <div>
                              <strong>Your studio opens</strong>
                              <p>Once approved, your seller workspace unlocks at /sellers.</p>
                            </div>
                          </li>
                        </ol>
                      </section>
                    ) : (
                      <form
                        className="account-dashboard-card account-form seller-application-form"
                        onSubmit={submitSellerApplication}
                      >
                        <div>
                          <h2>
                            {sellerApplication?.status === "rejected"
                              ? "Update your application"
                              : "Seller application"}
                          </h2>
                          <p className="account-intro">
                            Fields marked below are shared with the review team. No payment or
                            product goes live from this form.
                          </p>
                        </div>
                        <div className="field-pair">
                          <label>
                            Shop or business name
                            <input
                              name="storeName"
                              defaultValue={sellerApplication?.storeName ?? ""}
                              placeholder="e.g. Form & Field"
                              required
                            />
                          </label>
                          <label>
                            Phone number
                            <input
                              name="phone"
                              type="tel"
                              defaultValue={sellerApplication?.phone ?? sessionProfile.phone ?? ""}
                              placeholder="+234"
                              required
                            />
                          </label>
                        </div>
                        <label>
                          What will you sell?
                          <textarea
                            name="productDescription"
                            rows={4}
                            defaultValue={sellerApplication?.productDescription ?? ""}
                            placeholder="A short introduction to your products, materials and how you make or source them."
                            required
                          />
                        </label>
                        <div className="field-pair">
                          <label>
                            Bank name
                            <select
                              name="bankName"
                              defaultValue={sellerApplication?.bankName ?? ""}
                              required
                            >
                              <option value="" disabled>
                                Select your bank…
                              </option>
                              {sellerApplication?.bankName &&
                                !nigerianBanks.includes(sellerApplication.bankName) && (
                                  <option value={sellerApplication.bankName}>
                                    {sellerApplication.bankName} (saved)
                                  </option>
                                )}
                              {nigerianBanks.map((bank) => (
                                <option key={bank} value={bank}>
                                  {bank}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Account number
                            <input
                              name="bankAccountNumber"
                              inputMode="numeric"
                              defaultValue={sellerApplication?.bankAccountNumber ?? ""}
                              required
                            />
                          </label>
                        </div>
                        <p className="account-field-hint">
                          Payout details are stored in this browser and are never sent to a bank.
                          You can update them before any real payout is connected.
                        </p>
                        <Button type="submit">
                          {sellerApplication?.status === "rejected"
                            ? "Resubmit for review"
                            : "Submit for review"}{" "}
                          <ArrowRight size={15} />
                        </Button>
                      </form>
                    )}
                  </>
                )}
                {section === "settings" && (
                  <>
                    <div className="account-settings-section-header">
                      <h2>
                        {settingsTabs.find(([k]) => k === settingsTab)?.[1] || "Account settings"}
                      </h2>
                    </div>
                    <div className="account-settings-tabs" role="tablist" aria-label="Settings">
                      {settingsTabs.map(([key, label, Icon]) => (
                        <button
                          type="button"
                          key={key}
                          role="tab"
                          aria-selected={settingsTab === key}
                          className={settingsTab === key ? "active" : ""}
                          onClick={() => {
                            setSettingsTab(key as SettingsTab);
                            setError("");
                            setNotice("");
                            setConfirmDelete(false);
                          }}
                        >
                          <Icon size={15} /> {label}
                        </button>
                      ))}
                    </div>
                    {settingsTab === "profile" && (
                      <section className="account-dashboard-card">
                        <div className="account-profile-photo">
                          <span className="account-avatar account-avatar-lg">
                            {preferences.avatarDataUrl ? (
                              <img src={preferences.avatarDataUrl} alt="Your profile photo" />
                            ) : (
                              <UserRound size={28} />
                            )}
                          </span>
                          <div className="account-profile-photo-actions">
                            <strong>Profile photo</strong>
                            <span>
                              Shown on your account and reviews. Saved in this browser only.
                            </span>
                            <div className="account-avatar-buttons">
                              <label className="account-upload-button">
                                <Upload size={14} />{" "}
                                {preferences.avatarDataUrl ? "Change photo" : "Add photo"}
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.webp"
                                  onChange={onAvatarFile}
                                  hidden
                                />
                              </label>
                              {preferences.avatarDataUrl && (
                                <button
                                  type="button"
                                  className="account-link-button"
                                  onClick={removeAvatar}
                                >
                                  <Trash2 size={14} /> Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="local-data-note">
                          Profile changes stay in this browser. Your email address identifies the
                          account and cannot be changed here.
                        </p>
                        <form className="account-form" onSubmit={saveProfile}>
                          <label>
                            Display name
                            <input name="name" defaultValue={sessionProfile.name} required />
                          </label>
                          <label>
                            Phone
                            <input name="phone" type="tel" defaultValue={sessionProfile.phone} />
                          </label>
                          <label>
                            Account email
                            <input value={sessionAccount?.email ?? ""} disabled />
                          </label>
                          <Button type="submit">Save profile</Button>
                        </form>
                      </section>
                    )}

                    {settingsTab === "notifications" && (
                      <section className="account-dashboard-card">
                        <p className="account-intro">
                          Choose what SupreCart should tell you about. These preferences are saved
                          in this browser.
                        </p>
                        <div className="account-toggle-list">
                          {(
                            [
                              ["orderUpdates", "Order updates", "Delivery and fulfilment progress"],
                              [
                                "promotions",
                                "Deals & promotions",
                                "Sale alerts from sellers you follow",
                              ],
                              ["newsletter", "Newsletter", "Occasional marketplace news"],
                              ["securityAlerts", "Security alerts", "Sign-ins and account changes"],
                            ] as const
                          ).map(([key, title, text]) => (
                            <label key={key} className="account-toggle-row">
                              <span>
                                <strong>{title}</strong>
                                <small>{text}</small>
                              </span>
                              <input
                                type="checkbox"
                                checked={preferences.notifications[key]}
                                onChange={(event) => setNotification(key, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                        <p className="account-field-hint">
                          SupreCart does not send real messages yet; toggles are remembered locally.
                        </p>
                      </section>
                    )}

                    {settingsTab === "region" && (
                      <section className="account-dashboard-card">
                        <p className="account-intro">
                          Set how prices and dates are shown to you across the marketplace.
                        </p>
                        <div className="account-form">
                          <div className="field-pair">
                            <label>
                              Currency
                              <select
                                value={preferences.region.currency}
                                onChange={(event) => setRegion({ currency: event.target.value })}
                              >
                                {currencyOptions.map((option) => (
                                  <option key={option}>{option}</option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Language
                              <select
                                value={preferences.region.language}
                                onChange={(event) => setRegion({ language: event.target.value })}
                              >
                                {languageOptions.map((option) => (
                                  <option key={option}>{option}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label>
                            Time zone
                            <select
                              value={preferences.region.timezone}
                              onChange={(event) => setRegion({ timezone: event.target.value })}
                            >
                              {timezoneOptions.map((option) => (
                                <option key={option}>{option}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <p className="account-field-hint">
                          Currency conversion and translations are not connected yet, so these are
                          display preferences only.
                        </p>
                      </section>
                    )}

                    {settingsTab === "payments" && (
                      <section className="account-dashboard-card">
                        <p className="account-intro">
                          Payment methods for checkout. SupreCart never stores a full card number
                          and no payments are collected.
                        </p>
                        {preferences.paymentMethods.length ? (
                          <div className="account-payment-list">
                            {preferences.paymentMethods.map((method) => (
                              <article key={method.id} className="account-payment-card">
                                <span className="account-payment-brand">
                                  <CreditCard size={17} />
                                  <strong>{method.brand}</strong>
                                </span>
                                <span>•••• {method.last4}</span>
                                <span>Expires {method.expiry}</span>
                                {method.isDefault ? (
                                  <span className="account-payment-default">
                                    <Check size={12} /> Default
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="account-inline-link"
                                    onClick={() => setDefaultPaymentMethod(method.id)}
                                  >
                                    Make default
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="account-danger-link"
                                  onClick={() => removePaymentMethod(method.id)}
                                >
                                  Remove
                                </button>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="account-intro">No payment methods saved yet.</p>
                        )}
                        <form
                          className="account-form account-payment-form"
                          onSubmit={addPaymentMethod}
                        >
                          <h3>Add a payment method</h3>
                          <div className="field-pair">
                            <label>
                              Brand
                              <select name="brand" defaultValue="Visa">
                                {["Visa", "Mastercard", "Verve", "Virtual wallet"].map((brand) => (
                                  <option key={brand}>{brand}</option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Last 4 digits
                              <input
                                name="last4"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="4242"
                                required
                              />
                            </label>
                          </div>
                          <label>
                            Expiry (MM/YY)
                            <input name="expiry" placeholder="09/29" required />
                          </label>
                          <Button type="submit" variant="outline">
                            <Plus size={15} /> Add payment method
                          </Button>
                        </form>
                      </section>
                    )}

                    {settingsTab === "security" && (
                      <section className="account-dashboard-card">
                        <div className="account-toggle-list">
                          <label className="account-toggle-row">
                            <span>
                              <strong>Two-factor authentication</strong>
                              <small>
                                Extra protection for sign-in has not been connected yet.
                              </small>
                            </span>
                            <input
                              type="checkbox"
                              checked={preferences.twoFactorEnabled}
                              onChange={(event) =>
                                updatePreferences({
                                  ...preferences,
                                  twoFactorEnabled: event.target.checked,
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="account-security-actions">
                          <div>
                            <strong>Password</strong>
                            <small>
                              Reset your password from the{" "}
                              <Link to="/forgot-password">sign-in page</Link>.
                            </small>
                          </div>
                          <div>
                            <strong>Other sessions</strong>
                            <small>Sign out every other device signed in to this account.</small>
                          </div>
                          <Button
                            type="button"
                            variant="outline"

                            onClick={() => void signOutOtherSessions()}
                          >
                            <Smartphone size={15} /> Sign out other sessions
                          </Button>
                        </div>
                        <p className="account-field-hint">
                          Two-factor authentication is a placeholder; it never blocks sign-in.
                        </p>
                      </section>
                    )}

                    {settingsTab === "danger" && (
                      <section className="account-dashboard-card account-danger-zone">
                        <p className="account-intro">
                          {sessionAccount
                            ? "Permanently delete this local account, its profile, orders, messages, seller application and saved preferences from this browser."
                            : "Closing a real SupreCart account is handled by our team."}
                        </p>
                        {sessionAccount ? (
                          confirmDelete ? (
                            <div className="account-confirm">
                              <p>
                                This permanently deletes every local record for this account. It
                                cannot be undone. Continue?
                              </p>
                              <div className="account-confirm-actions">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={() => void removeAccount()}
                                >
                                  <Trash2 size={15} /> Delete account
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setConfirmDelete(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setConfirmDelete(true)}
                            >
                              <Trash2 size={15} /> Delete account
                            </Button>
                          )
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void removeAccount()}
                          >
                            <Trash2 size={15} /> Request account deletion
                          </Button>
                        )}
                      </section>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
