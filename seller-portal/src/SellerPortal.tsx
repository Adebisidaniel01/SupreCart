import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Box,
  CircleDollarSign,
  Clock3,
  LogOut,
  MessageCircle,
  PackagePlus,
  ShieldCheck,
  Star,
  Store,
  Upload,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../src/lib/supabase";
import {
  clearDemoAccount,
  findDemoAccount,
  getDemoAccounts,
  readDemoAccount,
  saveDemoAccount,
  type DemoAccount,
} from "../../src/lib/demo-accounts";
import "./seller.css";

type SellerApplication = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  product_description: string;
  status: "pending" | "approved" | "rejected";
};

type SellerProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  published: boolean;
  image_path: string;
  created_at: string;
};

type Rating = { product_id: string; review_count: number; average_rating: number };

type SellerStats = {
  orders: { id: string; status: string }[];
  items: { quantity: number; seller_net: number; product_id: string; order_id: string }[];
  products: SellerProduct[];
  ratings: Rating[];
  committedPayouts: number;
};

const fileTypes = ["image/jpeg", "image/png", "application/pdf"];
const productImageTypes = ["image/jpeg", "image/png", "image/webp"];
const marketplaceUrl = import.meta.env["VITE_MARKETPLACE_URL"] || "/";
const configuredAuthRedirectUrl = import.meta.env["VITE_SELLER_AUTH_REDIRECT_URL"]?.trim();

function sellerAuthRedirectUrl() {
  if (configuredAuthRedirectUrl) {
    const redirectUrl = new URL(configuredAuthRedirectUrl);
    if (
      redirectUrl.protocol !== "https:" &&
      !(
        redirectUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(redirectUrl.hostname)
      )
    ) {
      throw new Error("Seller auth redirect URL must use HTTPS, except for localhost development.");
    }
    return redirectUrl.toString();
  }

  const callbackPath = window.location.pathname.startsWith("/sellers") ? "/sellers" : "/";
  return new URL(callbackPath, window.location.origin).toString();
}

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

