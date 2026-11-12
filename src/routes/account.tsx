import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Headphones,
  House,
  Lock,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Trash2,
  Truck,
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
  canConfirmOrderDelivery,
  cancelOrder,
  confirmOrderDelivery,
  getOrders,
  getProfile,
  saveProfile as saveStoredProfile,
  summarizeOrderFunds,
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
import { products } from "@/lib/catalog";
import { cleanEmail, cleanMultiline, cleanPhone, cleanText } from "@/lib/input";
import {
  accountPreferenceScope,
  defaultAccountPreferences,
  readAccountPreferences,
  saveAccountPreferences,
  type AccountPreferences,
  type NotificationPreferences,
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

type SettingsTab = "profile" | "notifications" | "security" | "danger";

const cancellationReasons = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price",
  "Delivery is taking too long",
  "Need to change the delivery details",
  "Other",
] as const;

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

type OrderFilter = "all" | BuyerOrder["status"];

const orderFilters = [
  ["all", "All orders"],
  ["Processing", "Processing"],
  ["In transit", "In transit"],
  ["Delivered", "Delivered"],
  ["Cancellation requested", "Cancellation requested"],
  ["Cancelled", "Cancelled"],
] as const;

const mobileOrderShortcuts = [
  ["Processing", "Processing", Clock3],
  ["In transit", "In transit", Truck],
  ["Delivered", "Delivered", Check],
  ["Cancelled", "Cancelled", AlertTriangle],
] as const;

function orderStatusClass(status: BuyerOrder["status"]) {
  if (status === "Processing") return "is-processing";
  if (status === "In transit") return "is-transit";
  if (status === "Delivered") return "is-delivered";
  if (status === "Cancellation requested") return "is-requested";
  return "is-cancelled";
}

function orderProgressStep(status: BuyerOrder["status"]) {
  if (status === "Delivered") return 4;
  if (status === "In transit") return 3;
  if (status === "Processing") return 2;
  return 1;
}

function orderProducts(items: string) {
  const haystack = items.toLowerCase();
  return products.filter((product) => haystack.includes(product.name.toLowerCase())).slice(0, 3);
}

const settingsTabs = [
  ["profile", "Profile", UserRound],
  ["notifications", "Notifications", Bell],
  ["security", "Security", Lock],
  ["danger", "Danger zone", AlertTriangle],
] as const;

