import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Box,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Globe,
  Landmark,
  LogOut,
  MessageCircle,
  PackagePlus,
  Percent,
  Plus,
  ShieldCheck,
  Settings,
  Smartphone,
  Star,
  Store,
  Trash2,
  Truck,
  Upload,
  UserRound,
} from "lucide-react";
import { products as demoCatalog } from "../../src/lib/catalog";
import {
  clearDemoAccount,
  createLocalAccount,
  findDemoAccount,
  getDemoAccounts,
  isPresetAccount,
  readActiveAccount,
  saveDemoAccount,
  verifyAccountPassword,
  type DemoAccount,
} from "../../src/lib/demo-accounts";
import { getDemoProfile, saveDemoProfile } from "../../src/lib/demo-orders";
import { deleteDemoAccountData } from "../../src/lib/demo-account-cleanup";
import {
  getSellerApplication,
  submitSellerApplication as saveSellerApplication,
  subscribeSellerApplications,
  type SellerApplication as LocalSellerApplication,
} from "../../src/lib/seller-applications";
import { Analytics } from "../../src/components/Analytics";
import { CookieConsent } from "../../src/components/CookieConsent";
import { trackEvent, trackLogin, trackSignUp } from "../../src/lib/analytics";
import { calculateCommission, commissionTiers } from "../../src/lib/commission";
import {
  accountAvatar,
  accountPreferenceScope,
  createPaymentMethod,
  currencyOptions,
  defaultAccountPreferences,
  languageOptions,
  nigerianBanks,
  processingTimeOptions,
  readAccountPreferences,
  saveAccountPreferences,
  shippingOptionsCatalog,
  subscribeAccountPreferences,
  timezoneOptions,
  type AccountPreferences,
  type NotificationPreferences,
  type RegionPreferences,
} from "../../src/lib/account-preferences";
import {
  AVATAR_ACCEPT,
  AVATAR_SIZE,
  avatarErrorMessage,
  processAvatarFile,
} from "../../src/lib/avatar";
import "./seller.css";

type SellerApplication = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  product_description: string;
  status: "pending" | "approved" | "rejected";
  verified?: boolean;
};

type SellerProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  published: boolean;
  image_path: string;
  image_url?: string;
  created_at: string;
};

type Rating = { product_id: string; review_count: number; average_rating: number };

type SellerStats = {
  orders: { id: string; status: string; created_at: string }[];
  items: { quantity: number; seller_net: number; product_id: string; order_id: string }[];
  products: SellerProduct[];
  ratings: Rating[];
  committedPayouts: number;
};

type DemoFundEntry = { id: string; description: string; amount: number; date: string };

type SellerSettingsTab =
  | "account"
  | "store"
  | "fulfilment"
  | "bank"
  | "commission"
  | "notifications"
  | "region"
  | "payments"
  | "security"
  | "danger";

const sellerSettingsTabs = [
  ["account", "Account", Settings],
  ["store", "Store profile", Store],
  ["fulfilment", "Fulfilment", Truck],
  ["bank", "Payout & bank", Landmark],
  ["commission", "Commission & fees", Percent],
  ["notifications", "Notifications", Bell],
  ["region", "Region & language", Globe],
  ["payments", "Payment methods", CreditCard],
  ["security", "Security", ShieldCheck],
  ["danger", "Danger zone", AlertTriangle],
] as const;

const sellerPages = ["overview", "products", "orders", "payouts", "settings"] as const;
type SellerPage = (typeof sellerPages)[number];

function readSellerPage(): SellerPage {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return (sellerPages as readonly string[]).includes(hash) ? (hash as SellerPage) : "overview";
}

const fileTypes = ["image/jpeg", "image/png", "application/pdf"];
const productImageTypes = ["image/jpeg", "image/png", "image/webp"];
const marketplaceUrl = import.meta.env["VITE_MARKETPLACE_URL"] || "/";
const marketplaceBase = marketplaceUrl.replace(/\/$/, "");
const loginHref = `${marketplaceBase}/login`;
const buyerAccountHref = `${marketplaceBase}/account#seller`;
const cookiePolicyHref = /^https?:\/\//.test(marketplaceUrl)
  ? `${marketplaceBase}/info/cookies`
  : undefined;

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

function demoSellerStats(email: string): SellerStats {
  const sellerProducts =
    email === "shewa@gmail.com"
      ? demoCatalog.filter((product) => product.category === "Footwear").slice(0, 3)
      : email === "daniella@gmail.com"
        ? demoCatalog.filter((product) => product.category === "Beauty").slice(0, 3)
        : email === "adeniji@gmail.com"
          ? demoCatalog.filter((product) => product.category === "Clothing").slice(0, 3)
          : demoCatalog.filter((product) => product.category === "Home").slice(0, 3);
  const createdAt = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };
  const products: SellerProduct[] = sellerProducts
    .filter((product) => product !== undefined)
    .map((product, index) => ({
      id: `sample-product-${index + 1}`,
      name: product.name,
      category: product.category,
      price: product.price,
      inventory: [8, 14, 5][index] ?? 4,
      published: true,
      image_path: "",
      image_url: product.image,
      created_at: createdAt(45 - index * 9),
    }));
  const orders: SellerStats["orders"] = [
    { id: "SC-DEMO-1048", status: "delivered", created_at: createdAt(3) },
    { id: "SC-DEMO-1031", status: "processing", created_at: createdAt(1) },
    { id: "SC-DEMO-0996", status: "in_transit", created_at: createdAt(6) },
    { id: "SC-DEMO-0942", status: "delivered", created_at: createdAt(12) },
  ];
  const sellerNet = (index: number, quantity = 1) => {
    const product = products[index];
    if (!product) return 0;
    return calculateCommission(product.price).sellerNet * quantity;
  };
  const items: SellerStats["items"] = [
    {
      quantity: 1,
      seller_net: sellerNet(0),
      product_id: products[0]?.id || "",
      order_id: "SC-DEMO-1048",
    },
    {
      quantity: 2,
      seller_net: sellerNet(1, 2),
      product_id: products[1]?.id || "",
      order_id: "SC-DEMO-1031",
    },
    {
      quantity: 1,
      seller_net: sellerNet(2),
      product_id: products[2]?.id || "",
      order_id: "SC-DEMO-0996",
    },
    {
      quantity: 1,
      seller_net: sellerNet(0),
      product_id: products[0]?.id || "",
      order_id: "SC-DEMO-0942",
    },
  ];
  return {
    orders,
    items,
    products,
    ratings: products.map((product, index) => ({
      product_id: product.id,
      review_count: [18, 9, 6][index] ?? 4,
      average_rating: [4.9, 4.8, 4.7][index] ?? 4.8,
    })),
    committedPayouts: 0,
  };
}

function demoFundEntries(email: string): DemoFundEntry[] {
  const entries: Record<string, DemoFundEntry[]> = {
    "shewa@gmail.com": [
      { id: "fund-s-1", description: "Refund adjustment", amount: 12500, date: "18 Sep 2026" },
      { id: "fund-s-2", description: "Demo wallet top-up", amount: 20000, date: "12 Sep 2026" },
    ],
    "daniella@gmail.com": [
      { id: "fund-d-1", description: "Demo wallet top-up", amount: 25000, date: "16 Sep 2026" },
    ],
    "adeniji@gmail.com": [
      { id: "fund-a-1", description: "Refund adjustment", amount: 8400, date: "14 Sep 2026" },
    ],
    "bukunmi@gmail.com": [
      { id: "fund-b-1", description: "Refund adjustment", amount: 6500, date: "13 Sep 2026" },
      { id: "fund-b-2", description: "Demo wallet top-up", amount: 10000, date: "10 Sep 2026" },
    ],
  };
  return entries[email] ?? [];
}

const localSellerProductsKey = (email: string) =>
  `suprecart-seller-products:${email.toLowerCase()}`;

