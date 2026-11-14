import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Box,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  LogOut,
  Menu,
  MessageCircle,
  PackagePlus,
  Percent,
  ShieldCheck,
  Settings,
  Smartphone,
  Star,
  Store,
  Trash2,
  Truck,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { categories as catalogCategories, products as seededCatalog } from "../../src/lib/catalog";
import {
  clearAccount,
  createLocalAccount,
  findAccount,
  getAccountModeration,
  isPresetAccount,
  readActiveAccount,
  saveAccount,
  verifyAccountPassword,
  type Account,
} from "../../src/lib/accounts";
import { getProfile, saveProfile } from "../../src/lib/orders";
import { deleteAccountData } from "../../src/lib/account-cleanup";
import {
  getSellerApplication,
  submitSellerApplication as saveSellerApplication,
  subscribeSellerApplications,
  type SellerApplication as LocalSellerApplication,
} from "../../src/lib/seller-applications";
import { Analytics } from "../../src/components/Analytics";
import { CookieConsent } from "../../src/components/CookieConsent";
import { ThemeToggle } from "../../src/components/theme";
import { trackEvent, trackLogin, trackSignUp } from "../../src/lib/analytics";
import { calculateCommission, commissionTiers } from "../../src/lib/commission";
import {
  cleanEmail,
  cleanMultiline,
  cleanPhone,
  cleanSecret,
  cleanText,
} from "../../src/lib/input";
import {
  accountAvatar,
  accountPreferenceScope,
  defaultAccountPreferences,
  processingTimeOptions,
  readAccountPreferences,
  saveAccountPreferences,
  shippingOptionsCatalog,
  subscribeAccountPreferences,
  type AccountPreferences,
  type NotificationPreferences,
} from "../../src/lib/account-preferences";
import {
  AVATAR_ACCEPT,
  AVATAR_SIZE,
  avatarErrorMessage,
  processAvatarFile,
  sniffImageMimeType,
} from "../../src/lib/avatar";
import { sanitizeImageSource } from "../../src/lib/image-safety";
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
  description?: string;
  brand?: string;
  condition?: string;
  price: number;
  inventory: number;
  published: boolean;
  in_stock?: boolean;
  image_path: string;
  image_url?: string;
  created_at: string;
};

type Rating = { product_id: string; review_count: number; average_rating: number };

type SellerStats = {
  orders: { id: string; status: string; created_at: string; buyer_confirmed?: boolean }[];
  items: { quantity: number; seller_net: number; product_id: string; order_id: string }[];
  products: SellerProduct[];
  ratings: Rating[];
  committedPayouts: number;
};

type FundEntry = { id: string; description: string; amount: number; date: string };

type SellerSettingsTab =
  "account" | "store" | "fulfilment" | "commission" | "notifications" | "security" | "danger";

