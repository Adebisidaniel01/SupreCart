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
  clearDemoAccount,
  getAccountModeration,
  readActiveAccount,
  type DemoAccount,
} from "@/lib/demo-accounts";
import { deleteDemoAccountData } from "@/lib/demo-account-cleanup";
import { getDemoOrders, getDemoProfile, saveDemoProfile } from "@/lib/demo-orders";
import {
  getSellerApplication,
  submitSellerApplication as saveSellerApplication,
  subscribeSellerApplications,
  type SellerApplication,
} from "@/lib/seller-applications";
import { trackEvent } from "@/lib/analytics";
import { avatarErrorMessage, processAvatarFile } from "@/lib/avatar";
import {
  accountPreferenceScope,
  createPaymentMethod,
  currencyOptions,
  defaultAccountPreferences,
  languageOptions,
  readAccountPreferences,
  saveAccountPreferences,
  timezoneOptions,
  type AccountPreferences,
  type NotificationPreferences,
  type RegionPreferences,
} from "@/lib/account-preferences";

type BuyerOrder = {
  id: string;
  status: string;
  created_at: string;
  total?: number;
  items?: string;
  delivery?: string;
};

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

const addressStorageKey = (email: string) => `suprecart-demo-addresses:${email.toLowerCase()}`;

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
  const [demoAccount, setDemoAccount] = useState<DemoAccount | null>(null);
  const [demoProfile, setDemoProfile] = useState({ name: "", phone: "" });
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [section, setSection] = useState<AccountSection>("overview");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultAccountPreferences);
  const [preferencesScope, setPreferencesScope] = useState("");
  const [sellerApplication, setSellerApplication] = useState<SellerApplication | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    setDemoAccount(activeAccount);
    setDemoProfile(getDemoProfile(activeAccount.email, activeAccount.name));
    setOrders(getDemoOrders(activeAccount.email));
    setAddresses(readLocalAddresses(activeAccount.email));
    setError("");
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!demoAccount) {
      setSellerApplication(null);
      return;
    }
    const syncApplication = () => setSellerApplication(getSellerApplication(demoAccount.email));
    syncApplication();
    return subscribeSellerApplications(syncApplication);
  }, [demoAccount]);

  useEffect(() => {
    const syncSection = () => {
      if (window.location.hash === "#seller") {
        setSection("seller");
        setSettingsOpen(false);
      } else if (window.location.hash === "#settings") {
        setSection("settings");
        setSettingsTab("profile");
        setSettingsOpen(true);
      }
    };
    syncSection();
    window.addEventListener("hashchange", syncSection);
    return () => window.removeEventListener("hashchange", syncSection);
  }, []);

  const identity = demoAccount?.email ?? "";
  const moderation = demoAccount ? getAccountModeration(demoAccount.email) : null;
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
    if (!demoAccount) {
      setError("Sign in to your buyer account before applying to sell.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const application = saveSellerApplication({
      email: demoAccount.email,
      name: demoAccount.name,
      storeName: String(form.get("storeName")).trim(),
      phone: String(form.get("phone")).trim(),
      productDescription: String(form.get("productDescription")).trim(),
      bankName: String(form.get("bankName")).trim(),
      bankAccountNumber: String(form.get("bankAccountNumber")).trim(),
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
    const brand = String(form.get("brand"));
    const last4 = String(form.get("last4")).replace(/\D/g, "");
    const expiry = String(form.get("expiry")).trim();
    if (last4.length < 4 || !/^\d{2}\/\d{2}$/.test(expiry)) {
      setError("Enter the last 4 digits and an expiry in MM/YY format.");
      return;
    }
    const method = createPaymentMethod({ brand, last4, expiry });
    method.isDefault = preferences.paymentMethods.length === 0;
    updatePreferences({ ...preferences, paymentMethods: [...preferences.paymentMethods, method] });
    formElement.reset();
    setError("");
    setNotice("Sample payment method saved in this browser. No real card is stored or charged.");
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
    setNotice("This preview keeps one session in this browser, so there are no other devices.");
  }

  async function removeAccount() {
    if (demoAccount) {
      deleteDemoAccountData(demoAccount.email);
      setDemoAccount(null);
      await navigate({ to: "/login" });
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!demoAccount) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const phone = String(form.get("phone")).trim();
    if (!name) {
      setError("Enter your name before saving.");
      return;
    }
    saveDemoProfile(demoAccount.email, { name, phone });
    setDemoAccount({ ...demoAccount, name });
    setDemoProfile({ name, phone });
    setError("");
    setNotice("Your profile has been updated in this browser.");
  }

  function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!demoAccount) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nextAddress: BuyerAddress = {
      id: crypto.randomUUID(),
      first_name: String(form.get("first_name")).trim(),
      last_name: String(form.get("last_name")).trim(),
      email: String(form.get("email")).trim().toLowerCase(),
      phone: String(form.get("phone")).trim(),
      lga: String(form.get("lga")).trim(),
      community: String(form.get("community")).trim(),
      street_address: String(form.get("street_address")).trim(),
      landmark: String(form.get("landmark")).trim(),
      is_default: addresses.length === 0 || form.get("is_default") === "on",
    };
    const updated = [
      ...(nextAddress.is_default
        ? addresses.map((address) => ({ ...address, is_default: false }))
        : addresses),
      nextAddress,
    ];
    setAddresses(updated);
    writeLocalAddresses(demoAccount.email, updated);
    formElement.reset();
    setNotice("Delivery address saved in this browser.");
  }

  function removeAddress(addressId: string) {
    if (!demoAccount) return;
    const updated = addresses.filter((address) => address.id !== addressId);
    setAddresses(updated);
    writeLocalAddresses(demoAccount.email, updated);
  }

  async function signOut() {
    clearDemoAccount();
    setDemoAccount(null);
    await navigate({ to: "/login" });
  }

  const firstName = demoProfile.name || "there";
  const [addressFirstName = "", ...addressLastNameParts] = firstName.split(/\s+/);
  const addressLastName = addressLastNameParts.join(" ");

  return (
    <main className="account-page account-dashboard-layout">
      <section className="account-panel account-dashboard">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} /> Back to SupreCart
        </Link>
        <div className="account-brand">
          <img className="account-mark" src="/suprecart-logo.png" alt="SupreCart" />
          <span>
            SUPRECART <small>YOUR MARKETPLACE</small>
          </span>
        </div>
        <div className="account-dashboard-heading">
          <div>
            <p className="eyebrow">YOUR ACCOUNT</p>
            <h1>Good to see you, {firstName}.</h1>
            <p className="account-intro">Your SupreCart profile and activity.</p>
            {demoAccount && (
              <p className="demo-disclaimer" role="status">
                SAMPLE DATA · This account, its orders and profile edits live in this browser only.
                No real order is placed and no payment is taken.
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut size={15} /> Sign out
          </Button>
        </div>

        {loading && <p className="account-intro">Loading your account…</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!loading && (
          <>
            <div className="account-dashboard-body">
              <nav className="account-section-nav" aria-label="Account sections">
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
                      setSettingsOpen(false);
                      setError("");
                      setNotice("");
                    }}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
                <div className="account-nav-group">
                  <button
                    type="button"
                    className={section === "settings" ? "active" : ""}
                    onClick={() => {
                      setSettingsOpen((v) => !v);
                      if (section !== "settings") {
                        setSection("settings");
                        setSettingsTab("profile");
                        setError("");
                        setNotice("");
                      }
                    }}
                  >
                    <Settings size={16} /> Account settings
                  </button>
                  {settingsOpen && (
                    <div className="account-nav-submenu">
                      {settingsTabs.map(([key, label, Icon]) => (
                        <button
                          type="button"
                          key={key}
                          className={section === "settings" && settingsTab === key ? "active" : ""}
                          onClick={() => {
                            setSection("settings");
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
                  )}
                </div>
                <Link to="/messages" search={{ productId: undefined }}>
                  <MessageCircle size={16} /> Messages
                </Link>
              </nav>
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
                              ? void navigate({ to: "/sellers" })
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
                          <dd>{demoProfile.name || firstName}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{demoAccount?.email}</dd>
                        </div>
                        <div>
                          <dt>Phone</dt>
                          <dd>{demoProfile.phone || "Not added"}</dd>
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
                              <span className="account-order-status">{order.status}</span>
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
                    {orders.length ? (
                      <ul className="account-order-list">
                        {orders.map((order) => (
                          <li key={order.id}>
                            <Package size={16} />
                            <span>Order {order.id}</span>
                            <span className="account-order-status">{order.status}</span>
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
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="account-intro">
                        No orders yet. This preview keeps order history in this browser only.
                      </p>
                    )}
                  </section>
                )}
                {section === "addresses" && (
                  <>
                    <section className="account-dashboard-card">
                      <h2>Delivery addresses</h2>
                      <p className="demo-disclaimer">
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
                            defaultValue={demoAccount?.email ?? ""}
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
                            Your shop, orders and payouts live in one focused workspace. This
                            preview keeps seller changes in this browser only.
                          </p>
                        </div>
                        <Button asChild>
                          <Link to="/sellers">
                            Open seller studio <ArrowRight size={15} />
                          </Link>
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
                              defaultValue={sellerApplication?.phone ?? demoProfile.phone ?? ""}
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
                            <input
                              name="bankName"
                              defaultValue={sellerApplication?.bankName ?? ""}
                              required
                            />
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
                          Payout details are preview-only and are never sent to a bank. You can
                          update them before any real payout is connected.
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
                        <p className="demo-disclaimer">
                          Profile changes stay in this browser. Your email address identifies the
                          account and cannot be changed here.
                        </p>
                        <form className="account-form" onSubmit={saveProfile}>
                          <label>
                            Display name
                            <input name="name" defaultValue={demoProfile.name} required />
                          </label>
                          <label>
                            Phone
                            <input name="phone" type="tel" defaultValue={demoProfile.phone} />
                          </label>
                          <label>
                            Account email
                            <input value={demoAccount?.email ?? ""} disabled />
                          </label>
                          <Button type="submit">Save profile</Button>
                        </form>
                      </section>
                    )}

                    {settingsTab === "notifications" && (
                      <section className="account-dashboard-card">
                        <p className="account-intro">
                          Choose what SupreCart should tell you about. These preferences are saved
                          in this browser while messaging is still a preview.
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
                          Sample payment methods for the preview checkout. SupreCart never stores a
                          full card number and this preview collects no payments.
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
                          <p className="account-intro">No sample payment methods saved yet.</p>
                        )}
                        <form
                          className="account-form account-payment-form"
                          onSubmit={addPaymentMethod}
                        >
                          <h3>Add a sample method</h3>
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
                            <Plus size={15} /> Add sample method
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
                            <small>Changes to your password are made in the Profile tab.</small>
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
                          Two-factor authentication is a placeholder in this preview; it never
                          blocks sign-in.
                        </p>
                      </section>
                    )}

                    {settingsTab === "danger" && (
                      <section className="account-dashboard-card account-danger-zone">
                        <p className="account-intro">
                          {demoAccount
                            ? "Permanently delete this local demo account, its profile, orders, messages, seller application and saved preferences from this browser."
                            : "Closing a real SupreCart account is handled by our team. Account deletion is not connected in this preview."}
                        </p>
                        {demoAccount ? (
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
                                  <Trash2 size={15} /> Delete demo account
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
                              <Trash2 size={15} /> Delete demo account
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
      <aside className="account-aside">
        <span>
          GOOD FINDS.
          <br />
          GOOD PEOPLE.
        </span>
        <p>
          A little more considered.
          <br />A lot more to discover.
        </p>
        <div className="account-aside-note">
          Your marketplace,
          <br />
          <strong>your way.</strong>
        </div>
      </aside>
    </main>
  );
}