function readLocalSellerProducts(email: string): SellerProduct[] {
  try {
    const saved = window.localStorage.getItem(localSellerProductsKey(email));
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SellerProduct =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as SellerProduct).id === "string",
    );
  } catch (cause) {
    console.error("Could not read the local seller products.", cause);
    return [];
  }
}

function writeLocalSellerProducts(email: string, products: SellerProduct[]) {
  try {
    window.localStorage.setItem(localSellerProductsKey(email), JSON.stringify(products));
  } catch (cause) {
    console.error("Could not save the local seller products.", cause);
  }
}

export default function SellerPortal({ standalone = false }: { standalone?: boolean } = {}) {
  const [sellerApplication, setSellerApplication] = useState<LocalSellerApplication | null>(null);
  const [screen, setScreen] = useState<"login" | "apply">("apply");
  const [demoAccount, setDemoAccount] = useState<DemoAccount | null>(null);
  const [demoProfile, setDemoProfile] = useState({ name: "", phone: "" });
  const [localProducts, setLocalProducts] = useState<SellerProduct[]>([]);
  const [sellerAvatar, setSellerAvatar] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [page, setPage] = useState<SellerPage>(readSellerPage);

  useEffect(() => {
    const syncPage = () => setPage(readSellerPage());
    window.addEventListener("popstate", syncPage);
    window.addEventListener("hashchange", syncPage);
    return () => {
      window.removeEventListener("popstate", syncPage);
      window.removeEventListener("hashchange", syncPage);
    };
  }, []);

  function goToPage(next: SellerPage) {
    setPage(next);
    trackEvent("seller_page_view", { page: next });
    if (readSellerPage() !== next) {
      window.history.pushState(null, "", `#${next}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingScreen(false), 1050);
    const activeAccount = readActiveAccount();
    if (activeAccount?.role === "seller") {
      setDemoAccount(activeAccount);
      setSellerApplication(getSellerApplication(activeAccount.email));
      setDemoProfile(getDemoProfile(activeAccount.email, activeAccount.name));
      setLocalProducts(readLocalSellerProducts(activeAccount.email));
    }
    setBusy(false);
    return () => window.clearTimeout(timer);
  }, []);

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
    if (!demoAccount) {
      setSellerAvatar("");
      return;
    }
    const syncAvatar = () => setSellerAvatar(accountAvatar(demoAccount));
    syncAvatar();
    return subscribeAccountPreferences(syncAvatar);
  }, [demoAccount]);

  useEffect(() => {
    if (loadingScreen || busy || demoAccount) return;
    window.location.replace(loginHref);
  }, [busy, demoAccount, loadingScreen]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email")).trim().toLowerCase();
      const files = form
        .getAll("documents")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);
      if (files.some((file) => !fileTypes.includes(file.type) || file.size > 10 * 1024 * 1024)) {
        throw new Error("Attachments must be JPG, PNG, or PDF files under 10 MB each.");
      }
      const draft = {
        firstName: String(form.get("firstName")).trim(),
        middleName: String(form.get("middleName")).trim(),
        lastName: String(form.get("lastName")).trim(),
        email,
        description: String(form.get("description")).trim(),
        bankName: String(form.get("bankName")).trim(),
        accountNumber: String(form.get("accountNumber")).trim(),
      };
      const account = await createLocalAccount({
        email,
        name: `${draft.firstName} ${draft.lastName}`.trim(),
        role: "seller",
        password: String(form.get("password")),
      });
      saveDemoAccount(account);
      const application = saveSellerApplication({
        email,
        name: `${draft.firstName} ${draft.lastName}`.trim(),
        storeName: `${draft.firstName}'s shop`,
        phone: "",
        productDescription: draft.description,
        bankName: draft.bankName,
        bankAccountNumber: draft.accountNumber,
      });
      trackSignUp("seller_preview");
      setDemoAccount(account);
      setSellerApplication(application);
      setSubmitted(true);
      setDemoProfile(getDemoProfile(account.email, account.name));
      setLocalProducts(readLocalSellerProducts(account.email));
      setNotice("Your seller application is saved in this browser and pending review.");
    } catch (cause) {
      console.error("Could not submit the SupreCart seller application.", cause);
      setError(cause instanceof Error ? cause.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email")).trim().toLowerCase();
      const localDemoAccount = findDemoAccount(email, "seller");
      if (!localDemoAccount) {
        throw new Error("No seller account matches that email yet. Submit an application first.");
      }
      if (!isPresetAccount(email, "seller")) {
        const passwordMatches = await verifyAccountPassword(
          email,
          "seller",
          String(form.get("password")),
        );
        if (!passwordMatches) {
          throw new Error("That password does not match this account. Please try again.");
        }
      }
      saveDemoAccount(localDemoAccount);
      trackLogin("seller_preview");
      setDemoAccount(localDemoAccount);
      setSellerApplication(getSellerApplication(localDemoAccount.email));
      setDemoProfile(getDemoProfile(localDemoAccount.email, localDemoAccount.name));
      setLocalProducts(readLocalSellerProducts(localDemoAccount.email));
      setNotice("");
      setBusy(false);
    } catch (cause) {
      console.error("Could not sign in to the SupreCart seller portal.", cause);
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim().toLowerCase();
    setError("");
    setNotice(
      `Seller accounts live in this browser, so there is no password reset email for ${email}.`,
    );
  }

  async function signOut() {
    clearDemoAccount();
    setDemoAccount(null);
    setSubmitted(false);
    setSellerApplication(null);
    setLocalProducts([]);
    setScreen("login");
    window.location.assign(marketplaceBase || "/");
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!demoAccount) return;
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData(formElement);
      const image = form.get("image");
      if (!(image instanceof File) || image.size === 0) throw new Error("Choose a product image.");
      if (!productImageTypes.includes(image.type) || image.size > 10 * 1024 * 1024) {
        throw new Error("Product images must be JPG, PNG, or WebP files under 10 MB.");
      }
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that product image."));
        reader.readAsDataURL(image);
      });
      const product: SellerProduct = {
        id: crypto.randomUUID(),
        name: String(form.get("name")).trim(),
        category: String(form.get("category")).trim(),
        price: Number(form.get("price")),
        inventory: Number(form.get("inventory")),
        published: true,
        image_path: "",
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };
      const updated = [product, ...localProducts];
      setLocalProducts(updated);
      writeLocalSellerProducts(demoAccount.email, updated);
      formElement.reset();
      setNotice("Product added to your local preview listings.");
    } catch (cause) {
      console.error("Could not add the seller's product.", cause);
      setError(cause instanceof Error ? cause.message : "Could not add product.");
    } finally {
      setSubmitting(false);
    }
  }

  function requestPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Payout requests are preview-only. No money has moved.");
    event.currentTarget.reset();
  }

  function updateSellerAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!demoAccount) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const phone = String(form.get("phone")).trim();
    if (!name) {
      setError("Enter a display name before saving.");
      return;
    }
    saveDemoProfile(demoAccount.email, { name, phone });
    setDemoAccount({ ...demoAccount, name });
    setDemoProfile({ name, phone });
    setError("");
    setNotice("Your seller profile has been updated in this browser.");
  }

  const demoStats = useMemo(() => {
    if (!demoAccount) return null;
    const base = demoSellerStats(demoAccount.email);
    return { ...base, products: [...localProducts, ...base.products] };
  }, [demoAccount, localProducts]);
  const demoDeliveredItems =
    demoStats?.items.filter((item) =>
      demoStats.orders.some((order) => order.id === item.order_id && order.status === "delivered"),
    ) ?? [];
  const demoEarnings = demoDeliveredItems.reduce((sum, item) => sum + item.seller_net, 0);
  const demoSoldCount = demoDeliveredItems.reduce((sum, item) => sum + item.quantity, 0);
  const demoWalletEntries = demoAccount ? demoFundEntries(demoAccount.email) : [];
  const demoBalance =
    demoEarnings + demoWalletEntries.reduce((sum, entry) => sum + entry.amount, 0);

  if (loadingScreen) return <SellerLoadingScreen />;

  const showDashboard = Boolean(demoAccount && sellerApplication?.status === "approved");

  return (
    <main className="seller-site">
      <header className="seller-header">
        <a href={marketplaceUrl} aria-label="SupreCart home" className="seller-logo-link">
          <img src="/suprecart-logo.png" alt="SupreCart" />
        </a>
        <span className="seller-header-note">
          <Store size={15} /> SELLER STUDIO
        </span>
        <div className="seller-header-actions">
          {demoAccount ? (
            <div className="seller-account-menu">
              <button
                type="button"
                className="seller-account-trigger"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                <span className="seller-account-avatar">
                  {sellerAvatar ? (
                    <img src={sellerAvatar} alt="" />
                  ) : (
                    (demoProfile.name || demoAccount.name).trim().charAt(0).toUpperCase()
                  )}
                </span>
                <span className="seller-account-name">
                  <small>Seller account</small>
                  <strong>{demoProfile.name || demoAccount.name}</strong>
                </span>
                <ChevronDown size={15} />
              </button>
              {accountMenuOpen && (
                <div className="seller-account-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      goToPage("settings");
                    }}
                  >
                    <Settings size={15} /> Account settings
                  </button>
                  <a role="menuitem" href={marketplaceUrl}>
                    <Store size={15} /> Buyer homepage
                  </a>
                  <button type="button" role="menuitem" onClick={() => void signOut()}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a className="seller-text-button" href={loginHref}>
              Buyer sign in <ArrowRight size={15} />
            </a>
          )}
        </div>
      </header>

      <div className="seller-layout">
        <aside className="seller-sidebar">
          <a href={marketplaceUrl} className="seller-back-link">
            <ArrowLeft size={15} /> Marketplace
          </a>
          <div className="seller-sidebar-intro">
            <span className="seller-sidebar-icon">
              <Store size={20} />
            </span>
            <div>
              <strong>Seller studio</strong>
              <span>GOOD BUSINESS, GROWING.</span>
            </div>
          </div>
          <div className="seller-sidebar-caption">YOUR SPACE</div>
          <button
            type="button"
            className={`seller-side-link ${showDashboard && page === "overview" ? "active" : ""}`}
            onClick={() => goToPage("overview")}
          >
            <Box size={16} /> Overview
          </button>
          {showDashboard && (
            <>
              <button
                type="button"
                className={`seller-side-link ${page === "products" ? "active" : ""}`}
                onClick={() => goToPage("products")}
              >
                <PackagePlus size={16} /> Products
              </button>
              <button
                type="button"
                className={`seller-side-link ${page === "orders" ? "active" : ""}`}
                onClick={() => goToPage("orders")}
              >
                <Box size={16} /> Orders
              </button>
              <button
                type="button"
                className={`seller-side-link ${page === "payouts" ? "active" : ""}`}
                onClick={() => goToPage("payouts")}
              >
                <CircleDollarSign size={16} /> Payouts
              </button>
              <button
                type="button"
                className={`seller-side-link ${page === "settings" ? "active" : ""}`}
                onClick={() => goToPage("settings")}
              >
                <Settings size={16} /> Account settings
              </button>
            </>
          )}
          {demoAccount && (
            <a
              className="seller-side-link"
              href={`${marketplaceUrl.replace(/\/$/, "")}/messages?demoEmail=${encodeURIComponent(
                demoAccount.email,
              )}&demoRole=seller`}
            >
              <MessageCircle size={16} /> Messages
            </a>
          )}
          <div className="seller-sidebar-foot">
            <ShieldCheck size={16} />
            <span>Your information is protected by SupreCart.</span>
          </div>
        </aside>

        <nav className="seller-mobile-nav" aria-label="Seller sections">
          <button
            type="button"
            className={`seller-side-link ${showDashboard && page === "overview" ? "active" : ""}`}
            onClick={() => goToPage("overview")}
          >
            <Box size={16} /> Overview
          </button>
          {showDashboard && (
            <>
              <button
                type="button"
                className={`seller-side-link ${page === "products" ? "active" : ""}`}
                onClick={() => goToPage("products")}
              >
                <PackagePlus size={16} /> Products
              </button>
              <button
                type="button"
                className={`seller-side-link ${page === "orders" ? "active" : ""}`}
                onClick={() => goToPage("orders")}
              >
                <Box size={16} /> Orders
              </button>
              <button
                type="button"
                className={`seller-side-link ${page === "payouts" ? "active" : ""}`}
                onClick={() => goToPage("payouts")}
              >
                <CircleDollarSign size={16} /> Payouts
              </button>
              <button
                type="button"
                className={`seller-side-link ${page === "settings" ? "active" : ""}`}
                onClick={() => goToPage("settings")}
              >
                <Settings size={16} /> Account settings
              </button>
            </>
          )}
          {demoAccount && (
            <a
              className="seller-side-link"
              href={`${marketplaceUrl.replace(/\/$/, "")}/messages?demoEmail=${encodeURIComponent(
                demoAccount.email,
              )}&demoRole=seller`}
            >
              <MessageCircle size={16} /> Messages
            </a>
          )}
        </nav>

        <section className="seller-content" id="seller-content">
          {busy ? (
            <div className="seller-state-panel">
              <span className="seller-spinner" />
              <p>Preparing your seller space…</p>
            </div>
          ) : submitted ? (
            <div className="seller-confirmation">
              <span className="seller-confirmation-icon">
                <BadgeCheck size={29} />
              </span>
              <p className="seller-eyebrow">APPLICATION RECEIVED</p>
              <h1>Your information is under review, we will be in touch!</h1>
              <p>
                We’ll review your seller profile and email you with an update. Once approved, sign
                in here to set up your shop.
              </p>
              <button
                type="button"
                className="seller-primary-button"
                onClick={() => {
                  setSubmitted(false);
                  setScreen("login");
                }}
              >
                Go to seller sign in <ArrowRight size={16} />
              </button>
            </div>
          ) : demoAccount && sellerApplication?.status === "approved" ? (
            <SellerDashboard
              application={{
                id: demoAccount.email,
                first_name:
                  (demoProfile.name || demoAccount.name).split(/\s+/)[0] ?? demoAccount.name,
                middle_name: null,
                last_name: (demoProfile.name || demoAccount.name).split(/\s+/).slice(1).join(" "),
                email: demoAccount.email,
                product_description: sellerApplication.productDescription,
                status: "approved",
                verified: true,
              }}
              stats={demoStats}
              earnings={demoEarnings}
              balance={demoBalance}
              soldCount={demoSoldCount}
              error={error}
              notice={notice}
              submitting={submitting}
              demoMode
              demoProfile={demoProfile}
              demoFundEntries={demoWalletEntries}
              page={page}
              onNavigate={goToPage}
              onAddProduct={addProduct}
              onRequestPayout={requestPayout}
              onUpdateAccount={updateSellerAccount}
            />
          ) : !demoAccount ? (
            <SellerRedirectPanel />
          ) : !sellerApplication ? (
            <SellerApplicationRequired accountHref={buyerAccountHref} />
          ) : (
            <ApplicationStatus
              status={sellerApplication.status === "rejected" ? "rejected" : "pending"}
              name={(demoProfile.name || demoAccount.name).split(/\s+/)[0] ?? demoAccount.name}
              {...(sellerApplication.reviewNote
                ? { reviewNote: sellerApplication.reviewNote }
                : {})}
              accountHref={buyerAccountHref}
            />
          )}
          <footer className="seller-footer">
            © 2026 SupreCart <span>Built for sellers with something good to share.</span>
          </footer>
        </section>
      </div>
      {standalone && <Analytics />}
      {standalone && <CookieConsent policyHref={cookiePolicyHref} />}
    </main>
  );
}