export default function SellerPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [screen, setScreen] = useState<"login" | "apply">("apply");
  const [demoAccount, setDemoAccount] = useState<DemoAccount | null>(null);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const creatingApplication = useRef(false);

  const loadSellerData = useCallback(async (activeSession: Session) => {
    if (!supabase) return;
    const { data, error: applicationError } = await supabase
      .from("seller_applications")
      .select("id, first_name, middle_name, last_name, email, product_description, status")
      .eq("id", activeSession.user.id)
      .maybeSingle();
    if (applicationError) throw applicationError;
    const seller = data as SellerApplication | null;
    setApplication(seller);
    if (!seller || seller.status !== "approved") {
      setStats(null);
      return;
    }
    const [ordersResult, itemsResult, productsResult, ratingsResult, payoutsResult] =
      await Promise.all([
        supabase.from("orders").select("id, status"),
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
    if (!supabase)
      return setError("Account service is temporarily unavailable. Please try again later.");
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
      await saveApplicationDraft(draft);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: String(form.get("password")),
        options: {
          data: { first_name: draft.firstName, last_name: draft.lastName, role: "seller" },
          emailRedirectTo: sellerAuthRedirectUrl(),
        },
      });
      if (signUpError) throw signUpError;
      if (!data.session) {
        setNotice(
          `Check ${email} and open the verification link in this browser. You’ll return to SupreCart Seller Studio and your application will finish automatically.`,
        );
        setScreen("login");
        return;
      }
      setSession(data.session);
      await createApplication(data.session);
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
      if (localDemoAccount) {
        saveDemoAccount(localDemoAccount);
        setDemoAccount(localDemoAccount);
        setNotice("");
        setBusy(false);
        return;
      }
      const password = String(form.get("password"));
      if (import.meta.env.DEV && !password) {
        throw new Error(
          "Enter a listed demo seller email, or provide a password for a Supabase account.",
        );
      }
      if (!supabase)
        return setError("Account service is temporarily unavailable. Please try again later.");
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      setSession(data.session);
      await loadSellerData(data.session);
      await createApplication(data.session);
    } catch (cause) {
      console.error("Could not sign in to the SupreCart seller portal.", cause);
      const nextError = cause instanceof Error ? cause.message : "Could not sign in.";
      if (nextError.toLowerCase().includes("email not confirmed")) {
        const email = String(new FormData(event.currentTarget).get("email")).trim().toLowerCase();
        setConfirmationEmail(email);
        setNotice("Your seller account exists, but it still needs email confirmation.");
      }
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  }

  async function resendConfirmationEmail(email: string) {
    if (!supabase) {
      setError("Account service is temporarily unavailable. Please try again later.");
      return;
    }
    setError("");
    setNotice("");
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
      if (resendError) throw resendError;
      setNotice(`A new confirmation email was sent to ${email}. Open it to confirm your account.`);
      setConfirmationEmail(email);
    } catch (cause) {
      console.error("Could not resend a seller confirmation email.", cause);
      setError(
        cause instanceof Error ? cause.message : "Could not send a fresh confirmation email.",
      );
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase)
      return setError("Account service is temporarily unavailable. Please try again later.");
    const email = String(new FormData(event.currentTarget).get("email")).trim().toLowerCase();
    setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: sellerAuthRedirectUrl(),
      });
      if (resetError) throw resetError;
      setNotice(
        "If that address belongs to a seller account, a password reset link is on its way.",
      );
    } catch (cause) {
      console.error("Could not send a seller password reset email.", cause);
      setError(cause instanceof Error ? cause.message : "Could not send a password reset email.");
    }
  }

  async function signOut() {
    if (demoAccount) {
      clearDemoAccount();
      setDemoAccount(null);
      setApplication(null);
      setStats(null);
      setSubmitted(false);
      setScreen("login");
      return;
    }
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Could not sign out of the SupreCart seller portal.", signOutError);
      setError(signOutError.message);
    } else {
      setSession(null);
      setApplication(null);
      setStats(null);
      setSubmitted(false);
    }
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

  if (loadingScreen) return <SellerLoadingScreen />;

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
          <a className={`seller-side-link ${!application ? "active" : ""}`} href="#seller-content">
            <Box size={16} /> Overview
          </a>
          <a className="seller-side-link" href="#seller-products">
            <PackagePlus size={16} /> Products
          </a>
          <a className="seller-side-link" href="#seller-payouts">
            <CircleDollarSign size={16} /> Payouts
          </a>
          {session && (
            <a className="seller-side-link" href={`${marketplaceUrl.replace(/\/$/, "")}/messages`}>
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
          ) : demoAccount ? (
            <SellerDashboard
              application={{
                id: demoAccount.email,
                first_name: demoAccount.name.split(/\s+/)[0] ?? demoAccount.name,
                middle_name: null,
                last_name: demoAccount.name.split(/\s+/).slice(1).join(" "),
                email: demoAccount.email,
                product_description: "Development-only demo seller",
                status: "approved",
              }}
              stats={{ orders: [], items: [], products: [], ratings: [], committedPayouts: 0 }}
              earnings={0}
              balance={0}
              soldCount={0}
              error=""
              notice=""
              submitting={false}
              demoMode
              onAddProduct={addProduct}
              onRequestPayout={requestPayout}
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
                onAddProduct={addProduct}
                onRequestPayout={requestPayout}
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
              confirmationEmail={confirmationEmail}
              onSubmit={signIn}
              onReset={requestPasswordReset}
              onResendConfirmation={() => void resendConfirmationEmail(confirmationEmail)}
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
            <small>At least 10 characters. Use a unique password you haven’t used elsewhere.</small>
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
            <input name="bankName" autoComplete="off" required />
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
  confirmationEmail,
  onSubmit,
  onReset,
  onResendConfirmation,
  onApply,
}: {
  submitting: boolean;
  error: string;
  notice: string;
  confirmationEmail: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: (event: FormEvent<HTMLFormElement>) => void;
  onResendConfirmation: () => void;
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
              required={!import.meta.env.DEV}
            />
            {import.meta.env.DEV && (
              <small>
                For a listed demo seller, leave this blank. Otherwise use your Supabase password.
              </small>
            )}
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
          {error.toLowerCase().includes("email not confirmed") && confirmationEmail && (
            <button
              type="button"
              className="seller-secondary-button seller-field-full"
              onClick={onResendConfirmation}
            >
              Resend confirmation email
            </button>
          )}
          <button
            className="seller-primary-button seller-field-full"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
          </button>
        </form>
        {import.meta.env.DEV && (
          <p className="seller-form-notice">
            Local demo sellers (no password or email verification):
            {getDemoAccounts("seller").map((account) => (
              <span key={account.email}>
                <br />
                {account.name} — {account.email}
              </span>
            ))}
          </p>
        )}
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
  demoMode = false,
  onAddProduct,
  onRequestPayout,
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
  onAddProduct: (event: FormEvent<HTMLFormElement>) => void;
  onRequestPayout: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);
  const ratings = stats?.ratings ?? [];
  const average = ratings.length
    ? ratings.reduce((sum, rating) => sum + Number(rating.average_rating), 0) / ratings.length
    : 0;
  return (
    <div className="seller-dashboard">
      <div className="seller-dashboard-topline">
        <p className="seller-eyebrow">{demoMode ? "LOCAL DEMO DASHBOARD" : "YOUR SELLER STUDIO"}</p>
        <span className="seller-approved">
          <BadgeCheck size={14} /> {demoMode ? "DEMO ACCOUNT" : "VERIFIED SELLER"}
        </span>
      </div>
      {demoMode && (
        <p className="seller-form-notice" role="status">
          Development-only preview. No Supabase account, products, orders, or financial records are
          connected to this demo.
        </p>
      )}
      <div className="seller-dashboard-heading">
        <div>
          <h1>Good to see you, {application.first_name}.</h1>
          <p>
            {demoMode
              ? "Demo metrics only — real seller data is not loaded."
              : "Here’s how your shop is doing today."}
          </p>
        </div>
        {!demoMode && (
          <button
            className="seller-primary-button"
            type="button"
            onClick={() => setProductFormOpen((open) => !open)}
          >
            <PackagePlus size={16} /> Add a product
          </button>
        )}
      </div>
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
      <div className="seller-metric-grid">
        <article className="seller-metric-card seller-metric-balance">
          <span>AVAILABLE TO REQUEST</span>
          <strong>{formatMoney(balance)}</strong>
          <small>For orders marked delivered</small>
          <CircleDollarSign size={20} />
        </article>
        <article className="seller-metric-card">
          <span>TOTAL EARNED</span>
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
          <form className="seller-product-form" onSubmit={onAddProduct}>
            <label>
              Product name
              <input name="name" maxLength={120} required />
            </label>
            <label>
              Category
              <input name="category" maxLength={50} placeholder="Fashion, home, beauty…" required />
            </label>
            <label>
              Price (NGN)
              <input name="price" type="number" min="1" step="0.01" required />
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
              const image = supabase?.storage
                .from("product-images")
                .getPublicUrl(product.image_path).data.publicUrl;
              return (
                <article className="seller-product-row" key={product.id}>
                  <img src={image} alt="" />
                  <div className="seller-product-name">
                    <strong>{product.name}</strong>
                    <span>{product.category}</span>
                  </div>
                  <span>{formatMoney(Number(product.price))}</span>
                  <span>{product.inventory} in stock</span>
                  <span className="seller-product-rating">
                    <Star size={13} fill="currentColor" />{" "}
                    {rating ? Number(rating.average_rating).toFixed(1) : "New"}
                  </span>
                  <span className={`seller-product-state ${product.published ? "published" : ""}`}>
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
            <strong>Request a payout</strong>
            <span>
              Delivered-order earnings, less applicable fees. Requests are reviewed before any
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
              Request funds <ArrowRight size={15} />
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
      </section>
    </div>
  );
}