const sellerSettingsTabs = [
  ["account", "Account", Settings],
  ["store", "Store profile", Store],
  ["fulfilment", "Fulfilment", Truck],
  ["commission", "Commission & fees", Percent],
  ["notifications", "Notifications", Bell],
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

function buildSeededSellerStats(email: string): SellerStats {
  const sellerProducts =
    email === "shewa@gmail.com"
      ? seededCatalog.filter((product) => product.category === "Footwear").slice(0, 3)
      : email === "daniella@gmail.com"
        ? seededCatalog.filter((product) => product.category === "Beauty").slice(0, 3)
        : email === "adeniji@gmail.com"
          ? seededCatalog.filter((product) => product.category === "Clothing").slice(0, 3)
          : seededCatalog.filter((product) => product.category === "Home").slice(0, 3);
  const createdAt = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };
  const products: SellerProduct[] = sellerProducts
    .filter((product) => product !== undefined)
    .map((product, index) => ({
      id: `seeded-product-${index + 1}`,
      name: product.name,
      category: product.category,
      price: product.price,
      inventory: [8, 14, 5][index] ?? 4,
      published: true,
      in_stock: true,
      image_path: "",
      image_url: product.image,
      created_at: createdAt(45 - index * 9),
    }));
  const orders: SellerStats["orders"] = [
    { id: "SC-1048", status: "delivered", created_at: createdAt(3), buyer_confirmed: true },
    { id: "SC-1031", status: "processing", created_at: createdAt(1) },
    { id: "SC-0996", status: "in_transit", created_at: createdAt(6) },
    { id: "SC-0942", status: "delivered", created_at: createdAt(12), buyer_confirmed: true },
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
      order_id: "SC-1048",
    },
    {
      quantity: 2,
      seller_net: sellerNet(1, 2),
      product_id: products[1]?.id || "",
      order_id: "SC-1031",
    },
    {
      quantity: 1,
      seller_net: sellerNet(2),
      product_id: products[2]?.id || "",
      order_id: "SC-0996",
    },
    {
      quantity: 1,
      seller_net: sellerNet(0),
      product_id: products[0]?.id || "",
      order_id: "SC-0942",
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

function fundEntries(email: string): FundEntry[] {
  const entries: Record<string, FundEntry[]> = {
    "shewa@gmail.com": [
      { id: "fund-s-1", description: "Refund adjustment", amount: 12500, date: "18 Sep 2026" },
      { id: "fund-s-2", description: "Wallet top-up", amount: 20000, date: "12 Sep 2026" },
    ],
    "daniella@gmail.com": [
      { id: "fund-d-1", description: "Wallet top-up", amount: 25000, date: "16 Sep 2026" },
    ],
    "adeniji@gmail.com": [
      { id: "fund-a-1", description: "Refund adjustment", amount: 8400, date: "14 Sep 2026" },
    ],
    "bukunmi@gmail.com": [
      { id: "fund-b-1", description: "Refund adjustment", amount: 6500, date: "13 Sep 2026" },
      { id: "fund-b-2", description: "Wallet top-up", amount: 10000, date: "10 Sep 2026" },
    ],
  };
  return entries[email] ?? [];
}

const localSellerProductsKey = (email: string) =>
  `suprecart-seller-products:${email.toLowerCase()}`;

const maxLocalSellerProducts = 200;

function normalizeSellerProduct(value: unknown): SellerProduct | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as Partial<SellerProduct>;
  const id = cleanText(entry.id, 80);
  const name = cleanText(entry.name, 160);
  const category = cleanText(entry.category, 80);
  const price =
    typeof entry.price === "number" && Number.isFinite(entry.price) && entry.price >= 0
      ? entry.price
      : null;
  const inventory =
    typeof entry.inventory === "number" && Number.isFinite(entry.inventory)
      ? Math.max(0, Math.floor(entry.inventory))
      : 0;
  const createdAt = cleanText(entry.created_at, 40);
  if (!id || !name || !category || price === null || !createdAt) return null;
  const description = cleanMultiline(entry.description, 2_000);
  const brand = cleanText(entry.brand, 120);
  const condition = cleanText(entry.condition, 80);
  return {
    id,
    name,
    category,
    price,
    inventory,
    published: entry.published !== false,
    in_stock: entry.in_stock !== false && inventory > 0,
    image_path: cleanText(entry.image_path, 300),
    image_url: sanitizeImageSource(entry.image_url),
    created_at: createdAt,
    ...(description ? { description } : {}),
    ...(brand ? { brand } : {}),
    ...(condition ? { condition } : {}),
  };
}

function normalizeSellerProducts(value: unknown): SellerProduct[] {
  if (!Array.isArray(value)) return [];
  const products: SellerProduct[] = [];
  for (const entry of value.slice(0, maxLocalSellerProducts)) {
    const product = normalizeSellerProduct(entry);
    if (!product || products.some((item) => item.id === product.id)) continue;
    products.push(product);
  }
  return products;
}

function readLocalSellerProducts(email: string): SellerProduct[] {
  try {
    const saved = window.localStorage.getItem(localSellerProductsKey(email));
    if (!saved) return [];
    return normalizeSellerProducts(JSON.parse(saved));
  } catch (cause) {
    console.error("Could not read the local seller products.", cause);
    return [];
  }
}

function writeLocalSellerProducts(email: string, products: SellerProduct[]) {
  try {
    window.localStorage.setItem(
      localSellerProductsKey(email),
      JSON.stringify(normalizeSellerProducts(products)),
    );
  } catch (cause) {
    console.error("Could not save the local seller products.", cause);
  }
}

function isProductInStock(product: SellerProduct) {
  return product.in_stock !== false && product.inventory > 0;
}

export default function SellerPortal({ standalone = false }: { standalone?: boolean } = {}) {
  const [sellerApplication, setSellerApplication] = useState<LocalSellerApplication | null>(null);
  const [screen, setScreen] = useState<"login" | "apply">("apply");
  const [sessionAccount, setSessionAccount] = useState<Account | null>(null);
  const [sessionProfile, setSessionProfile] = useState({ name: "", phone: "" });
  const [localProducts, setLocalProducts] = useState<SellerProduct[]>([]);
  const [sellerAvatar, setSellerAvatar] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SellerSettingsTab>("account");
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
    setMobileNavOpen(false);
    setAccountMenuOpen(false);
    setSettingsMenuOpen(false);
    trackEvent("seller_page_view", { page: next });
    if (readSellerPage() !== next) {
      window.history.pushState(null, "", `#${next}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToSettingsTab(next: SellerSettingsTab) {
    setSettingsTab(next);
    goToPage("settings");
  }

  useEffect(() => {
    if (!settingsMenuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSettingsMenuOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsMenuOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingScreen(false), 1050);
    const activeAccount = readActiveAccount();
    if (activeAccount?.role === "seller") {
      setSessionAccount(activeAccount);
      setSellerApplication(getSellerApplication(activeAccount.email));
      setSessionProfile(getProfile(activeAccount.email, activeAccount.name));
      setLocalProducts(readLocalSellerProducts(activeAccount.email));
    }
    setBusy(false);
    return () => window.clearTimeout(timer);
  }, []);

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
    if (!sessionAccount) {
      setSellerAvatar("");
      return;
    }
    const syncAvatar = () => setSellerAvatar(accountAvatar(sessionAccount));
    syncAvatar();
    return subscribeAccountPreferences(syncAvatar);
  }, [sessionAccount]);

  useEffect(() => {
    if (loadingScreen || busy || sessionAccount) return;
    window.location.replace(loginHref);
  }, [busy, sessionAccount, loadingScreen]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData(event.currentTarget);
      const email = cleanEmail(form.get("email"));
      const files = form
        .getAll("documents")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);
      if (files.some((file) => !fileTypes.includes(file.type) || file.size > 10 * 1024 * 1024)) {
        throw new Error("Attachments must be JPG, PNG, or PDF files under 10 MB each.");
      }
      const draft = {
        firstName: cleanText(form.get("firstName"), 80),
        middleName: cleanText(form.get("middleName"), 80),
        lastName: cleanText(form.get("lastName"), 80),
        email,
        description: cleanMultiline(form.get("description"), 1000),
      };
      const account = await createLocalAccount({
        email,
        name: `${draft.firstName} ${draft.lastName}`.trim(),
        role: "seller",
        password: cleanSecret(form.get("password")),
      });
      saveAccount(account);
      const application = saveSellerApplication({
        email,
        name: `${draft.firstName} ${draft.lastName}`.trim(),
        storeName: `${draft.firstName}'s shop`,
        phone: "",
        productDescription: draft.description,
      });
      trackSignUp("seller");
      setSessionAccount(account);
      setSellerApplication(application);
      setSubmitted(true);
      setSessionProfile(getProfile(account.email, account.name));
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
      const email = cleanEmail(form.get("email"));
      const localAccount = findAccount(email, "seller");
      if (!localAccount) {
        throw new Error("No seller account matches that email yet. Submit an application first.");
      }
      const moderation = getAccountModeration(localAccount.email);
      if (moderation.status === "banned") {
        throw new Error(
          moderation.reason
            ? `This account is banned: ${moderation.reason}`
            : "This account has been banned by an administrator.",
        );
      }
      if (!isPresetAccount(email, "seller")) {
        const passwordMatches = await verifyAccountPassword(
          email,
          "seller",
          cleanSecret(form.get("password")),
        );
        if (!passwordMatches) {
          throw new Error("That password does not match this account. Please try again.");
        }
      }
      saveAccount(localAccount);
      trackLogin("seller");
      setSessionAccount(localAccount);
      setSellerApplication(getSellerApplication(localAccount.email));
      setSessionProfile(getProfile(localAccount.email, localAccount.name));
      setLocalProducts(readLocalSellerProducts(localAccount.email));
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
    const email = cleanEmail(new FormData(event.currentTarget).get("email"));
    setError("");
    setNotice(
      `Seller accounts live in this browser, so there is no password reset email for ${email}.`,
    );
  }

  async function signOut() {
    clearAccount();
    setSessionAccount(null);
    setSubmitted(false);
    setSellerApplication(null);
    setLocalProducts([]);
    setScreen("login");
    window.location.assign(marketplaceBase || "/");
  }

  function switchToBuyerAccount() {
    if (!sessionAccount) return;
    const buyerAccount = findAccount(sessionAccount.email, "buyer");
    if (!buyerAccount) return;
    saveAccount(buyerAccount);
    setAccountMenuOpen(false);
    setMobileNavOpen(false);
    window.location.assign(`${marketplaceBase}/account`);
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionAccount) return;
    if (sellerApplication?.status !== "approved") {
      setError("Only approved SupreCart sellers can list products.");
      return;
    }
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
      const header = new Uint8Array(await image.slice(0, 16).arrayBuffer());
      if (!sniffImageMimeType(header)) {
        throw new Error("That file is not a real JPG, PNG, or WebP image.");
      }
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that product image."));
        reader.readAsDataURL(image);
      });
      const name = cleanText(form.get("name"), 120);
      const category = cleanText(form.get("category"), 60);
      const description = cleanMultiline(form.get("description"), 2000);
      const price = Number(form.get("price"));
      const inventory = Number(form.get("inventory"));
      if (!name) throw new Error("Enter a product name.");
      if (!category || !catalogCategories.includes(category)) {
        throw new Error("Choose a product category from the list.");
      }
      if (description.length < 30) {
        throw new Error("Add a detailed product description of at least 30 characters.");
      }
      if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a valid product price.");
      if (!Number.isInteger(inventory) || inventory < 0) {
        throw new Error("Available quantity must be a whole number.");
      }
      const product: SellerProduct = {
        id: crypto.randomUUID(),
        name,
        category,
        description,
        brand: cleanText(form.get("brand"), 80) || "Independent",
        condition: cleanText(form.get("condition"), 40) || "New",
        price,
        inventory,
        published: true,
        in_stock: inventory > 0,
        image_path: "",
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };
      const updated = [product, ...localProducts];
      setLocalProducts(updated);
      writeLocalSellerProducts(sessionAccount.email, updated);
      formElement.reset();
      setNotice("Product added to your listings.");
    } catch (cause) {
      console.error("Could not add the seller's product.", cause);
      setError(cause instanceof Error ? cause.message : "Could not add product.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleProductStock(product: SellerProduct) {
    if (!sessionAccount) return;
    const nextInStock = !isProductInStock(product);
    const updatedProduct: SellerProduct = {
      ...product,
      in_stock: nextInStock,
      inventory: nextInStock && product.inventory <= 0 ? 1 : product.inventory,
    };
    const existing = localProducts.some((entry) => entry.id === product.id);
    const updated = existing
      ? localProducts.map((entry) => (entry.id === product.id ? updatedProduct : entry))
      : [updatedProduct, ...localProducts];
    setLocalProducts(updated);
    writeLocalSellerProducts(sessionAccount.email, updated);
    setError("");
    setNotice(
      nextInStock ? `${product.name} is now in stock.` : `${product.name} is now out of stock.`,
    );
  }

  function requestPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Payout requests are saved for review. No money has moved yet.");
    event.currentTarget.reset();
  }

  function updateSellerAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionAccount) return;
    const form = new FormData(event.currentTarget);
    const name = cleanText(form.get("name"), 120);
    const phone = cleanPhone(form.get("phone"));
    if (!name) {
      setError("Enter a display name before saving.");
      return;
    }
    saveProfile(sessionAccount.email, { name, phone });
    setSessionAccount({ ...sessionAccount, name });
    setSessionProfile({ name, phone });
    setError("");
    setNotice("Your seller profile has been updated in this browser.");
  }

  const seededStats = useMemo(() => {
    if (!sessionAccount) return null;
    const base = buildSeededSellerStats(sessionAccount.email);
    const merged = [...localProducts];
    for (const product of base.products) {
      if (!merged.some((entry) => entry.id === product.id)) merged.push(product);
    }
    return { ...base, products: merged };
  }, [sessionAccount, localProducts]);
  const seededConfirmedItems =
    seededStats?.items.filter((item) =>
      seededStats.orders.some(
        (order) => order.id === item.order_id && order.buyer_confirmed === true,
      ),
    ) ?? [];
  const seededEarnings = seededConfirmedItems.reduce((sum, item) => sum + item.seller_net, 0);
  const seededSoldCount = seededConfirmedItems.reduce((sum, item) => sum + item.quantity, 0);
  const seededWalletEntries = sessionAccount ? fundEntries(sessionAccount.email) : [];
  const seededBalance =
    seededEarnings + seededWalletEntries.reduce((sum, entry) => sum + entry.amount, 0);

  if (loadingScreen) return <SellerLoadingScreen />;

  const showDashboard = Boolean(sessionAccount && sellerApplication?.status === "approved");
  const linkedBuyerAccount = sessionAccount ? findAccount(sessionAccount.email, "buyer") : null;

  return (
    <main id="main-content" tabIndex={-1} className="seller-site">
      <header className="seller-header">
        <a href={marketplaceUrl} aria-label="SupreCart home" className="seller-logo-link">
          <img className="seller-logo-default" src="/suprecart-logo.png" alt="SupreCart" />
          <img
            className="seller-logo-dark"
            src="/suprecart-logo-light.png"
            alt=""
            aria-hidden="true"
          />
        </a>
        <span className="seller-header-note">SELLER STUDIO</span>
        <div className="seller-header-actions">
          <ThemeToggle className="seller-theme-toggle" />
          {sessionAccount && showDashboard && (
            <div className="seller-settings-menu">
              <button
                type="button"
                className="seller-settings-trigger"
                aria-label="Open account settings"
                aria-haspopup="menu"
                aria-expanded={settingsMenuOpen}
                aria-controls="seller-settings-dropdown"
                onClick={() => {
                  setSettingsMenuOpen((open) => !open);
                  setMobileNavOpen(false);
                  setAccountMenuOpen(false);
                }}
              >
                <Settings size={17} />
              </button>
              {settingsMenuOpen && (
                <div id="seller-settings-dropdown" className="seller-settings-dropdown" role="menu">
                  <p className="seller-settings-dropdown-label">Account settings</p>
                  {sellerSettingsTabs.map(([key, label, Icon]) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={key}
                      className={page === "settings" && settingsTab === key ? "active" : ""}
                      onClick={() => goToSettingsTab(key)}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {sessionAccount && (
            <div className="seller-mobile-menu">
              <button
                type="button"
                className="seller-mobile-toggle"
                aria-label="Toggle seller menu"
                aria-expanded={mobileNavOpen}
                aria-controls="seller-section-nav"
                onClick={() => {
                  setMobileNavOpen((open) => !open);
                  setSettingsMenuOpen(false);
                  setAccountMenuOpen(false);
                }}
              >
                {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
              {mobileNavOpen && (
                <div id="seller-section-nav" className="seller-mobile-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className={showDashboard && page === "overview" ? "active" : ""}
                    onClick={() => goToPage("overview")}
                  >
                    <Box size={16} /> Overview
                  </button>
                  {showDashboard && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        className={page === "products" ? "active" : ""}
                        onClick={() => goToPage("products")}
                      >
                        <PackagePlus size={16} /> Products
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={page === "orders" ? "active" : ""}
                        onClick={() => goToPage("orders")}
                      >
                        <Box size={16} /> Orders
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={page === "payouts" ? "active" : ""}
                        onClick={() => goToPage("payouts")}
                      >
                        <CircleDollarSign size={16} /> Payouts
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={page === "settings" ? "active" : ""}
                        onClick={() => goToPage("settings")}
                      >
                        <Settings size={16} /> Account settings
                      </button>
                    </>
                  )}
                  <a
                    role="menuitem"
                    href={`${marketplaceUrl.replace(/\/$/, "")}/messages?accountEmail=${encodeURIComponent(
                      sessionAccount.email,
                    )}&accountRole=seller`}
                  >
                    <MessageCircle size={16} /> Messages
                  </a>
                  <a role="menuitem" href={marketplaceUrl}>
                    <Store size={16} /> Buyer homepage
                  </a>
                  {linkedBuyerAccount && (
                    <button type="button" role="menuitem" onClick={switchToBuyerAccount}>
                      <UserRound size={16} /> Switch to buyer account
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={() => void signOut()}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
          {sessionAccount ? (
            <div className="seller-account-menu">
              <button
                type="button"
                className="seller-account-trigger"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setAccountMenuOpen((open) => !open);
                  setSettingsMenuOpen(false);
                  setMobileNavOpen(false);
                }}
              >
                <span className="seller-account-avatar">
                  {sellerAvatar ? (
                    <img src={sellerAvatar} alt="" />
                  ) : (
                    (sessionProfile.name || sessionAccount.name).trim().charAt(0).toUpperCase()
                  )}
                </span>
                <span className="seller-account-name">
                  <small>Seller account</small>
                  <strong>{sessionProfile.name || sessionAccount.name}</strong>
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
                  {linkedBuyerAccount && (
                    <button type="button" role="menuitem" onClick={switchToBuyerAccount}>
                      <UserRound size={15} /> Switch to buyer account
                    </button>
                  )}
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
          {sessionAccount && (
            <a
              className="seller-side-link"
              href={`${marketplaceUrl.replace(/\/$/, "")}/messages?accountEmail=${encodeURIComponent(
                sessionAccount.email,
              )}&accountRole=seller`}
            >
              <MessageCircle size={16} /> Messages
            </a>
          )}
          <div className="seller-sidebar-foot">
            <ShieldCheck size={16} />
            <span>Your information is protected by SupreCart.</span>
          </div>
        </aside>

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
          ) : sessionAccount && sellerApplication?.status === "approved" ? (
            <SellerDashboard
              application={{
                id: sessionAccount.email,
                first_name:
                  (sessionProfile.name || sessionAccount.name).split(/\s+/)[0] ??
                  sessionAccount.name,
                middle_name: null,
                last_name: (sessionProfile.name || sessionAccount.name)
                  .split(/\s+/)
                  .slice(1)
                  .join(" "),
                email: sessionAccount.email,
                product_description: sellerApplication.productDescription,
                status: "approved",
                verified: true,
              }}
              stats={seededStats}
              earnings={seededEarnings}
              balance={seededBalance}
              soldCount={seededSoldCount}
              error={error}
              notice={notice}
              submitting={submitting}
              seededMode
              sessionProfile={sessionProfile}
              fundEntries={seededWalletEntries}
              page={page}
              settingsTab={settingsTab}
              onNavigate={goToPage}
              onAddProduct={addProduct}
              onRequestPayout={requestPayout}
              onUpdateAccount={updateSellerAccount}
              onToggleStock={toggleProductStock}
            />
          ) : !sessionAccount ? (
            <SellerRedirectPanel />
          ) : !sellerApplication ? (
            <SellerApplicationRequired accountHref={buyerAccountHref} />
          ) : (
            <ApplicationStatus
              status={sellerApplication.status === "rejected" ? "rejected" : "pending"}
              name={
                (sessionProfile.name || sessionAccount.name).split(/\s+/)[0] ?? sessionAccount.name
              }
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
              Seller accounts can sign in without a password. Accounts you create here use the
              password you chose.
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
          Sign in with the email and password attached to your approved seller account. Approved
          buyers can also sign in from the storefront.
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

function SellerSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`seller-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="seller-switch-knob" aria-hidden="true" />
    </button>
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
  seededMode = false,
  sessionProfile,
  fundEntries = [],
  page,
  settingsTab,
  onNavigate,
  onAddProduct,
  onRequestPayout,
  onUpdateAccount,
  onToggleStock,
}: {
  application: SellerApplication;
  stats: SellerStats | null;
  earnings: number;
  balance: number;
  soldCount: number;
  error: string;
  notice: string;
  submitting: boolean;
  seededMode?: boolean;
  sessionProfile?: { name: string; phone: string };
  fundEntries?: FundEntry[];
  page: SellerPage;
  settingsTab: SellerSettingsTab;
  onNavigate: (page: SellerPage) => void;
  onAddProduct: (event: FormEvent<HTMLFormElement>) => void;
  onRequestPayout: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateAccount: (event: FormEvent<HTMLFormElement>) => void;
  onToggleStock: (product: SellerProduct) => void;
}) {
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultAccountPreferences);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [productPrice, setProductPrice] = useState("");
  const preferencesKey = accountPreferenceScope("seller", application.email);
  const moderation = getAccountModeration(application.email);

  useEffect(() => {
    setPreferences(readAccountPreferences(preferencesKey));
  }, [preferencesKey]);

  useEffect(() => {
    setSettingsError("");
    setSettingsNotice("");
    setConfirmDelete(false);
  }, [settingsTab]);

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
        storeName: cleanText(form.get("storeName"), 120),
        tagline: cleanText(form.get("tagline"), 160),
        description: cleanMultiline(form.get("description"), 1000),
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
      setSettingsNotice("Store logo saved in this browser only.");
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
      `Profile photo updated. This ${AVATAR_SIZE}×${AVATAR_SIZE} image is kept in this browser until object storage is connected.`,
    );
  }

  function removeAvatar() {
    updatePreferences({ ...preferences, avatarDataUrl: "" });
    setSettingsNotice("Profile photo removed from this browser.");
  }

  async function signOutOtherSessions() {
    setSettingsNotice(
      "Seller accounts are browser-only, so there are no other sessions to sign out.",
    );
  }

  function removeSellerAccount() {
    setConfirmDelete(false);
    if (seededMode) {
      deleteAccountData(application.email);
      window.location.assign(marketplaceBase || "/");
      return;
    }
    setSettingsNotice("Store closure is handled by SupreCart support. Nothing was deleted.");
  }

  const ratings = stats?.ratings ?? [];
  const average = ratings.length
    ? ratings.reduce((sum, rating) => sum + Number(rating.average_rating), 0) / ratings.length
    : 0;
  const heldFunds = (stats?.items ?? [])
    .filter((item) =>
      (stats?.orders ?? []).some(
        (order) =>
          order.id === item.order_id &&
          order.buyer_confirmed !== true &&
          !["cancelled", "refunded"].includes(order.status),
      ),
    )
    .reduce((sum, item) => sum + Number(item.seller_net), 0);
  const enabledNotifications = Object.values(preferences.notifications).filter(Boolean).length;
  return (
    <div className="seller-dashboard">
      <div className="seller-dashboard-topline">
        <p className="seller-eyebrow">YOUR SELLER STUDIO</p>
        <span className="seller-approved">
          <BadgeCheck size={14} /> VERIFIED SELLER
        </span>
      </div>
      {seededMode && (
        <p className="seller-form-notice" role="status">
          ACCOUNT DATA · These seeded orders, ratings, and NGN figures are stored locally. No
          purchases, payouts, or backend records exist.
        </p>
      )}
      {moderation.status === "warned" && (
        <p className="seller-form-warning" role="alert">
          Admin warning: {moderation.reason || "please review the marketplace rules."}
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
                  {seededMode
                    ? "Live seller metrics are not loaded yet. — real seller data is not loaded."
                    : "Here’s how your shop is doing today."}
                </p>
              </div>
            </div>
            <div className="seller-dashboard-actions">
              {!seededMode && (
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
              )}
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
          </div>
          <div className="seller-metric-grid">
            <article className="seller-metric-card seller-metric-balance">
              <span>{seededMode ? "AVAILABLE FUNDS" : "AVAILABLE TO REQUEST"}</span>
              <strong>{formatMoney(balance)}</strong>
              <small>For buyer-confirmed deliveries</small>
              <CircleDollarSign size={20} />
            </article>
            <article className="seller-metric-card seller-metric-held">
              <span>HELD BY SUPRECART</span>
              <strong>{formatMoney(heldFunds)}</strong>
              <small>Held until the buyer confirms delivery</small>
              <ShieldCheck size={19} />
            </article>
            <article className="seller-metric-card">
              <span>{seededMode ? "NET EARNINGS" : "TOTAL EARNED"}</span>
              <strong>{formatMoney(earnings)}</strong>
              <small>Your net from confirmed deliveries</small>
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
            <button
              type="button"
              className="seller-outline-button"
              onClick={() => setProductFormOpen((open) => !open)}
            >
              <PackagePlus size={15} /> Add product
            </button>
          </div>
          {productFormOpen && (
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
                <select name="category" defaultValue="" required>
                  <option value="" disabled>
                    Choose a category…
                  </option>
                  {catalogCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Brand / maker
                <input name="brand" maxLength={60} placeholder="e.g. Shewa Studio" />
              </label>
              <label>
                Condition
                <select name="condition" defaultValue="New">
                  {["New", "Refurbished", "Pre-owned"].map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
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
                Detailed product description
                <textarea
                  name="description"
                  rows={4}
                  minLength={30}
                  maxLength={4000}
                  placeholder="Materials, dimensions, care instructions, what's included, and anything a buyer should know…"
                  required
                />
                <small>
                  At least 30 characters. Clear details help buyers decide with confidence.
                </small>
              </label>
              <label className="seller-field-full">
                Product image
                <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp" required />
                <small>JPG, PNG, or WebP · max 10 MB. Use a bright, clear product photo.</small>
              </label>
              <p className="seller-product-access-note seller-field-full">
                <ShieldCheck size={14} /> Listings are available to approved SupreCart sellers only.
                New products are saved in this browser and shown in your catalogue immediately.
              </p>
              {Number(productPrice) > 0 && (
                <p className="seller-fee-estimate seller-field-full" role="status">
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
                {submitting ? "Saving product…" : "Publish product"} <ArrowRight size={15} />
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
                      <span>
                        {product.category}
                        {product.condition ? ` · ${product.condition}` : ""}
                        {product.brand ? ` · ${product.brand}` : ""}
                      </span>
                      {product.description && (
                        <p className="seller-product-description">{product.description}</p>
                      )}
                      <small className="seller-product-net">
                        Net {formatMoney(fee.sellerNet)} · fee {formatMoney(fee.commission)}
                      </small>
                    </div>
                    <span className="seller-product-price">
                      {formatMoney(Number(product.price))}
                    </span>
                    <div className="seller-product-stock">
                      <span>
                        {isProductInStock(product)
                          ? `${product.inventory} in stock`
                          : "Out of stock"}
                      </span>
                      <button
                        type="button"
                        className="seller-stock-toggle"
                        onClick={() => onToggleStock(product)}
                      >
                        {isProductInStock(product) ? "Mark out" : "Restock"}
                      </button>
                    </div>
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
                <strong>Your first product is waiting.</strong>
                <span>
                  Add a product with a detailed description and category to start selling.
                </span>
                <button
                  type="button"
                  className="seller-switch-link"
                  onClick={() => setProductFormOpen(true)}
                >
                  Add your first product <ArrowRight size={14} />
                </button>
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
                    <strong>Order {seededMode ? order.id : order.id.slice(0, 8)}</strong>
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
                        {" seller net"}
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="seller-settings-note">
              {seededMode
                ? "No live orders are connected yet."
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
                Buyer-confirmed earnings, less applicable commission. Withdrawals are reviewed
                before any payment is made.
              </span>
            </div>
            {!seededMode && (
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
          {payoutFormOpen && !seededMode && (
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
            {seededMode
              ? "Balances shown here cannot be withdrawn."
              : "A payout request does not transfer funds. SupreCart reviews requests before any payout is arranged."}
          </p>
          <p className="seller-finance-note">
            <Percent size={14} />
            SupreCart commission: ₦5,000 and below → ₦150 + 7.5%; above ₦5,000 → 11% of the selling
            price. See Commission &amp; fees for a full breakdown.
          </p>
          <p className="seller-finance-note">
            <Clock3 size={14} />
            {formatMoney(heldFunds)} is held by SupreCart until buyers confirm delivery. SupreCart
            deducts its commission, then releases the seller net. If a sale does not complete, the
            held amount is never credited to your available balance.
          </p>
          {seededMode && fundEntries.length > 0 && (
            <div className="seller-fund-ledger">
              <h3>Balance activity</h3>
              <p>Refund adjustments and top-ups included in this balance.</p>
              {fundEntries.map((entry) => (
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
                <strong>{seededMode ? "Seller account" : application.email}</strong>
                <span>
                  {seededMode
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
                    to your store once object storage is connected; it is kept in your browser.
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
              <div className="seller-verify-banner verified">
                <BadgeCheck size={17} />
                <div>
                  <strong>Verified seller</strong>
                  <span>SupreCart has confirmed your store details.</span>
                </div>
              </div>
              {seededMode ? (
                <form className="seller-settings-form" onSubmit={onUpdateAccount}>
                  <p className="seller-settings-note">
                    Profile changes are saved only in this browser. Email and password remain stored
                    here and cannot be changed.
                  </p>
                  <label>
                    Display name
                    <input
                      name="name"
                      defaultValue={sessionProfile?.name || application.first_name}
                      required
                    />
                  </label>
                  <label>
                    Contact phone
                    <input name="phone" type="tel" defaultValue={sessionProfile?.phone ?? ""} />
                  </label>
                  <label>
                    Email
                    <input type="email" value={application.email} disabled />
                  </label>
                  <button className="seller-primary-button" type="submit">
                    Save profile
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
                  <small>JPG, PNG, or WebP · max 2 MB · stored in this browser.</small>
                </label>
                {preferences.store.logoDataUrl && (
                  <div className="seller-store-logo">
                    <img src={preferences.store.logoDataUrl} alt="Store logo" />
                    <span>Logo (saved in this browser)</span>
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

          {settingsTab === "commission" && (
            <div className="seller-settings-card">
              <div>
                <strong>SupreCart commission &amp; fees</strong>
                <span>What SupreCart deducts before releasing each sale.</span>
              </div>
              <p className="seller-settings-note">
                Commission is charged on the selling price when the buyer confirms delivery. The
                seller net is released after the deduction. There is no listing or subscription fee.
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
                      <div key={key} className="seller-toggle-row">
                        <span>
                          <strong>{title}</strong>
                          <small>{text}</small>
                        </span>
                        <SellerSwitch
                          checked={preferences.notifications[key]}
                          onChange={(checked) => setNotification(key, checked)}
                          label={title}
                        />
                      </div>
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

          {settingsTab === "security" && (
            <div className="seller-settings-card">
              <div>
                <strong>Security</strong>
                <span>Keep your seller account and store safe.</span>
              </div>
              <div className="seller-toggle-list">
                <div className="seller-toggle-row">
                  <span>
                    <strong>Two-factor authentication</strong>
                    <small>Extra protection for sign-in has not been connected yet.</small>
                  </span>
                  <SellerSwitch
                    checked={preferences.twoFactorEnabled}
                    onChange={(checked) =>
                      updatePreferences({
                        ...preferences,
                        twoFactorEnabled: checked,
                      })
                    }
                    label="Two-factor authentication"
                  />
                </div>
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
                Two-factor authentication is a placeholder; it never blocks sign-in.
              </p>
            </div>
          )}

          {settingsTab === "danger" && (
            <div className="seller-settings-card seller-danger-zone">
              <div>
                <strong>Danger zone</strong>
                <span>
                  {seededMode
                    ? "Permanently delete this seller account and all its local data from this browser."
                    : "Closing a real seller store is handled by the SupreCart team."}
                </span>
              </div>
              {confirmDelete ? (
                <div className="seller-confirm">
                  <p>
                    {seededMode
                      ? "This permanently deletes the seller account, profile, messages, application and preferences. It cannot be undone. Continue?"
                      : "Account closure is handled by SupreCart support. Continue to see more?"}
                  </p>
                  <div className="seller-confirm-actions">
                    <button
                      type="button"
                      className="seller-danger-button"
                      onClick={() => removeSellerAccount()}
                    >
                      <Trash2 size={15} /> {seededMode ? "Delete seller account" : "Continue"}
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
                  <Trash2 size={15} />{" "}
                  {seededMode ? "Delete seller account" : "Request store closure"}
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
        Enter a selling price (NGN)
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