function SellerLoadingScreen() {
  return (
    <div
      className="seller-loading-screen"
      role="status"
      aria-label="Loading SupreCart Seller Studio"
    >
      <img src="/suprecart-logo.png" alt="SupreCart" />
      <p>A good place to grow.</p>
      <span className="seller-loading-track">
        <span />
      </span>
      <small>SELLER STUDIO</small>
    </div>
  );
}

function ApplicationForm({
  submitting,
  error,
  notice,
  onSubmit,
  onLogin,
}: {
  submitting: boolean;
  error: string;
  notice: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLogin: () => void;
}) {
  return (
    <div className="seller-form-page">
      <div className="seller-hero-label">
        <span /> OPEN TO INDEPENDENT SELLERS
      </div>
      <p className="seller-eyebrow">MAKE GOOD THINGS. FIND YOUR PEOPLE.</p>
      <h1>
        Bring your shop
        <br />
        <span>to SupreCart.</span>
      </h1>
      <p className="seller-lead">
        Grow your business with a marketplace that makes room for independent sellers and the things
        they create.
      </p>
      <div className="seller-form-card">
        <div className="seller-form-heading">
          <div>
            <p className="seller-eyebrow">SELLER APPLICATION</p>
            <h2>Tell us about yourself</h2>
          </div>
          <span className="seller-step-pill">
            01 <i /> 01
          </span>
        </div>
        <form className="seller-form-grid" onSubmit={onSubmit}>
          <label>
            First name
            <input name="firstName" autoComplete="given-name" required />
          </label>
          <label>
            Middle name <span className="seller-optional">(optional)</span>
            <input name="middleName" autoComplete="additional-name" />
          </label>
          <label>
            Last name
            <input name="lastName" autoComplete="family-name" required />
          </label>
          <label>
            Email address
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label className="seller-field-full">
            Create a password
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
            <small>
              At least 10 characters. Stored in this browser so you can sign in again later.
            </small>
          </label>
          <label className="seller-field-full">
            What do you make or sell?
            <textarea
              name="description"
              rows={4}
              minLength={30}
              placeholder="Tell us about your shop, your products, and what makes them special…"
              required
            />
          </label>
          <label>
            Bank name
            <select name="bankName" autoComplete="off" required defaultValue="">
              <option value="" disabled>
                Select your bank…
              </option>
              {nigerianBanks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bank account number
            <input
              name="accountNumber"
              inputMode="numeric"
              pattern="[0-9]{10}"
              minLength={10}
              maxLength={10}
              autoComplete="off"
              aria-describedby="seller-bank-help"
              required
            />
            <small id="seller-bank-help">
              10-digit account number. Visible only to you and authorized SupreCart staff.
            </small>
          </label>
          <label className="seller-field-full">
            Product / business attachments <span className="seller-optional">(optional)</span>
            <span className="seller-upload-box">
              <Upload size={20} />
              <strong>Choose files to upload</strong>
              <small>JPG, PNG or PDF · max 10 MB each</small>
              <input type="file" name="documents" accept=".jpg,.jpeg,.png,.pdf" multiple />
            </span>
          </label>
          {error && (
            <p className="seller-form-error seller-field-full" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="seller-form-notice seller-field-full" role="status">
              {notice}
            </p>
          )}
          <button
            className="seller-primary-button seller-field-full"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Submitting securely…" : "Submit application"} <ArrowRight size={16} />
          </button>
        </form>
        <p className="seller-consent">
          <ShieldCheck size={14} /> By applying, you agree to SupreCart reviewing your details and
          contacting you about your application.
        </p>
      </div>
      <button className="seller-switch-link" type="button" onClick={onLogin}>
        Already have a seller account? Sign in <ArrowRight size={14} />
      </button>
    </div>
  );
}

function SignInPanel({
  submitting,
  error,
  notice,
  onSubmit,
  onReset,
  onApply,
}: {
  submitting: boolean;
  error: string;
  notice: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: (event: FormEvent<HTMLFormElement>) => void;
  onApply: () => void;
}) {
  return (
    <div className="seller-auth-page">
      <div className="seller-form-card seller-auth-card">
        <span className="seller-auth-icon">
          <Store size={21} />
        </span>
        <p className="seller-eyebrow">WELCOME BACK</p>
        <h1>Your shop, your way.</h1>
        <p className="seller-lead">
          Sign in to check orders, add new products and keep your business moving.
        </p>
        <form className="seller-form-grid" onSubmit={onSubmit}>
          <label className="seller-field-full">
            Email address
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="seller-field-full">
            Password
            <input name="password" type="password" autoComplete="current-password" />
            <small>
              Preview seller accounts can sign in without a password. Accounts you create here use
              the password you chose.
            </small>
          </label>
          {error && (
            <p className="seller-form-error seller-field-full" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="seller-form-notice seller-field-full" role="status">
              {notice}
            </p>
          )}
          <button
            className="seller-primary-button seller-field-full"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"} <ArrowRight size={16} />
          </button>
        </form>
        <p className="seller-form-notice">
          Preview seller accounts (no password or email verification):
          {getDemoAccounts("seller").map((account) => (
            <span key={account.email}>
              <br />
              {account.name} - {account.email}
            </span>
          ))}
        </p>
        <form className="seller-reset-form" onSubmit={onReset}>
          <label>
            Email
            <input name="email" type="email" placeholder="For password reset" required />
          </label>
          <button type="submit">Send reset link</button>
        </form>
        <button type="button" className="seller-switch-link" onClick={onApply}>
          New to SupreCart? Apply to sell <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function ApplicationStatus({
  status,
  name,
  reviewNote,
  accountHref,
}: {
  status: "pending" | "rejected";
  name: string;
  reviewNote?: string;
  accountHref?: string;
}) {
  return (
    <div className="seller-status-page">
      <span className="seller-status-icon">
        {status === "pending" ? <Clock3 size={26} /> : <ShieldCheck size={26} />}
      </span>
      <p className="seller-eyebrow">SELLER APPLICATION</p>
      <h1>
        {status === "pending"
          ? `Thanks, ${name}. We’re reviewing your shop.`
          : "We’re unable to approve your application yet."}
      </h1>
      <p>
        {status === "pending"
          ? "Approvals are reviewed by hand. Your buyer account shows the latest status, and the studio unlocks here once you are approved."
          : reviewNote ||
            "Your buyer account has the latest review details. You can update your application and submit it again from there."}
      </p>
      <span className={`seller-status-badge ${status}`}>
        {status === "pending" ? "UNDER REVIEW" : "REVIEW COMPLETE"}
      </span>
      {accountHref && (
        <a className="seller-primary-button" href={accountHref}>
          {status === "pending" ? "View your application" : "Update your application"}{" "}
          <ArrowRight size={16} />
        </a>
      )}
    </div>
  );
}

function SellerApplicationRequired({ accountHref }: { accountHref: string }) {
  return (
    <div className="seller-status-page">
      <span className="seller-status-icon">
        <Store size={26} />
      </span>
      <p className="seller-eyebrow">ONE ACCOUNT, TWO SIDES</p>
      <h1>Your seller story starts in your buyer account.</h1>
      <p>
        Apply to sell from your SupreCart dashboard. Once approved, this studio opens with your
        products, orders and payouts.
      </p>
      <a className="seller-primary-button" href={accountHref}>
        Go to your seller application <ArrowRight size={16} />
      </a>
    </div>
  );
}

function SellerRedirectPanel() {
  return (
    <div className="seller-state-panel" role="status">
      <span className="seller-spinner" />
      <p>Taking you to sign in…</p>
    </div>
  );
}

function SellerDashboard({
  application,
  stats,
  earnings,
  balance,
  soldCount,
  error,
  notice,
  submitting,
  demoMode = false,
  demoProfile,
  demoFundEntries = [],
  page,
  onNavigate,
  onAddProduct,
  onRequestPayout,
  onUpdateAccount,
}: {
  application: SellerApplication;
  stats: SellerStats | null;
  earnings: number;
  balance: number;
  soldCount: number;
  error: string;
  notice: string;
  submitting: boolean;
  demoMode?: boolean;
  demoProfile?: { name: string; phone: string };
  demoFundEntries?: DemoFundEntry[];
  page: SellerPage;
  onNavigate: (page: SellerPage) => void;
  onAddProduct: (event: FormEvent<HTMLFormElement>) => void;
  onRequestPayout: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateAccount: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SellerSettingsTab>("account");
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultAccountPreferences);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [productPrice, setProductPrice] = useState("");
  const preferencesKey = accountPreferenceScope("seller", application.email);

  useEffect(() => {
    setPreferences(readAccountPreferences(preferencesKey));
  }, [preferencesKey]);

  function updatePreferences(next: AccountPreferences) {
    setPreferences(next);
    saveAccountPreferences(preferencesKey, next);
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

  function toggleShippingOption(option: string) {
    const current = preferences.fulfilment.shippingOptions;
    updatePreferences({
      ...preferences,
      fulfilment: {
        ...preferences.fulfilment,
        shippingOptions: current.includes(option)
          ? current.filter((entry) => entry !== option)
          : [...current, option],
      },
    });
  }

  function saveStoreProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updatePreferences({
      ...preferences,
      store: {
        ...preferences.store,
        storeName: String(form.get("storeName")).trim(),
        tagline: String(form.get("tagline")).trim(),
        description: String(form.get("description")).trim(),
      },
    });
    setSettingsError("");
    setSettingsNotice(
      "Store profile saved in this browser. It is not yet published to the marketplace.",
    );
  }

  function onStoreLogo(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setSettingsError("Choose a JPG, PNG, or WebP logo under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updatePreferences({
        ...preferences,
        store: { ...preferences.store, logoDataUrl: String(reader.result) },
      });
      setSettingsError("");
      setSettingsNotice("Store logo preview saved in this browser only.");
    };
    reader.readAsDataURL(file);
  }

  async function onAvatarFile(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const result = await processAvatarFile(file);
    input.value = "";
    if (!result.ok) {
      setSettingsError(avatarErrorMessage(result.code));
      setSettingsNotice("");
      return;
    }
    updatePreferences({ ...preferences, avatarDataUrl: result.dataUrl });
    setSettingsError("");
    setSettingsNotice(
      `Profile photo updated. This ${AVATAR_SIZE}×${AVATAR_SIZE} preview image is kept in this browser until object storage is connected.`,
    );
  }

  function removeAvatar() {
    updatePreferences({ ...preferences, avatarDataUrl: "" });
    setSettingsNotice("Profile photo removed from this browser.");
  }

  function saveBankDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const accountNumber = String(form.get("accountNumber")).trim();
    if (!/^\d{10}$/.test(accountNumber)) {
      setSettingsError("Enter a valid 10-digit account number.");
      return;
    }
    updatePreferences({
      ...preferences,
      bank: { bankName: String(form.get("bankName")).trim(), accountNumber },
    });
    setSettingsError("");
    setSettingsNotice(
      "Bank details saved as a request in this browser. SupreCart support confirms real payout changes before any transfer.",
    );
  }

  function addPaymentMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const last4 = String(form.get("last4")).replace(/\D/g, "");
    const expiry = String(form.get("expiry")).trim();
    if (last4.length < 4 || !/^\d{2}\/\d{2}$/.test(expiry)) {
      setSettingsError("Enter the last 4 digits and an expiry in MM/YY format.");
      return;
    }
    const method = createPaymentMethod({
      brand: String(form.get("brand")),
      last4,
      expiry,
    });
    method.isDefault = preferences.paymentMethods.length === 0;
    updatePreferences({ ...preferences, paymentMethods: [...preferences.paymentMethods, method] });
    formElement.reset();
    setSettingsError("");
    setSettingsNotice("Sample payout method saved in this browser. No real account is stored.");
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

  async function signOutOtherSessions() {
    setSettingsNotice(
      "Seller accounts are browser-only, so there are no other sessions to sign out.",
    );
  }

  function removeSellerAccount() {
    setConfirmDelete(false);
    if (demoMode) {
      deleteDemoAccountData(application.email);
      window.location.assign(marketplaceBase || "/");
      return;
    }
    setSettingsNotice(
      "Store closure is handled by SupreCart support and is not connected in this preview. Nothing was deleted.",
    );
  }

  const ratings = stats?.ratings ?? [];
  const average = ratings.length
    ? ratings.reduce((sum, rating) => sum + Number(rating.average_rating), 0) / ratings.length
    : 0;
  const heldStatuses = ["paid", "shipped", "processing", "in_transit"];
  const heldFunds = (stats?.items ?? [])
    .filter((item) =>
      (stats?.orders ?? []).some(
        (order) => order.id === item.order_id && heldStatuses.includes(order.status),
      ),
    )
    .reduce((sum, item) => sum + Number(item.seller_net), 0);
  const enabledNotifications = Object.values(preferences.notifications).filter(Boolean).length;
  return (
    <div className="seller-dashboard">
      <div className="seller-dashboard-topline">
        <p className="seller-eyebrow">{demoMode ? "LOCAL DEMO DASHBOARD" : "YOUR SELLER STUDIO"}</p>
        <span
          className={`seller-approved ${!demoMode && !application.verified ? "seller-approved-pending" : ""}`}
        >
          <BadgeCheck size={14} />{" "}
          {demoMode
            ? "DEMO ACCOUNT"
            : application.verified
              ? "VERIFIED SELLER"
              : "VERIFICATION PENDING"}
        </span>
      </div>
      {demoMode && (
        <p className="seller-form-notice" role="status">
          DEMO FIXTURES · These example orders, ratings, and NGN figures are fictional and local to
          this preview. No purchases, payouts, or backend records exist.
        </p>
      )}
      {error && (
        <p className="seller-form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="seller-form-notice" role="status">
          {notice}
        </p>
      )}
      {page === "overview" && (
        <>
          <div className="seller-dashboard-heading">
            <div className="seller-dashboard-greeting">
              <span className="seller-avatar seller-avatar-sm">
                {preferences.avatarDataUrl ? (
                  <img src={preferences.avatarDataUrl} alt="" />
                ) : (
                  <UserRound size={22} />
                )}
              </span>
              <div>
                <h1>Good to see you, {application.first_name}.</h1>
                <p>
                  {demoMode
                    ? "Demo metrics only — real seller data is not loaded."
                    : "Here’s how your shop is doing today."}
                </p>
              </div>
            </div>
            {!demoMode && (
              <div className="seller-dashboard-actions">
                <button
                  className="seller-outline-button"
                  type="button"
                  onClick={() => {
                    setPayoutFormOpen(true);
                    onNavigate("payouts");
                  }}
                >
                  <ArrowDownToLine size={16} /> Withdraw
                </button>
                <button
                  className="seller-primary-button"
                  type="button"
                  onClick={() => {
                    setProductFormOpen(true);
                    onNavigate("products");
                  }}
                >
                  <PackagePlus size={16} /> Add a product
                </button>
              </div>
            )}
          </div>
          <div className="seller-metric-grid">
            <article className="seller-metric-card seller-metric-balance">
              <span>{demoMode ? "AVAILABLE FUNDS" : "AVAILABLE TO REQUEST"}</span>
              <strong>{formatMoney(balance)}</strong>
              <small>For orders marked delivered</small>
              <CircleDollarSign size={20} />
            </article>
            <article className="seller-metric-card seller-metric-held">
              <span>HELD BY SUPRECART</span>
              <strong>{formatMoney(heldFunds)}</strong>
              <small>In escrow until the order is delivered</small>
              <ShieldCheck size={19} />
            </article>
            <article className="seller-metric-card">
              <span>{demoMode ? "NET EARNINGS" : "TOTAL EARNED"}</span>
              <strong>{formatMoney(earnings)}</strong>
              <small>Your net from delivered orders</small>
              <ArrowDownToLine size={19} />
            </article>
            <article className="seller-metric-card">
              <span>ITEMS SOLD</span>
              <strong>{soldCount}</strong>
              <small>Across fulfilled orders</small>
              <Box size={19} />
            </article>
            <article className="seller-metric-card">
              <span>SHOP RATING</span>
              <strong>
                {average ? average.toFixed(1) : "—"}{" "}
                <i>
                  <Star size={16} fill="currentColor" />
                </i>
              </strong>
              <small>
                {ratings.reduce((sum, rating) => sum + rating.review_count, 0)} verified reviews
              </small>
              <BadgeCheck size={19} />
            </article>
          </div>
        </>
      )}
      {page === "products" && (
        <section className="seller-dashboard-section" id="seller-products">
          <div className="seller-section-heading">
            <div>
              <p className="seller-eyebrow">YOUR CATALOGUE</p>
              <h2>Products</h2>
            </div>
            {!demoMode && (
              <button
                type="button"
                className="seller-outline-button"
                onClick={() => setProductFormOpen((open) => !open)}
              >
                <PackagePlus size={15} /> Add product
              </button>
            )}
          </div>
          {productFormOpen && !demoMode && (
            <form
              className="seller-product-form"
              onSubmit={(event) => {
                onAddProduct(event);
                setProductPrice("");
              }}
            >
              <label>
                Product name
                <input name="name" maxLength={120} required />
              </label>
              <label>
                Category
                <input
                  name="category"
                  maxLength={50}
                  placeholder="Fashion, home, beauty…"
                  required
                />
              </label>
              <label>
                Price (NGN)
                <input
                  name="price"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  onChange={(event) => setProductPrice(event.target.value)}
                />
              </label>
              <label>
                Available quantity
                <input name="inventory" type="number" min="0" step="1" defaultValue="1" required />
              </label>
              <label className="seller-field-full">
                Product description
                <textarea name="description" rows={3} maxLength={4000} required />
              </label>
              <label className="seller-field-full">
                Product image
                <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp" required />
              </label>
              {Number(productPrice) > 0 && (
                <p className="seller-fee-preview seller-field-full" role="status">
                  SupreCart commission{" "}
                  <strong>
                    {formatMoney(calculateCommission(Number(productPrice)).commission)}
                  </strong>{" "}
                  · you receive{" "}
                  <strong>
                    {formatMoney(calculateCommission(Number(productPrice)).sellerNet)}
                  </strong>{" "}
                  per item ({calculateCommission(Number(productPrice)).tier.summary}).
                </p>
              )}
              <button
                className="seller-primary-button seller-field-full"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving product�?�" : "Publish product"} <ArrowRight size={15} />
              </button>
            </form>
          )}
          <div className="seller-product-table">
            {(stats?.products ?? []).length ? (
              (stats?.products ?? []).map((product) => {
                const rating = ratings.find((item) => item.product_id === product.id);
                const fee = calculateCommission(Number(product.price));
                const image = product.image_url ?? "";
                return (
                  <article className="seller-product-row" key={product.id}>
                    <img src={image} alt="" />
                    <div className="seller-product-name">
                      <strong>{product.name}</strong>
                      <span>{product.category}</span>
                      <small className="seller-product-net">
                        Net {formatMoney(fee.sellerNet)} · fee {formatMoney(fee.commission)}
                      </small>
                    </div>
                    <span>{formatMoney(Number(product.price))}</span>
                    <span>{product.inventory} in stock</span>
                    <span className="seller-product-rating">
                      <Star size={13} fill="currentColor" />{" "}
                      {rating ? Number(rating.average_rating).toFixed(1) : "New"}
                    </span>
                    <span
                      className={`seller-product-state ${product.published ? "published" : ""}`}
                    >
                      {product.published ? "LIVE" : "HIDDEN"}
                    </span>
                  </article>
                );
              })
            ) : (
              <div className="seller-empty-products">
                <PackagePlus size={21} />
                <strong>{demoMode ? "No demo products" : "Your first product is waiting."}</strong>
                <span>
                  {demoMode
                    ? "This test account has no saved catalogue."
                    : "Add a product to start building your storefront."}
                </span>
                {!demoMode && (
                  <button
                    type="button"
                    className="seller-switch-link"
                    onClick={() => setProductFormOpen(true)}
                  >
                    Add your first product <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}
      {page === "orders" && (
        <section className="seller-dashboard-section" id="seller-orders">
          <div className="seller-section-heading">
            <div>
              <p className="seller-eyebrow">FULFILMENT</p>
              <h2>Orders</h2>
            </div>
            <span className="seller-payout-balance">{stats?.orders.length ?? 0} orders</span>
          </div>
          {(stats?.orders ?? []).length ? (
            <div className="seller-order-list">
              {(stats?.orders ?? []).map((order) => {
                const orderItem = stats?.items.find((item) => item.order_id === order.id);
                const product = stats?.products.find((item) => item.id === orderItem?.product_id);
                return (
                  <article key={order.id}>
                    <PackagePlus size={17} />
                    <strong>Order {demoMode ? order.id : order.id.slice(0, 8)}</strong>
                    <span className={`seller-order-status status-${order.status}`}>
                      {order.status.replaceAll("_", " ")}
                    </span>
                    <time dateTime={order.created_at}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </time>
                    {orderItem && product && (
                      <span className="seller-order-detail">
                        {product.name} · {orderItem.quantity}{" "}
                        {orderItem.quantity === 1 ? "item" : "items"} ·{" "}
                        {formatMoney(Number(orderItem.seller_net))}
                        {demoMode ? " demo net" : " seller net"}
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="seller-settings-note">
              {demoMode
                ? "Demo sellers have no real orders connected."
                : "Orders containing your products will appear here after a buyer places an order."}
            </p>
          )}
        </section>
      )}
      {page === "payouts" && (
        <section className="seller-dashboard-section seller-finance-section" id="seller-payouts">
          <div className="seller-section-heading">
            <div>
              <p className="seller-eyebrow">YOUR EARNINGS</p>
              <h2>Withdrawals</h2>
            </div>
            <span className="seller-payout-balance">{formatMoney(balance)} available</span>
          </div>
          <div className="seller-payout-panel">
            <div>
              <CircleDollarSign size={23} />
              <strong>Withdraw your available balance</strong>
              <span>
                Delivered-order earnings, less applicable fees. Withdrawals are reviewed before any
                payment is made.
              </span>
            </div>
            {!demoMode && (
              <button
                type="button"
                className="seller-primary-button"
                onClick={() => setPayoutFormOpen((open) => !open)}
                disabled={balance <= 0}
              >
                <ArrowDownToLine size={15} /> Withdraw funds
              </button>
            )}
          </div>
          {payoutFormOpen && !demoMode && (
            <form className="seller-payout-form" onSubmit={onRequestPayout}>
              <label>
                Amount (NGN)
                <input name="amount" type="number" min="1" max={balance} step="0.01" required />
              </label>
              <button className="seller-primary-button" type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit payout request"}
              </button>
            </form>
          )}
          <p className="seller-finance-note">
            <ShieldCheck size={14} />
            {demoMode
              ? "Demo balances are not real and cannot be withdrawn."
              : "A payout request does not transfer funds. SupreCart reviews requests and pays to your verified bank account."}
          </p>
          <p className="seller-finance-note">
            <Percent size={14} />
            SupreCart commission: below ₦1,500 → 7.5%; ₦1,500–₦5,000 → ₦150 + 7.5%; above ₦5,000 →
            11% of the selling price. See Commission &amp; fees for a full breakdown.
          </p>
          <p className="seller-finance-note">
            <Clock3 size={14} />
            {formatMoney(heldFunds)} is held by SupreCart until those orders are delivered. If a
            sale does not complete, the held amount is never credited to your available balance.
          </p>
          {demoMode && demoFundEntries.length > 0 && (
            <div className="seller-fund-ledger">
              <h3>Demo balance activity</h3>
              <p>Fictional refund adjustments and top-ups included in the preview balance.</p>
              {demoFundEntries.map((entry) => (
                <div className="seller-fund-ledger-row" key={entry.id}>
                  <span>
                    <strong>{entry.description}</strong>
                    <small>{entry.date}</small>
                  </span>
                  <b>+{formatMoney(entry.amount)}</b>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {page === "settings" && (
        <section className="seller-dashboard-section" id="seller-settings">
          <div className="seller-section-heading">
            <div>
              <p className="seller-eyebrow">PROFILE & SECURITY</p>
              <h2>Account settings</h2>
            </div>
          </div>
          <nav className="seller-settings-tabs" aria-label="Account settings sections">
            {sellerSettingsTabs.map(([key, label, Icon]) => (
              <button
                type="button"
                key={key}
                className={settingsTab === key ? "active" : ""}
                onClick={() => {
                  setSettingsTab(key);
                  setSettingsError("");
                  setSettingsNotice("");
                  setConfirmDelete(false);
                }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>
          {settingsNotice && (
            <p className="seller-form-notice" role="status">
              {settingsNotice}
            </p>
          )}
          {settingsError && (
            <p className="seller-form-error" role="alert">
              {settingsError}
            </p>
          )}

          {settingsTab === "account" && (
            <div className="seller-settings-card">
              <div>
                <strong>{demoMode ? "Local demo seller" : application.email}</strong>
                <span>
                  {demoMode
                    ? "This seller account is stored in this browser only."
                    : `${application.first_name} ${application.last_name} · ${application.status} application`}
                </span>
              </div>
              <div className="seller-profile-header">
                <span className="seller-avatar">
                  {preferences.avatarDataUrl ? (
                    <img src={preferences.avatarDataUrl} alt="Your profile photo" />
                  ) : (
                    <UserRound size={26} />
                  )}
                </span>
                <div className="seller-avatar-actions">
                  <strong>Profile photo</strong>
                  <span>
                    JPG, PNG, or WebP · square {AVATAR_SIZE}×{AVATAR_SIZE}px · 2 MB max. Shown next
                    to your store once object storage is connected; this preview keeps it in your
                    browser.
                  </span>
                  <div className="seller-avatar-buttons">
                    <label className="seller-outline-button">
                      <Upload size={14} />{" "}
                      {preferences.avatarDataUrl ? "Change photo" : "Add photo"}
                      <input type="file" accept={AVATAR_ACCEPT} onChange={onAvatarFile} hidden />
                    </label>
                    {preferences.avatarDataUrl && (
                      <button type="button" className="seller-text-button" onClick={removeAvatar}>
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {!demoMode && (
                <div className={`seller-verify-banner ${application.verified ? "verified" : ""}`}>
                  <BadgeCheck size={17} />
                  <div>
                    <strong>
                      {application.verified ? "Verified seller" : "Verification pending"}
                    </strong>
                    <span>
                      {application.verified
                        ? "SupreCart has confirmed your store details."
                        : "SupreCart reviews stores before granting the verified badge. You can keep selling in the meantime."}
                    </span>
                  </div>
                </div>
              )}
              {demoMode ? (
                <form className="seller-settings-form" onSubmit={onUpdateAccount}>
                  <p className="seller-settings-note">
                    Demo profile changes are saved only in this browser. Email and password remain
                    demo-only and cannot be changed here.
                  </p>
                  <label>
                    Display name
                    <input
                      name="name"
                      defaultValue={demoProfile?.name || application.first_name}
                      required
                    />
                  </label>
                  <label>
                    Contact phone
                    <input name="phone" type="tel" defaultValue={demoProfile?.phone ?? ""} />
                  </label>
                  <label>
                    Demo email
                    <input type="email" value={application.email} disabled />
                  </label>
                  <button className="seller-primary-button" type="submit">
                    Save demo profile
                  </button>
                </form>
              ) : (
                <form className="seller-settings-form" onSubmit={onUpdateAccount}>
                  <label>
                    Email address
                    <input
                      type="email"
                      name="email"
                      defaultValue={application.email}
                      autoComplete="email"
                      placeholder="Leave unchanged to keep current email"
                    />
                    <small>Email updates require confirmation from the new address.</small>
                  </label>
                  <label>
                    New password
                    <input
                      type="password"
                      name="password"
                      minLength={10}
                      autoComplete="new-password"
                      placeholder="At least 10 characters"
                    />
                  </label>
                  {error && (
                    <p className="seller-form-error" role="alert">
                      {error}
                    </p>
                  )}
                  {notice && (
                    <p className="seller-form-notice" role="status">
                      {notice}
                    </p>
                  )}
                  <button className="seller-primary-button" type="submit" disabled={submitting}>
                    {submitting ? "Saving settings…" : "Save account settings"}
                  </button>
                </form>
              )}
            </div>
          )}

          {settingsTab === "store" && (
            <div className="seller-settings-card">
              <div>
                <strong>Store profile</strong>
                <span>How your shop is presented to buyers on SupreCart.</span>
              </div>
              <form className="seller-settings-form" onSubmit={saveStoreProfile}>
                <label>
                  Store name
                  <input
                    name="storeName"
                    defaultValue={preferences.store.storeName || application.first_name}
                    maxLength={80}
                    placeholder="e.g. Shewa Home Studio"
                  />
                </label>
                <label>
                  Tagline
                  <input
                    name="tagline"
                    defaultValue={preferences.store.tagline}
                    maxLength={120}
                    placeholder="A short line about your shop"
                  />
                </label>
                <label>
                  Store description
                  <textarea
                    name="description"
                    rows={4}
                    maxLength={600}
                    defaultValue={preferences.store.description}
                    placeholder="Tell buyers what you make and what makes it special…"
                  />
                </label>
                <label>
                  Store logo
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onStoreLogo} />
                  <small>JPG, PNG, or WebP · max 2 MB · preview only.</small>
                </label>
                {preferences.store.logoDataUrl && (
                  <div className="seller-store-logo">
                    <img src={preferences.store.logoDataUrl} alt="Store logo preview" />
                    <span>Logo preview (saved in this browser)</span>
                  </div>
                )}
                <p className="seller-settings-note">
                  Saving here keeps your storefront details in this browser. Publishing to the
                  public marketplace is not connected yet.
                </p>
                <button className="seller-primary-button" type="submit">
                  Save store profile
                </button>
              </form>
            </div>
          )}

          {settingsTab === "fulfilment" && (
            <div className="seller-settings-card">
              <div>
                <strong>Fulfilment preferences</strong>
                <span>Defaults for how you process and ship orders.</span>
              </div>
              <div className="seller-settings-form">
                <label>
                  Typical processing time
                  <select
                    value={preferences.fulfilment.processingTime}
                    onChange={(event) =>
                      updatePreferences({
                        ...preferences,
                        fulfilment: {
                          ...preferences.fulfilment,
                          processingTime: event.target.value,
                        },
                      })
                    }
                  >
                    {processingTimeOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <fieldset className="seller-shipping-options">
                  <legend>Shipping options you offer</legend>
                  <span className="seller-shipping-hint">
                    Select every method you can support. Buyers see your choices at checkout.
                  </span>
                  <div className="seller-shipping-grid">
                    {shippingOptionsCatalog.map((option) => {
                      const enabled = preferences.fulfilment.shippingOptions.includes(option.label);
                      return (
                        <label
                          key={option.id}
                          className={`seller-shipping-card ${enabled ? "enabled" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleShippingOption(option.label)}
                          />
                          <span>
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <span className="seller-shipping-count">
                    {preferences.fulfilment.shippingOptions.length} of{" "}
                    {shippingOptionsCatalog.length} selected
                  </span>
                </fieldset>
                <label>
                  Opening / support hours
                  <input
                    defaultValue={preferences.fulfilment.openingHours}
                    placeholder="e.g. Mon–Fri, 9am–5pm"
                    onBlur={(event) =>
                      updatePreferences({
                        ...preferences,
                        fulfilment: {
                          ...preferences.fulfilment,
                          openingHours: event.target.value.trim(),
                        },
                      })
                    }
                  />
                </label>
                <p className="seller-settings-note">
                  These preferences are saved in this browser and are not yet applied to checkout.
                </p>
              </div>
            </div>
          )}

          {settingsTab === "bank" && (
            <div className="seller-settings-card">
              <div>
                <strong>Payout &amp; bank details</strong>
                <span>
                  {demoMode
                    ? "Demo sellers have no real payout account."
                    : "Where SupreCart would pay approved withdrawals."}
                </span>
              </div>
              <form className="seller-settings-form" onSubmit={saveBankDetails}>
                <label>
                  Bank name
                  <select name="bankName" defaultValue={preferences.bank.bankName} required>
                    <option value="" disabled>
                      Select your bank…
                    </option>
                    {preferences.bank.bankName &&
                      !nigerianBanks.includes(preferences.bank.bankName) && (
                        <option value={preferences.bank.bankName}>
                          {preferences.bank.bankName} (saved)
                        </option>
                      )}
                    {nigerianBanks.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                  <small>Nigerian banks, licensed microfinance banks, and payment providers.</small>
                </label>
                <label>
                  Account number
                  <input
                    name="accountNumber"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    defaultValue={preferences.bank.accountNumber}
                  />
                  <small>10 digits. Never shared publicly.</small>
                </label>
                <p className="seller-settings-note">
                  Changing payout details is a request only in this preview. SupreCart support
                  verifies bank changes before any real transfer.
                </p>
                <button className="seller-primary-button" type="submit">
                  Save payout details
                </button>
              </form>
            </div>
          )}

          {settingsTab === "commission" && (
            <div className="seller-settings-card">
              <div>
                <strong>SupreCart commission &amp; fees</strong>
                <span>What SupreCart deducts from each delivered sale.</span>
              </div>
              <p className="seller-settings-note">
                Commission is charged on the selling price when an order is delivered. There is no
                listing or subscription fee in this preview.
              </p>
              <div className="seller-commission-tiers">
                {commissionTiers.map((tier) => (
                  <article className="seller-commission-tier" key={tier.id}>
                    <strong>{tier.range}</strong>
                    <span>{tier.summary}</span>
                  </article>
                ))}
              </div>
              <CommissionEstimator />
            </div>
          )}

          {settingsTab === "notifications" && (
            <div className="seller-settings-card">
              <div>
                <strong>Notifications</strong>
                <span>Choose what SupreCart tells you about.</span>
              </div>
              {(
                [
                  [
                    "Orders & account",
                    [
                      ["orderUpdates", "New orders", "When a buyer orders one of your products"],
                      ["securityAlerts", "Security alerts", "Sign-ins and account changes"],
                    ],
                  ],
                  [
                    "News & marketing",
                    [
                      [
                        "promotions",
                        "Tips & promotions",
                        "Seller features and marketplace campaigns",
                      ],
                      ["newsletter", "Newsletter", "Occasional seller news"],
                    ],
                  ],
                ] as const
              ).map(([group, rows]) => (
                <div className="seller-notification-group" key={group}>
                  <h3>{group}</h3>
                  <div className="seller-toggle-list">
                    {rows.map(([key, title, text]) => (
                      <label key={key} className="seller-toggle-row">
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
                </div>
              ))}
              <p className="seller-settings-note">
                Messaging is not connected yet. {enabledNotifications} of 4 alerts are on and
                remembered in this browser.
              </p>
            </div>
          )}

          {settingsTab === "region" && (
            <div className="seller-settings-card">
              <div>
                <strong>Region &amp; language</strong>
                <span>How prices and dates appear in your studio.</span>
              </div>
              <div className="seller-settings-form">
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
                <p className="seller-settings-note">
                  Currency conversion and translations are not connected yet.
                </p>
              </div>
            </div>
          )}

          {settingsTab === "payments" && (
            <div className="seller-settings-card">
              <div>
                <strong>Payment methods</strong>
                <span>Sample payout methods for this preview. No real account is stored.</span>
              </div>
              {preferences.paymentMethods.length ? (
                <div className="seller-payment-list">
                  {preferences.paymentMethods.map((method) => (
                    <article key={method.id} className="seller-payment-card">
                      <span className="seller-payment-brand">
                        <CreditCard size={16} />
                        <strong>{method.brand}</strong>
                      </span>
                      <span>•••• {method.last4}</span>
                      <span>Expires {method.expiry}</span>
                      {method.isDefault ? (
                        <span className="seller-payment-default">
                          <Check size={12} /> Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="seller-inline-link"
                          onClick={() => setDefaultPaymentMethod(method.id)}
                        >
                          Make default
                        </button>
                      )}
                      <button
                        type="button"
                        className="seller-danger-link"
                        onClick={() => removePaymentMethod(method.id)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="seller-settings-note">No sample payout methods saved yet.</p>
              )}
              <form className="seller-settings-form" onSubmit={addPaymentMethod}>
                <div className="seller-field-pair">
                  <label>
                    Brand
                    <select name="brand" defaultValue="Visa">
                      {["Visa", "Mastercard", "Verve", "Bank transfer"].map((brand) => (
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
                <button className="seller-primary-button" type="submit">
                  <Plus size={15} /> Add sample method
                </button>
              </form>
            </div>
          )}

          {settingsTab === "security" && (
            <div className="seller-settings-card">
              <div>
                <strong>Security</strong>
                <span>Keep your seller account and store safe.</span>
              </div>
              <div className="seller-toggle-list">
                <label className="seller-toggle-row">
                  <span>
                    <strong>Two-factor authentication</strong>
                    <small>Extra protection for sign-in has not been connected yet.</small>
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
              <div className="seller-settings-actions">
                <div>
                  <strong>Password</strong>
                  <small>Change your password from the Account tab.</small>
                </div>
                <button
                  type="button"
                  className="seller-outline-button"
                  onClick={() => void signOutOtherSessions()}
                >
                  <Smartphone size={15} /> Sign out other sessions
                </button>
              </div>
              <p className="seller-settings-note">
                Two-factor authentication is a placeholder in this preview; it never blocks sign-in.
              </p>
            </div>
          )}

          {settingsTab === "danger" && (
            <div className="seller-settings-card seller-danger-zone">
              <div>
                <strong>Danger zone</strong>
                <span>
                  {demoMode
                    ? "Permanently delete this demo seller identity and all its local data from this browser."
                    : "Closing a real seller store is handled by the SupreCart team."}
                </span>
              </div>
              {confirmDelete ? (
                <div className="seller-confirm">
                  <p>
                    {demoMode
                      ? "This permanently deletes the demo seller account, profile, messages, application and preferences. It cannot be undone. Continue?"
                      : "Account closure is not connected in this preview. Continue to see more?"}
                  </p>
                  <div className="seller-confirm-actions">
                    <button
                      type="button"
                      className="seller-danger-button"
                      onClick={() => removeSellerAccount()}
                    >
                      <Trash2 size={15} /> {demoMode ? "Delete demo seller" : "Continue"}
                    </button>
                    <button
                      type="button"
                      className="seller-outline-button"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="seller-outline-button"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={15} /> {demoMode ? "Delete demo seller" : "Request store closure"}
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CommissionEstimator() {
  const [value, setValue] = useState("");
  const price = Number(value);
  const breakdown =
    value !== "" && Number.isFinite(price) && price > 0 ? calculateCommission(price) : null;
  return (
    <div className="seller-commission-estimator">
      <label>
        Preview a selling price (NGN)
        <input
          type="number"
          min="1"
          step="0.01"
          inputMode="decimal"
          placeholder="e.g. 1000"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      {breakdown ? (
        <dl className="seller-commission-result">
          <div>
            <dt>SupreCart commission</dt>
            <dd>{formatMoney(breakdown.commission)}</dd>
          </div>
          <div>
            <dt>You receive per item</dt>
            <dd>{formatMoney(breakdown.sellerNet)}</dd>
          </div>
          <div>
            <dt>Applies to</dt>
            <dd>{breakdown.tier.range}</dd>
          </div>
        </dl>
      ) : (
        <p className="seller-settings-note">
          Enter a price to see the commission and your net payout per item.
        </p>
      )}
    </div>
  );
}
