import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Box,
  Check,
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
import { supabase, type Session } from "../../src/lib/supabase";
import { products as demoCatalog } from "../../src/lib/catalog";
import {
  clearDemoAccount,
  createLocalAccount,
  findDemoAccount,
  getDemoAccounts,
  isPresetAccount,
  readDemoAccount,
  saveDemoAccount,
  verifyAccountPassword,
  type DemoAccount,
} from "../../src/lib/demo-accounts";
import { getDemoProfile, saveDemoProfile } from "../../src/lib/demo-orders";
import { CookieConsent } from "../../src/components/CookieConsent";
import { calculateCommission, commissionTiers } from "../../src/lib/commission";
import {
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
const cookiePolicyHref = /^https?:\/\//.test(marketplaceUrl)
  ? `${marketplaceUrl.replace(/\/$/, "")}/info/cookies`
  : undefined;

type ApplicationDraft = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  description: string;
  bankName: string;
  accountNumber: string;
  files: File[];
};

function openApplicationDraftDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("suprecart-seller-portal", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("applications");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open application draft storage."));
  });
}

async function saveApplicationDraft(draft: ApplicationDraft) {
  const database = await openApplicationDraftDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("applications", "readwrite");
    transaction.objectStore("applications").put(draft, "pending");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save application details."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Application draft save was cancelled."));
  });
  database.close();
}

async function readApplicationDraft() {
  const database = await openApplicationDraftDb();
  const draft = await new Promise<ApplicationDraft | undefined>((resolve, reject) => {
    const transaction = database.transaction("applications", "readonly");
    const request = transaction.objectStore("applications").get("pending");
    request.onsuccess = () => resolve(request.result as ApplicationDraft | undefined);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read application details."));
  });
  database.close();
  return draft;
}

async function clearApplicationDraft() {
  const database = await openApplicationDraftDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("applications", "readwrite");
    transaction.objectStore("applications").delete("pending");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not clear application details."));
  });
  database.close();
}

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