const buyerSections = [
  ["overview", "Overview", House],
  ["orders", "Orders", Package],
  ["addresses", "Addresses", MapPin],
  ["seller", "Sell with us", Store],
  ["settings", "Settings", Settings],
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
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultAccountPreferences);
  const [preferencesScope, setPreferencesScope] = useState("");
  const [sellerApplication, setSellerApplication] = useState<SellerApplication | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState("");
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
      const hash = window.location.hash.replace("#", "");
      if (hash === "orders" || hash === "addresses" || hash === "seller") {
        setSection(hash);
      } else if (hash === "settings") {
        setSection("settings");
        setSettingsTab("profile");
      }
    };
    syncSection();
    window.addEventListener("hashchange", syncSection);
    return () => window.removeEventListener("hashchange", syncSection);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(".buyer-hub-mobile-nav")) return;
      setAccountMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [accountMenuOpen]);

  const activeSectionLabel = buyerSections.find(([key]) => key === section)?.[1] ?? "Account";
  const activeSettingsLabel =
    settingsTabs.find(([key]) => key === settingsTab)?.[1] ?? "Account settings";

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
    if (
      !nextAddress.first_name ||
      !nextAddress.last_name ||
      !nextAddress.email ||
      nextAddress.phone.replace(/\D/g, "").length < 7 ||
      !nextAddress.lga ||
      !nextAddress.community ||
      !nextAddress.street_address
    ) {
      setError("Complete the required address fields with valid details.");
      return;
    }
    const updated = [
      ...(nextAddress.is_default
        ? addresses.map((address) => ({ ...address, is_default: false }))
        : addresses),
      nextAddress,
    ];
    setAddresses(updated);
    writeLocalAddresses(sessionAccount.email, updated);
    formElement.reset();
    setError("");
    setNotice("Delivery address saved in this browser.");
  }

  function removeAddress(addressId: string) {
    if (!sessionAccount) return;
    const updated = addresses.filter((address) => address.id !== addressId);
    setAddresses(updated);
    writeLocalAddresses(sessionAccount.email, updated);
    setNotice("Delivery address removed from this browser.");
  }

  function makeDefaultAddress(addressId: string) {
    if (!sessionAccount) return;
    const updated = addresses.map((address) => ({
      ...address,
      is_default: address.id === addressId,
    }));
    setAddresses(updated);
    writeLocalAddresses(sessionAccount.email, updated);
    setNotice("Default delivery address updated for this browser.");
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

  function releaseEscrowForOrder(orderId: string) {
    if (!sessionAccount) return;
    try {
      const updated = confirmOrderDelivery(sessionAccount.email, orderId);
      const confirmed = updated.find((order) => order.id === orderId);
      const funds = confirmed ? summarizeOrderFunds(confirmed) : null;
      setOrders(updated);
      setConfirmingDeliveryId("");
      setOrderError("");
      setOrderNotice(
        funds
          ? `Delivery confirmed for order ${orderId}. The escrow record now shows ${nairaFormatter.format(funds.sellerNet)} for the seller after ${nairaFormatter.format(funds.commission)} commission. No real funds moved.`
          : `Delivery confirmed for order ${orderId}. No real funds moved.`,
      );
    } catch (cause) {
      setOrderError(
        cause instanceof Error
          ? cause.message
          : "Could not confirm delivery for this order in this browser.",
      );
    }
  }

  function openSection(next: AccountSection) {
    setSection(next);
    if (next === "settings") {
      setSettingsTab("profile");
      setConfirmDelete(false);
    }
    setError("");
    setNotice("");
    setAccountMenuOpen(false);
  }

  function openOrders(filter: OrderFilter = "all") {
    setOrderFilter(filter);
    openSection("orders");
  }

  function openSettings(next: SettingsTab) {
    setSection("settings");
    setSettingsTab(next);
    setConfirmDelete(false);
    setError("");
    setNotice("");
    setAccountMenuOpen(false);
  }

  function buyAgain(order: BuyerOrder) {
    const firstProduct = orderProducts(order.items)[0];
    const fallbackQuery = order.items.split(/[·,+]/)[0]?.trim() ?? "";
    void navigate({
      to: "/shop",
      search: { filter: "All", query: firstProduct?.name ?? fallbackQuery },
    });
  }

  const fullName = sessionProfile.name || sessionAccount?.name || "";
  const firstName = fullName.split(/\s+/)[0] || "there";
  const [addressFirstName = "", ...addressLastNameParts] = fullName.split(/\s+/);
  const addressLastName = addressLastNameParts.join(" ");
  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];
  const activeNotifications = Object.values(preferences.notifications).filter(Boolean).length;
  const filteredOrders =
    orderFilter === "all" ? orders : orders.filter((order) => order.status === orderFilter);
  const sellerStatus = sellerApplication
    ? sellerApplication.status === "approved"
      ? "Approved"
      : sellerApplication.status === "pending"
        ? "In review"
        : "Not approved"
    : "Not applied";

  return (
    <main id="main-content" tabIndex={-1} className={`buyer-hub-page buyer-hub-${section}`}>
      <nav className="buyer-hub-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span>Your Account</span>
      </nav>

      <section className="buyer-hub-shell">
        <header className="buyer-hub-header">
          <div className="buyer-hub-header-user">
            <span className="account-avatar buyer-hub-avatar">
              {preferences.avatarDataUrl ? (
                <img src={preferences.avatarDataUrl} alt="" />
              ) : (
                <UserRound size={30} />
              )}
            </span>
            <div>
              <p className="buyer-hub-overline">YOUR ACCOUNT</p>
              <h1>{loading ? "Your Account" : `Hello, ${firstName}`}</h1>
              <p className="buyer-hub-header-meta">
                {loading ? (
                  <span>Loading account details...</span>
                ) : (
                  <>
                    <span>{sessionAccount?.email}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sessionProfile.phone || "No phone added yet"}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="buyer-hub-header-actions">
            <Link
              to="/messages"
              search={{ productId: undefined }}
              className="buyer-hub-header-link"
            >
              <MessageCircle size={16} /> Messages
            </Link>
            <Link to="/" className="buyer-hub-header-link">
              <ShoppingBag size={16} /> Continue shopping
            </Link>
          </div>
        </header>

        {sessionAccount && (
          <p className="buyer-hub-local-note" role="status">
            <ShieldCheck size={14} />
            Demo account: orders, profile edits and saved details live in this browser only. No real
            order is placed and no payment is taken.
          </p>
        )}

        {!loading && (
          <div className="buyer-hub-layout">
            <aside className="buyer-hub-sidebar">
              <div className="buyer-hub-sidebar-profile">
                <span className="account-avatar">
                  {preferences.avatarDataUrl ? (
                    <img src={preferences.avatarDataUrl} alt="" />
                  ) : (
                    <UserRound size={20} />
                  )}
                </span>
                <div>
                  <strong>{fullName || "SupreCart buyer"}</strong>
                  <span>Buyer account</span>
                </div>
              </div>
              <nav className="buyer-hub-sidebar-nav" aria-label="Account sections">
                <p className="buyer-hub-sidebar-label">Your account</p>
                {buyerSections.map(([key, label, Icon]) => (
                  <button
                    type="button"
                    key={key}
                    className={section === key ? "active" : ""}
                    aria-current={section === key ? "page" : undefined}
                    onClick={() => openSection(key)}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                    <ChevronRight size={14} className="buyer-hub-sidebar-chevron" />
                  </button>
                ))}
              </nav>
              <div className="buyer-hub-sidebar-services">
                <p className="buyer-hub-sidebar-label">Help & services</p>
                <Link to="/messages" search={{ productId: undefined }}>
                  <MessageCircle size={16} /> Messages
                </Link>
                <Link to="/support">
                  <Headphones size={16} /> Customer service
                </Link>
                <Link to="/info/$slug" params={{ slug: "faq" }}>
                  <CircleHelp size={16} /> Help centre
                </Link>
              </div>
              <button type="button" className="buyer-hub-signout" onClick={() => void signOut()}>
                <LogOut size={16} /> Sign out
              </button>
            </aside>

            <div className="buyer-hub-main">
              <div className="buyer-hub-mobile-nav">
                <button
                  type="button"
                  className="buyer-hub-mobile-trigger"
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  aria-controls="buyer-hub-mobile-menu"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  <Menu size={17} />
                  <span>{activeSectionLabel}</span>
                  <ChevronDown size={15} className="buyer-hub-mobile-chevron" />
                </button>
                {accountMenuOpen && (
                  <div id="buyer-hub-mobile-menu" className="buyer-hub-mobile-dropdown" role="menu">
                    <p className="buyer-hub-sidebar-label">Account menu</p>
                    {buyerSections.map(([key, label, Icon]) => (
                      <button
                        type="button"
                        key={key}
                        role="menuitem"
                        className={section === key ? "active" : ""}
                        aria-current={section === key ? "page" : undefined}
                        onClick={() => openSection(key)}
                      >
                        <Icon size={16} /> {label}
                      </button>
                    ))}
                    <Link
                      to="/messages"
                      search={{ productId: undefined }}
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <MessageCircle size={16} /> Messages
                    </Link>
                    <button type="button" role="menuitem" onClick={() => void signOut()}>
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>

              <div className="buyer-hub-notices">
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
              </div>
              {section === "overview" && (
                <>
                  <div className="buyer-hub-mobile-account">
                    <section className="buyer-hub-mobile-profile">
                      <div className="buyer-hub-mobile-profile-row">
                        <span className="account-avatar buyer-hub-mobile-avatar">
                          {preferences.avatarDataUrl ? (
                            <img src={preferences.avatarDataUrl} alt="" />
                          ) : (
                            <UserRound size={28} />
                          )}
                        </span>
                        <div className="buyer-hub-mobile-identity">
                          <span className="buyer-hub-mobile-overline">MY ACCOUNT</span>
                          <h1>Hi, {firstName}</h1>
                          <p>{sessionAccount?.email}</p>
                        </div>
                        <button
                          type="button"
                          className="buyer-hub-mobile-edit"
                          aria-label="Edit profile"
                          onClick={() => openSettings("profile")}
                        >
                          <Settings size={18} />
                        </button>
                      </div>
                      <p className="buyer-hub-mobile-local-note">
                        <ShieldCheck size={13} />
                        Demo account. Orders, profile edits and saved details stay in this browser.
                      </p>
                    </section>

                    <section className="buyer-hub-mobile-card buyer-hub-mobile-orders">
                      <div className="buyer-hub-mobile-section-head">
                        <div>
                          <span className="buyer-hub-mobile-overline">MY ORDERS</span>
                          <h2>Orders</h2>
                        </div>
                        <button type="button" onClick={() => openOrders("all")}>
                          See all <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="buyer-hub-mobile-status-grid">
                        {mobileOrderShortcuts.map(([status, label, Icon]) => {
                          const count = orders.filter((order) => order.status === status).length;
                          return (
                            <button
                              type="button"
                              key={status}
                              onClick={() => openOrders(status)}
                              aria-label={`View ${label.toLowerCase()} orders`}
                            >
                              <span className="buyer-hub-mobile-status-icon">
                                <Icon size={20} />
                                {count > 0 && <b>{count}</b>}
                              </span>
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="buyer-hub-mobile-card buyer-hub-mobile-recent">
                      <div className="buyer-hub-mobile-section-head">
                        <div>
                          <span className="buyer-hub-mobile-overline">RECENT PURCHASES</span>
                          <h2>Recent orders</h2>
                        </div>
                        <button type="button" onClick={() => openOrders("all")}>
                          See all <ChevronRight size={14} />
                        </button>
                      </div>
                      {orders.length ? (
                        <div className="buyer-hub-mobile-recent-list">
                          {orders.slice(0, 2).map((order) => {
                            const images = orderProducts(order.items);
                            return (
                              <button
                                type="button"
                                key={order.id}
                                className="buyer-hub-mobile-recent-order"
                                onClick={() => openOrders("all")}
                              >
                                <span className="buyer-hub-mobile-recent-thumbs">
                                  {images.length ? (
                                    images
                                      .slice(0, 2)
                                      .map((product) => (
                                        <img
                                          key={product.id}
                                          src={product.image}
                                          alt=""
                                          loading="lazy"
                                        />
                                      ))
                                  ) : (
                                    <span>
                                      <Package size={18} />
                                    </span>
                                  )}
                                </span>
                                <span className="buyer-hub-mobile-recent-copy">
                                  <span
                                    className={`buyer-hub-status ${orderStatusClass(order.status)}`}
                                  >
                                    {order.status}
                                  </span>
                                  <strong>{order.items}</strong>
                                  <small>
                                    {nairaFormatter.format(order.total)} ·{" "}
                                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </small>
                                </span>
                                <ChevronRight size={16} />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="buyer-hub-mobile-empty">
                          <Package size={22} />
                          <p>No orders yet. Your next good find will show up here.</p>
                          <button
                            type="button"
                            onClick={() =>
                              navigate({ to: "/shop", search: { filter: "All", query: "" } })
                            }
                          >
                            Start shopping
                          </button>
                        </div>
                      )}
                    </section>

                    <section className="buyer-hub-mobile-card buyer-hub-mobile-menu">
                      <div className="buyer-hub-mobile-section-head">
                        <div>
                          <span className="buyer-hub-mobile-overline">ACCOUNT</span>
                          <h2>Manage your account</h2>
                        </div>
                      </div>
                      <div className="buyer-hub-mobile-menu-list">
                        <button
                          type="button"
                          className="buyer-hub-mobile-menu-row"
                          onClick={() => openSettings("profile")}
                        >
                          <span className="buyer-hub-mobile-menu-icon">
                            <UserRound size={18} />
                          </span>
                          <span>
                            <strong>Profile</strong>
                            <small>{fullName || "Update your name and phone"}</small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                        <button
                          type="button"
                          className="buyer-hub-mobile-menu-row"
                          onClick={() => openSection("addresses")}
                        >
                          <span className="buyer-hub-mobile-menu-icon">
                            <MapPin size={18} />
                          </span>
                          <span>
                            <strong>Addresses</strong>
                            <small>
                              {addresses.length
                                ? `${addresses.length} saved ${addresses.length === 1 ? "address" : "addresses"}`
                                : "Add a delivery address"}
                            </small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                        <button
                          type="button"
                          className="buyer-hub-mobile-menu-row"
                          onClick={() => openSettings("notifications")}
                        >
                          <span className="buyer-hub-mobile-menu-icon">
                            <Bell size={18} />
                          </span>
                          <span>
                            <strong>Notifications</strong>
                            <small>{activeNotifications} preferences active</small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                        <button
                          type="button"
                          className="buyer-hub-mobile-menu-row"
                          onClick={() => openSettings("security")}
                        >
                          <span className="buyer-hub-mobile-menu-icon">
                            <Lock size={18} />
                          </span>
                          <span>
                            <strong>Login &amp; security</strong>
                            <small>
                              {preferences.twoFactorEnabled
                                ? "Extra protection on"
                                : "Review sign-in settings"}
                            </small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                        <button
                          type="button"
                          className="buyer-hub-mobile-menu-row"
                          onClick={() =>
                            sellerApplication?.status === "approved"
                              ? void openSellerStudio()
                              : openSection("seller")
                          }
                        >
                          <span className="buyer-hub-mobile-menu-icon">
                            <Store size={18} />
                          </span>
                          <span>
                            <strong>Sell on SupreCart</strong>
                            <small>{sellerStatus}</small>
                          </span>
                          <ChevronRight size={15} />
                        </button>
                        <Link
                          to="/messages"
                          search={{ productId: undefined }}
                          className="buyer-hub-mobile-menu-row"
                        >
                          <span className="buyer-hub-mobile-menu-icon">
                            <MessageCircle size={18} />
                          </span>
                          <span>
                            <strong>Messages</strong>
                            <small>Chat with sellers</small>
                          </span>
                          <ChevronRight size={15} />
                        </Link>
                        <Link to="/support" className="buyer-hub-mobile-menu-row">
                          <span className="buyer-hub-mobile-menu-icon">
                            <Headphones size={18} />
                          </span>
                          <span>
                            <strong>Help &amp; support</strong>
                            <small>Orders, returns and account help</small>
                          </span>
                          <ChevronRight size={15} />
                        </Link>
                      </div>
                    </section>

                    <button
                      type="button"
                      className="buyer-hub-mobile-signout"
                      onClick={() => void signOut()}
                    >
                      <LogOut size={17} /> Sign out
                    </button>
                  </div>

                  <section className="buyer-hub-welcome">
                    <div>
                      <span className="buyer-hub-welcome-kicker">
                        <ShieldCheck size={14} /> BUYER ACCOUNT
                      </span>
                      <h2>Welcome back, {firstName}</h2>
                      <p>
                        Track orders, manage delivery details and keep your SupreCart account up to
                        date.
                      </p>
                    </div>
                    <div className="buyer-hub-welcome-actions">
                      <Button
                        size="lg"
                        onClick={() =>
                          navigate({ to: "/shop", search: { filter: "All", query: "" } })
                        }
                      >
                        <ShoppingBag size={16} /> Continue shopping
                      </Button>
                      <Link
                        to="/messages"
                        search={{ productId: undefined }}
                        className="buyer-hub-welcome-link"
                      >
                        View messages <ChevronRight size={14} />
                      </Link>
                    </div>
                  </section>

                  <div className="buyer-hub-quick-grid">
                    <button
                      type="button"
                      className="buyer-hub-quick-card"
                      onClick={() => openOrders("all")}
                    >
                      <span className="buyer-hub-quick-icon">
                        <Package size={20} />
                      </span>
                      <span>
                        <strong>Your Orders</strong>
                        <small>
                          {orders.length} {orders.length === 1 ? "order" : "orders"} placed
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="buyer-hub-quick-card"
                      onClick={() => openSection("addresses")}
                    >
                      <span className="buyer-hub-quick-icon">
                        <MapPin size={20} />
                      </span>
                      <span>
                        <strong>Your Addresses</strong>
                        <small>
                          {addresses.length
                            ? `${addresses.length} saved ${addresses.length === 1 ? "address" : "addresses"}`
                            : "Add a delivery address"}
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="buyer-hub-quick-card"
                      onClick={() => openSettings("notifications")}
                    >
                      <span className="buyer-hub-quick-icon">
                        <Bell size={20} />
                      </span>
                      <span>
                        <strong>Notifications</strong>
                        <small>{activeNotifications} preferences active</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="buyer-hub-quick-card"
                      onClick={() => openSettings("security")}
                    >
                      <span className="buyer-hub-quick-icon">
                        <Lock size={20} />
                      </span>
                      <span>
                        <strong>Login & Security</strong>
                        <small>
                          {preferences.twoFactorEnabled ? "Extra protection on" : "Review sign-in"}
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      className="buyer-hub-quick-card"
                      onClick={() =>
                        sellerApplication?.status === "approved"
                          ? void openSellerStudio()
                          : openSection("seller")
                      }
                    >
                      <span className="buyer-hub-quick-icon">
                        <Store size={20} />
                      </span>
                      <span>
                        <strong>Sell on SupreCart</strong>
                        <small>{sellerStatus}</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="buyer-hub-overview-columns">
                    <section className="buyer-hub-panel buyer-hub-recent-orders">
                      <div className="buyer-hub-section-head">
                        <div>
                          <span className="buyer-hub-overline">RECENT PURCHASES</span>
                          <h3>Recent orders</h3>
                        </div>
                        <button type="button" onClick={() => openOrders("all")}>
                          See all orders <ArrowRight size={14} />
                        </button>
                      </div>
                      {orders.length ? (
                        <div className="buyer-hub-recent-list">
                          {orders.slice(0, 3).map((order) => {
                            const images = orderProducts(order.items);
                            return (
                              <article key={order.id} className="buyer-hub-recent-order">
                                <div className="buyer-hub-order-thumbs">
                                  {images.length ? (
                                    images
                                      .slice(0, 2)
                                      .map((product) => (
                                        <img
                                          key={product.id}
                                          src={product.image}
                                          alt=""
                                          loading="lazy"
                                        />
                                      ))
                                  ) : (
                                    <span className="buyer-hub-order-thumb-fallback">
                                      <Package size={19} />
                                    </span>
                                  )}
                                </div>
                                <div className="buyer-hub-recent-copy">
                                  <span
                                    className={`buyer-hub-status ${orderStatusClass(order.status)}`}
                                  >
                                    {order.status}
                                  </span>
                                  <strong>{order.items}</strong>
                                  <small>
                                    Order {order.id} ·{" "}
                                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </small>
                                </div>
                                <div className="buyer-hub-recent-total">
                                  <strong>{nairaFormatter.format(order.total)}</strong>
                                  <button
                                    type="button"
                                    onClick={() => openOrders("all")}
                                    className="buyer-hub-text-link"
                                  >
                                    View <ChevronRight size={13} />
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="buyer-hub-empty">
                          <span>
                            <Package size={22} />
                          </span>
                          <strong>No orders yet</strong>
                          <p>When you place an order, it will appear here.</p>
                          <Button
                            variant="outline"
                            onClick={() =>
                              navigate({ to: "/shop", search: { filter: "All", query: "" } })
                            }
                          >
                            Start shopping
                          </Button>
                        </div>
                      )}
                    </section>

                    <div className="buyer-hub-side-stack">
                      <section className="buyer-hub-panel">
                        <div className="buyer-hub-panel-title">
                          <h3>Account details</h3>
                          <button
                            type="button"
                            className="buyer-hub-text-link"
                            onClick={() => openSettings("profile")}
                          >
                            Edit
                          </button>
                        </div>
                        <dl className="buyer-hub-details">
                          <div>
                            <dt>Name</dt>
                            <dd>{fullName || "Not set"}</dd>
                          </div>
                          <div>
                            <dt>Email</dt>
                            <dd>{sessionAccount?.email}</dd>
                          </div>
                          <div>
                            <dt>Phone</dt>
                            <dd>{sessionProfile.phone || "Not added"}</dd>
                          </div>
                        </dl>
                      </section>

                      <section className="buyer-hub-panel">
                        <div className="buyer-hub-panel-title">
                          <h3>Default address</h3>
                          <button
                            type="button"
                            className="buyer-hub-text-link"
                            onClick={() => openSection("addresses")}
                          >
                            Manage
                          </button>
                        </div>
                        {defaultAddress ? (
                          <div className="buyer-hub-address-summary">
                            <MapPin size={17} />
                            <p>
                              <strong>
                                {defaultAddress.first_name} {defaultAddress.last_name}
                              </strong>
                              {defaultAddress.street_address}, {defaultAddress.community},{" "}
                              {defaultAddress.lga}
                            </p>
                          </div>
                        ) : (
                          <div className="buyer-hub-mini-empty">
                            <p>No delivery address saved yet.</p>
                            <button
                              type="button"
                              className="buyer-hub-text-link"
                              onClick={() => openSection("addresses")}
                            >
                              Add an address <ArrowRight size={13} />
                            </button>
                          </div>
                        )}
                      </section>
                    </div>
                  </div>

                  <section className="buyer-hub-panel buyer-hub-recommendations">
                    <div className="buyer-hub-section-head">
                      <div>
                        <span className="buyer-hub-overline">POPULAR ON SUPRECART</span>
                        <h3>Recommended for you</h3>
                      </div>
                      <Link to="/shop" search={{ filter: "All", query: "" }}>
                        Shop all <ArrowRight size={14} />
                      </Link>
                    </div>
                    <div className="buyer-hub-product-grid">
                      {products.slice(0, 4).map((product) => (
                        <Link
                          key={product.id}
                          to="/shop"
                          search={{ filter: "All", query: product.name }}
                          className="buyer-hub-product-card"
                        >
                          <img src={product.image} alt="" loading="lazy" />
                          <span>{product.brand}</span>
                          <strong>{product.name}</strong>
                          <p>{nairaFormatter.format(product.price)}</p>
                          <small>
                            {product.rating} ★ · {product.reviews} reviews
                          </small>
                        </Link>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {section === "orders" && (
                <>
                  <div className="buyer-hub-page-heading">
                    <div>
                      <span className="buyer-hub-overline">YOUR PURCHASES</span>
                      <h2>Your Orders</h2>
                      <p>Track packages, request cancellations and buy your favourites again.</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate({ to: "/shop", search: { filter: "All", query: "" } })
                      }
                    >
                      <ShoppingBag size={15} /> Continue shopping
                    </Button>
                  </div>

                  <div className="buyer-hub-order-filters" role="tablist" aria-label="Order status">
                    {orderFilters.map(([key, label]) => {
                      const count =
                        key === "all"
                          ? orders.length
                          : orders.filter((order) => order.status === key).length;
                      return (
                        <button
                          type="button"
                          key={key}
                          role="tab"
                          aria-selected={orderFilter === key}
                          className={orderFilter === key ? "active" : ""}
                          onClick={() => setOrderFilter(key)}
                        >
                          {label} <span>{count}</span>
                        </button>
                      );
                    })}
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
                    filteredOrders.length ? (
                      <div className="buyer-hub-order-list" id="buyer-orders-list">
                        {filteredOrders.map((order) => {
                          const images = orderProducts(order.items);
                          const progressStep = orderProgressStep(order.status);
                          const funds = summarizeOrderFunds(order);
                          const fundsReleased = funds.status === "released";
                          const trackable =
                            order.status === "Processing" ||
                            order.status === "In transit" ||
                            order.status === "Delivered";
                          return (
                            <article key={order.id} className="buyer-hub-order-card">
                              <header className="buyer-hub-order-head">
                                <div>
                                  <span>ORDER PLACED</span>
                                  <strong>
                                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </strong>
                                </div>
                                <div>
                                  <span>TOTAL</span>
                                  <strong>{nairaFormatter.format(order.total)}</strong>
                                </div>
                                <div>
                                  <span>SHIP TO</span>
                                  <strong>{order.delivery}</strong>
                                </div>
                                <div>
                                  <span>ORDER #</span>
                                  <strong>{order.id}</strong>
                                </div>
                                <span
                                  className={`buyer-hub-status ${orderStatusClass(order.status)}`}
                                >
                                  {order.status}
                                </span>
                              </header>

                              <div className="buyer-hub-order-body">
                                <div className="buyer-hub-order-thumbs">
                                  {images.length ? (
                                    images.map((product) => (
                                      <img
                                        key={product.id}
                                        src={product.image}
                                        alt={product.name}
                                        loading="lazy"
                                      />
                                    ))
                                  ) : (
                                    <span className="buyer-hub-order-thumb-fallback">
                                      <Package size={22} />
                                    </span>
                                  )}
                                </div>
                                <div className="buyer-hub-order-copy">
                                  <h3>{order.items}</h3>
                                  <p>
                                    {order.source === "checkout"
                                      ? "Placed through SupreCart checkout"
                                      : "Marketplace order"}
                                    {order.delivery ? ` · Delivering to ${order.delivery}` : ""}
                                  </p>
                                  {trackable && (
                                    <ol className="buyer-hub-order-progress">
                                      {[
                                        "Order placed",
                                        "Processing",
                                        "In transit",
                                        "Delivered",
                                      ].map((label, index) => (
                                        <li
                                          key={label}
                                          className={index + 1 <= progressStep ? "is-complete" : ""}
                                        >
                                          <span>
                                            {index + 1 <= progressStep ? (
                                              <Check size={11} />
                                            ) : (
                                              index + 1
                                            )}
                                          </span>
                                          <small>{label}</small>
                                        </li>
                                      ))}
                                    </ol>
                                  )}
                                </div>
                                <div className="buyer-hub-order-actions">
                                  {canConfirmOrderDelivery(order) && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setConfirmingDeliveryId(order.id);
                                        setOrderError("");
                                        setOrderNotice("");
                                      }}
                                    >
                                      <Check size={14} /> Confirm package received
                                    </Button>
                                  )}
                                  <Button size="sm" onClick={() => buyAgain(order)}>
                                    <ShoppingBag size={14} /> Buy again
                                  </Button>
                                  <Link
                                    to="/support"
                                    search={{ orderId: order.id }}
                                    className="buyer-hub-outline-link"
                                  >
                                    <Headphones size={14} /> Get help
                                  </Link>
                                  {canCancelOrder(order) && (
                                    <button
                                      type="button"
                                      className="buyer-hub-danger-link"
                                      onClick={() => beginCancelOrder(order.id)}
                                    >
                                      Cancel order
                                    </button>
                                  )}
                                </div>
                              </div>

                              {funds.status !== "none" && (
                                <div
                                  className={`buyer-hub-order-escrow ${fundsReleased ? "is-released" : ""}`}
                                >
                                  <span className="buyer-hub-escrow-icon">
                                    <ShieldCheck size={17} />
                                  </span>
                                  <div className="buyer-hub-escrow-copy">
                                    <strong>
                                      {fundsReleased
                                        ? "Escrow released to the seller"
                                        : `${nairaFormatter.format(funds.heldGross)} held in escrow`}
                                    </strong>
                                    <span>
                                      {fundsReleased
                                        ? "Delivery was confirmed by the buyer in this browser. SupreCart commission has been deducted from the seller payout."
                                        : "SupreCart holds the item funds until you confirm the package arrived. Commission is deducted from the seller net before release."}
                                    </span>
                                  </div>
                                  <dl className="buyer-hub-escrow-amounts">
                                    <div>
                                      <dt>Seller net</dt>
                                      <dd>
                                        {nairaFormatter.format(
                                          fundsReleased ? funds.released : funds.sellerNet,
                                        )}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>SupreCart share</dt>
                                      <dd>{nairaFormatter.format(funds.commission)}</dd>
                                    </div>
                                  </dl>
                                </div>
                              )}

                              {confirmingDeliveryId === order.id && (
                                <div className="buyer-hub-order-confirm-delivery">
                                  <p>
                                    <strong>Confirm package received?</strong> This marks the order
                                    delivered and releases the simulated escrow to the seller after
                                    commission. No real money moves in this demo.
                                  </p>
                                  <div className="account-confirm-actions">
                                    <Button
                                      size="sm"
                                      type="button"
                                      onClick={() => releaseEscrowForOrder(order.id)}
                                    >
                                      <Check size={14} /> Confirm delivery
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      type="button"
                                      onClick={() => setConfirmingDeliveryId("")}
                                    >
                                      Not yet
                                    </Button>
                                  </div>
                                </div>
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
                                <p className="buyer-hub-order-cancel-note">
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
                                    confirmCancelOrder(
                                      order.id,
                                      cleanText(form.get("reason"), 300),
                                    );
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
                                order.status === "Processing" &&
                                !canCancelOrder(order) && (
                                  <p className="buyer-hub-order-cancel-note">
                                    The 24-hour cancellation window for this order has closed.
                                  </p>
                                )
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="buyer-hub-empty">
                        <span>
                          <Package size={22} />
                        </span>
                        <strong>No {orderFilter.toLowerCase()} orders</strong>
                        <p>Try another order status to see more of your purchases.</p>
                        <Button variant="outline" onClick={() => setOrderFilter("all")}>
                          View all orders
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="buyer-hub-empty">
                      <span>
                        <Package size={22} />
                      </span>
                      <strong>You have not placed an order yet</strong>
                      <p>Order history is kept in this browser only.</p>
                      <Button
                        onClick={() =>
                          navigate({ to: "/shop", search: { filter: "All", query: "" } })
                        }
                      >
                        Start shopping <ArrowRight size={14} />
                      </Button>
                    </div>
                  )}

                  <div className="buyer-hub-order-help">
                    <div>
                      <Truck size={18} />
                      <p>
                        <strong>Need help with a delivery?</strong>
                        Our customer care team can help with order questions and cancellation
                        requests.
                      </p>
                    </div>
                    <Link to="/support" className="buyer-hub-text-link">
                      Chat with customer care <ArrowRight size={14} />
                    </Link>
                  </div>
                </>
              )}
              {section === "addresses" && (
                <>
                  <div className="buyer-hub-page-heading">
                    <div>
                      <span className="buyer-hub-overline">DELIVERY DETAILS</span>
                      <h2>Your Addresses</h2>
                      <p>
                        Save the places you order to most often. Addresses stay in this browser
                        only.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        document
                          .getElementById("buyer-address-form")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                    >
                      <Plus size={15} /> Add a new address
                    </Button>
                  </div>

                  <div className="buyer-hub-address-layout">
                    <section className="buyer-hub-panel">
                      <div className="buyer-hub-panel-title">
                        <h3>Saved delivery addresses</h3>
                        <span className="buyer-hub-count">{addresses.length}</span>
                      </div>
                      {addresses.length ? (
                        <div className="buyer-hub-address-grid">
                          {addresses.map((address) => (
                            <article
                              key={address.id}
                              className={`buyer-hub-address-card${address.is_default ? " is-default" : ""}`}
                            >
                              <header>
                                <span>
                                  <MapPin size={18} />
                                </span>
                                <div>
                                  <strong>
                                    {address.first_name} {address.last_name}
                                  </strong>
                                  {address.is_default && (
                                    <small className="buyer-hub-default-badge">DEFAULT</small>
                                  )}
                                </div>
                              </header>
                              <p>
                                {address.street_address}
                                <br />
                                {address.community}, {address.lga}
                              </p>
                              <small>
                                {address.phone}
                                <br />
                                {address.email}
                                {address.landmark ? (
                                  <>
                                    <br />
                                    Landmark: {address.landmark}
                                  </>
                                ) : null}
                              </small>
                              <footer>
                                {!address.is_default && (
                                  <button
                                    type="button"
                                    className="buyer-hub-text-link"
                                    onClick={() => makeDefaultAddress(address.id)}
                                  >
                                    Set as default
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="buyer-hub-danger-link"
                                  onClick={() => removeAddress(address.id)}
                                >
                                  Remove
                                </button>
                              </footer>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="buyer-hub-empty">
                          <span>
                            <MapPin size={22} />
                          </span>
                          <strong>No saved delivery addresses</strong>
                          <p>Add an address to make checkout faster.</p>
                        </div>
                      )}
                    </section>

                    <form
                      id="buyer-address-form"
                      className="buyer-hub-panel account-form buyer-hub-address-form"
                      onSubmit={addAddress}
                    >
                      <div>
                        <span className="buyer-hub-overline">NEW ADDRESS</span>
                        <h3>Add a delivery address</h3>
                      </div>
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
                      <Button type="submit">
                        <Check size={15} /> Save address
                      </Button>
                    </form>
                  </div>
                </>
              )}
              {section === "seller" && (
                <>
                  <div className="buyer-hub-page-heading">
                    <div>
                      <span className="buyer-hub-overline">GROW WITH SUPRECART</span>
                      <h2>Sell on SupreCart</h2>
                      <p>
                        Apply for a seller account, track your review and manage your seller studio.
                      </p>
                    </div>
                  </div>
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
                            <p>Your account dashboard updates when the application is reviewed.</p>
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
                          Fields marked below are shared with the review team. No payment or product
                          goes live from this form.
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
                  <div className="buyer-hub-page-heading">
                    <div>
                      <span className="buyer-hub-overline">ACCOUNT SETTINGS</span>
                      <h2>Account Settings</h2>
                      <p>Manage your profile, preferences and account security.</p>
                    </div>
                  </div>

                  <div className="buyer-hub-settings-layout">
                    <aside className="buyer-hub-settings-nav" aria-label="Account settings">
                      <p className="buyer-hub-sidebar-label">Settings</p>
                      {settingsTabs.map(([key, label, Icon]) => (
                        <button
                          type="button"
                          key={key}
                          className={settingsTab === key ? "active" : ""}
                          aria-current={settingsTab === key ? "page" : undefined}
                          onClick={() => openSettings(key as SettingsTab)}
                        >
                          <Icon size={16} />
                          <span>{label}</span>
                          <ChevronRight size={13} />
                        </button>
                      ))}
                    </aside>

                    <div className="buyer-hub-settings-content">
                      <label className="buyer-hub-settings-select">
                        Settings section
                        <select
                          value={settingsTab}
                          onChange={(event) => openSettings(event.target.value as SettingsTab)}
                        >
                          {settingsTabs.map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="buyer-hub-settings-title">
                        <Settings size={18} />
                        <h3>{activeSettingsLabel}</h3>
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
                                [
                                  "orderUpdates",
                                  "Order updates",
                                  "Delivery and fulfilment progress",
                                ],
                                [
                                  "promotions",
                                  "Deals & promotions",
                                  "Sale alerts from sellers you follow",
                                ],
                                ["newsletter", "Newsletter", "Occasional marketplace news"],
                                [
                                  "securityAlerts",
                                  "Security alerts",
                                  "Sign-ins and account changes",
                                ],
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
                            SupreCart does not send real messages yet; toggles are remembered
                            locally.
                          </p>
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
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