export default function SellerPortal({ standalone = false }: { standalone?: boolean } = {}) {
  const [session, setSession] = useState<Session | null>(null);
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [screen, setScreen] = useState<"login" | "apply">("apply");
  const [demoAccount, setDemoAccount] = useState<DemoAccount | null>(null);
  const [demoProfile, setDemoProfile] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [page, setPage] = useState<SellerPage>(readSellerPage);
  const creatingApplication = useRef(false);

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
    if (readSellerPage() !== next) {
      window.history.pushState(null, "", `#${next}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const loadSellerData = useCallback(async (activeSession: Session) => {
    if (!supabase) return;
    let applicationQuery = await supabase
      .from("seller_applications")
      .select(
        "id, first_name, middle_name, last_name, email, product_description, status, verified",
      )
      .eq("id", activeSession.user.id)
      .maybeSingle();
    if (applicationQuery.error) {
      applicationQuery = await supabase
        .from("seller_applications")
        .select("id, first_name, middle_name, last_name, email, product_description, status")
        .eq("id", activeSession.user.id)
        .maybeSingle();
    }
    const { data, error: applicationError } = applicationQuery;
    if (applicationError) throw applicationError;
    const seller = data as SellerApplication | null;
    setApplication(seller);
    if (!seller || seller.status !== "approved") {
      setStats(null);
      return;
    }
    const [ordersResult, itemsResult, productsResult, ratingsResult, payoutsResult] =
      await Promise.all([
        supabase.from("orders").select("id, status, created_at"),
        supabase.from("order_items").select("quantity, seller_net, product_id, order_id"),
        supabase
          .from("products")
          .select("id, name, category, price, inventory, published, image_path, created_at")
          .eq("seller_id", activeSession.user.id)
          .order("created_at", { ascending: false }),
        supabase.from("seller_product_ratings").select("product_id, review_count, average_rating"),
        supabase.from("payout_requests").select("amount, status"),
      ]);
    const failed = [ordersResult, itemsResult, productsResult, ratingsResult, payoutsResult].find(
      (result) => result.error,
    );
    if (failed?.error) throw failed.error;
    const orders = (ordersResult.data ?? []) as SellerStats["orders"];
    const items = (itemsResult.data ?? []) as SellerStats["items"];
    const payouts = (payoutsResult.data ?? []) as { amount: number; status: string }[];
    setStats({
      orders,
      items,
      products: (productsResult.data ?? []) as SellerProduct[],
      ratings: (ratingsResult.data ?? []) as Rating[],
      committedPayouts: payouts
        .filter((payout) => ["requested", "approved", "processing", "paid"].includes(payout.status))
        .reduce((sum, payout) => sum + Number(payout.amount), 0),
    });
  }, []);

  const createApplication = useCallback(
    async (activeSession: Session) => {
      if (!supabase)
        throw new Error("Account service is temporarily unavailable. Please try again later.");
      if (!activeSession.user.email_confirmed_at) {
        setNotice(
          "Please verify your email using the link we sent before we submit your application.",
        );
        setScreen("login");
        return;
      }
      if (creatingApplication.current) return;
      creatingApplication.current = true;
      try {
        const draft = await readApplicationDraft();
        if (!draft) return;
        const uploadedFiles: { storage_path: string; file_name: string }[] = [];
        for (const file of draft.files) {
          const path = `${activeSession.user.id}/${crypto.randomUUID()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("seller-documents")
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          uploadedFiles.push({ storage_path: path, file_name: file.name });
        }
        const { error: saveError } = await supabase.from("seller_applications").upsert(
          {
            id: activeSession.user.id,
            first_name: draft.firstName,
            middle_name: draft.middleName || null,
            last_name: draft.lastName,
            email: draft.email,
            product_description: draft.description,
            bank_name: draft.bankName,
            bank_account_number: draft.accountNumber,
            status: "pending",
          },
          { onConflict: "id" },
        );
        if (saveError) throw saveError;
        if (uploadedFiles.length) {
          const { error: documentError } = await supabase
            .from("seller_documents")
            .insert(uploadedFiles.map((file) => ({ ...file, seller_id: activeSession.user.id })));
          if (documentError) throw documentError;
        }
        await clearApplicationDraft();
        setSubmitted(true);
        setNotice("Your information is under review, we will be in touch!");
        await loadSellerData(activeSession);
      } finally {
        creatingApplication.current = false;
      }
    },
    [loadSellerData],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingScreen(false), 1050);
    const localDemoAccount = readDemoAccount("seller");
    if (localDemoAccount) {
      setDemoAccount(localDemoAccount);
      setDemoProfile(getDemoProfile(localDemoAccount.email, localDemoAccount.name));
      setBusy(false);
      return () => window.clearTimeout(timer);
    }
    const client = supabase;
    if (!client) {
      setBusy(false);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    const initialize = async () => {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!active) return;
      const currentSession = data.session;
      setSession(currentSession);
      if (currentSession) {
        await loadSellerData(currentSession);
        await createApplication(currentSession);
      }
    };
    void initialize()
      .catch((cause: unknown) => {
        console.error("Could not load the SupreCart seller account.", cause);
        if (active)
          setError(cause instanceof Error ? cause.message : "Could not load seller account.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "SIGNED_IN" && nextSession) {
        setBusy(true);
        void loadSellerData(nextSession)
          .then(() => createApplication(nextSession))
          .catch((cause: unknown) => {
            console.error("Could not load the SupreCart seller account.", cause);
            setError(cause instanceof Error ? cause.message : "Could not load seller account.");
          })
          .finally(() => setBusy(false));
      }
      if (event === "SIGNED_OUT") {
        setApplication(null);
        setStats(null);
        setSubmitted(false);
      }
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [createApplication, loadSellerData]);

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
        files,
      };
      const account = await createLocalAccount({
        email,
        name: `${draft.firstName} ${draft.lastName}`.trim(),
        role: "seller",
        password: String(form.get("password")),
      });
      await saveApplicationDraft(draft);
      saveDemoAccount(account);
      setDemoAccount(account);
      setDemoProfile(getDemoProfile(account.email, account.name));
      setNotice("Your seller account is saved in this browser. No email verification is needed.");
      await clearApplicationDraft();
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
      setDemoAccount(localDemoAccount);
      setDemoProfile(getDemoProfile(localDemoAccount.email, localDemoAccount.name));
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
    setSession(null);
    setApplication(null);
    setStats(null);
    setSubmitted(false);
    setScreen("login");
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !stats) return;
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
      const path = `${session.user.id}/${crypto.randomUUID()}-${image.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, image, { contentType: image.type });
      if (uploadError) throw uploadError;
      const { error: productError } = await supabase.from("products").insert({
        seller_id: session.user.id,
        name: String(form.get("name")).trim(),
        category: String(form.get("category")).trim(),
        description: String(form.get("description")).trim(),
        price: Number(form.get("price")),
        inventory: Number(form.get("inventory")),
        image_path: path,
      });
      if (productError) throw productError;
      formElement.reset();
      await loadSellerData(session);
      setNotice("Product added to your SupreCart listings.");
    } catch (cause) {
      console.error("Could not add the seller's SupreCart product.", cause);
      setError(cause instanceof Error ? cause.message : "Could not add product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError("");
    try {
      const amount = Number(new FormData(formElement).get("amount"));
      const { error: payoutError } = await supabase.rpc("request_seller_payout", {
        requested_amount: amount,
      });
      if (payoutError) throw payoutError;
      await loadSellerData(session);
      setNotice("Payout request submitted for review. Funds have not been transferred.");
      formElement.reset();
    } catch (cause) {
      console.error("Could not request a seller payout.", cause);
      setError(cause instanceof Error ? cause.message : "Could not request payout.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateSellerAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoAccount) {
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name")).trim();
      const phone = String(form.get("phone")).trim();
      if (!name) {
        setError("Enter a display name before saving.");
        return;
      }
      saveDemoProfile(demoAccount.email, { name, phone });
      setDemoProfile({ name, phone });
      setError("");
      setNotice("Demo profile saved in this browser only; no Supabase account was changed.");
      return;
    }
    if (!supabase || !session) {
      setError("Sign in with a Supabase seller account to update account settings.");
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));
    if (!email && !password) {
      setError("Enter a new email address or password to save a change.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    const update: { email?: string; password?: string } = {};
    if (email && email !== session.user.email) update.email = email;
    if (password) update.password = password;
    if (!Object.keys(update).length) {
      setError("No account settings have changed.");
      setSubmitting(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser(update);
    if (updateError) {
      console.error("Could not update seller account settings.", updateError);
      setError(updateError.message);
    } else {
      setNotice(
        update.email
          ? "Check your inbox to confirm the new email address. The current address remains active until confirmation."
          : "Your password has been changed.",
      );
      formElement.reset();
    }
    setSubmitting(false);
  }

  const deliveredOrderIds = useMemo(
    () =>
      new Set(
        (stats?.orders ?? [])
          .filter((order) => order.status === "delivered")
          .map((order) => order.id),
      ),
    [stats?.orders],
  );
  const deliveredItems = useMemo(
    () => (stats?.items ?? []).filter((item) => deliveredOrderIds.has(item.order_id)),
    [deliveredOrderIds, stats?.items],
  );
  const earnings = deliveredItems.reduce((sum, item) => sum + Number(item.seller_net), 0);
  const balance = Math.max(0, earnings - (stats?.committedPayouts ?? 0));
  const soldCount = deliveredItems.reduce((sum, item) => sum + item.quantity, 0);
  const demoStats = useMemo(
    () => (demoAccount ? demoSellerStats(demoAccount.email) : null),
    [demoAccount],
  );
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

  const showDashboard =
    Boolean(demoAccount) || (Boolean(session) && application?.status === "approved");

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
          {session || demoAccount ? (
            <button type="button" className="seller-text-button" onClick={() => void signOut()}>
              <LogOut size={15} /> Sign out
            </button>
          ) : (
            <button
              type="button"
              className="seller-text-button"
              onClick={() => {
                setError("");
                setNotice("");
                setScreen(screen === "apply" ? "login" : "apply");
              }}
            >
              {screen === "apply" ? "Already a seller? Sign in" : "Apply to sell"}
            </button>
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
          {(session || demoAccount) && (
            <a
              className="seller-side-link"
              href={
                demoAccount
                  ? `${marketplaceUrl.replace(/\/$/, "")}/messages?demoEmail=${encodeURIComponent(demoAccount.email)}&demoRole=seller`
                  : `${marketplaceUrl.replace(/\/$/, "")}/messages`
              }
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
          {(session || demoAccount) && (
            <a
              className="seller-side-link"
              href={
                demoAccount
                  ? `${marketplaceUrl.replace(/\/$/, "")}/messages?demoEmail=${encodeURIComponent(demoAccount.email)}&demoRole=seller`
                  : `${marketplaceUrl.replace(/\/$/, "")}/messages`
              }
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
          ) : demoAccount ? (
            <SellerDashboard
              application={{
                id: demoAccount.email,
                first_name:
                  (demoProfile.name || demoAccount.name).split(/\s+/)[0] ?? demoAccount.name,
                middle_name: null,
                last_name: (demoProfile.name || demoAccount.name).split(/\s+/).slice(1).join(" "),
                email: demoAccount.email,
                product_description: "Development-only demo seller",
                status: "approved",
              }}
              stats={demoStats}
              earnings={demoEarnings}
              balance={demoBalance}
              soldCount={demoSoldCount}
              error=""
              notice=""
              submitting={false}
              demoMode
              demoProfile={demoProfile}
              demoFundEntries={demoWalletEntries}
              page={page}
              onNavigate={goToPage}
              onAddProduct={addProduct}
              onRequestPayout={requestPayout}
              onUpdateAccount={updateSellerAccount}
            />
          ) : session && application ? (
            application.status === "approved" ? (
              <SellerDashboard
                application={application}
                stats={stats}
                earnings={earnings}
                balance={balance}
                soldCount={soldCount}
                error={error}
                notice={notice}
                submitting={submitting}
                session={session}
                page={page}
                onNavigate={goToPage}
                onAddProduct={addProduct}
                onRequestPayout={requestPayout}
                onUpdateAccount={updateSellerAccount}
              />
            ) : (
              <ApplicationStatus status={application.status} name={application.first_name} />
            )
          ) : screen === "apply" ? (
            <ApplicationForm
              submitting={submitting}
              error={error}
              notice={notice}
              onSubmit={register}
              onLogin={() => {
                setScreen("login");
                setError("");
                setNotice("");
              }}
            />
          ) : (
            <SignInPanel
              submitting={submitting}
              error={error}
              notice={notice}
              onSubmit={signIn}
              onReset={requestPasswordReset}
              onApply={() => {
                setScreen("apply");
                setError("");
                setNotice("");
              }}
            />
          )}
          <footer className="seller-footer">
            © 2026 SupreCart <span>Built for sellers with something good to share.</span>
          </footer>
        </section>
      </div>
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
            <small>At least 10 characters. Stored in this browser so you can sign in again later.</small>
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
            <input
              name="password"
              type="password"
              autoComplete="current-password"
            />
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
}: {
  status: SellerApplication["status"];
  name: string;
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
          ? "Your application is under review. We’ll email you as soon as there’s an update. You can sign back in here to check the status."
          : "Please check your email for the review details or contact SupreCart support if you have questions."}
      </p>
      <span className={`seller-status-badge ${status}`}>
        {status === "pending" ? "UNDER REVIEW" : "REVIEW COMPLETE"}
      </span>
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
  session = null,
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
  session?: Session | null;
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
    setSettingsNotice("Seller accounts are browser-only, so there are no other sessions to sign out.");
  }

  function removeSellerAccount() {
    setConfirmDelete(false);
    if (demoMode) {
      setSettingsNotice("Demo seller data stays in this browser. Clear site data to remove it.");
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
          this preview. No purchases, payouts, or Supabase records exist.
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
                const image =
                  product.image_url ??
                  supabase?.storage.from("product-images").getPublicUrl(product.image_path).data
                    .publicUrl ??
                  "";
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
                    ? "This local identity is not a Supabase account."
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
                    ? "Remove this demo seller identity from this browser."
                    : "Closing a real seller store is handled by the SupreCart team."}
                </span>
              </div>
              {confirmDelete ? (
                <div className="seller-confirm">
                  <p>
                    {demoMode
                      ? "This clears the demo session and its saved preferences. Continue?"
                      : "Account closure is not connected in this preview. Continue to see more?"}
                  </p>
                  <div className="seller-confirm-actions">
                    <button
                      type="button"
                      className="seller-danger-button"
                      onClick={() => removeSellerAccount()}
                    >
                      <Trash2 size={15} /> {demoMode ? "Remove demo seller" : "Continue"}
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
                  <Trash2 size={15} /> {demoMode ? "Remove demo seller" : "Request store closure"}
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
