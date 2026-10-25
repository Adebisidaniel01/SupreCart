import type { Product } from "./catalog";
import { CONSENT_CHANGE_EVENT, readConsent, type ConsentPreferences } from "./consent";

const measurementId = String(import.meta.env["VITE_GA_MEASUREMENT_ID"] ?? "").trim();
const CURRENCY = "NGN";

export type AnalyticsCartLine = {
  product: Product;
  size: string;
  quantity: number;
};

type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

type EventParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

let initialized = false;
let listening = false;
let enabled = false;

function gtag(...args: unknown[]) {
  window.gtag?.(...args);
}

export function isAnalyticsConfigured(): boolean {
  return measurementId.length > 0;
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

function loadGtagScript() {
  if (typeof document === "undefined" || !measurementId) return;
  if (document.querySelector(`script[data-suprecart-ga="${measurementId}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset["suprecartGa"] = measurementId;
  document.head.appendChild(script);
}

function bootstrap() {
  if (typeof window === "undefined" || !measurementId) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtagCommand(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  gtag("js", new Date());
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  gtag("config", measurementId, {
    send_page_view: false,
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    debug_mode: import.meta.env.DEV,
  });
  loadGtagScript();
}

export function applyAnalyticsConsent(preferences: ConsentPreferences | null) {
  if (typeof window === "undefined") return;
  if (!measurementId) {
    enabled = false;
    return;
  }
  if (preferences?.analytics !== true) {
    enabled = false;
    if (initialized) {
      gtag("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
      });
      window[`ga-disable-${measurementId}`] = true;
    }
    return;
  }
  if (!initialized) {
    bootstrap();
    initialized = true;
  }
  delete window[`ga-disable-${measurementId}`];
  gtag("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  enabled = true;
}

export function initializeAnalytics() {
  if (typeof window === "undefined") return;
  applyAnalyticsConsent(readConsent());
  if (listening) return;
  listening = true;
  window.addEventListener(CONSENT_CHANGE_EVENT, () => {
    applyAnalyticsConsent(readConsent());
  });
}

export function trackEvent(name: string, params: EventParams = {}) {
  if (!enabled || typeof window === "undefined") return;
  gtag("event", name, params);
}

export function trackPageView(path: string, title?: string) {
  if (!enabled || typeof window === "undefined") return;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  trackEvent("page_view", {
    page_path: normalized,
    page_location: `${window.location.origin}${normalized}`,
    page_title: title ?? document.title,
  });
}

function toAnalyticsItem(product: Product, quantity = 1, size?: string): AnalyticsItem {
  return {
    item_id: product.marketplaceProductId ?? String(product.id),
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category,
    price: product.price,
    quantity,
    ...(size && size !== "One size" ? { item_variant: size } : {}),
  };
}

function cartValue(cart: ReadonlyArray<AnalyticsCartLine>): number {
  return cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
}

function cartItems(cart: ReadonlyArray<AnalyticsCartLine>): AnalyticsItem[] {
  return cart.map((line) => toAnalyticsItem(line.product, line.quantity, line.size));
}

export function trackSelectItem(product: Product, listName = "catalog") {
  trackEvent("select_item", {
    item_list_name: listName,
    items: [toAnalyticsItem(product)],
  });
}

export function trackViewItem(product: Product, size?: string) {
  trackEvent("view_item", {
    currency: CURRENCY,
    value: product.price,
    items: [toAnalyticsItem(product, 1, size)],
  });
}

export function trackAddToCart(product: Product, quantity: number, size?: string) {
  trackEvent("add_to_cart", {
    currency: CURRENCY,
    value: product.price * quantity,
    items: [toAnalyticsItem(product, quantity, size)],
  });
}

export function trackRemoveFromCart(product: Product, quantity: number, size?: string) {
  trackEvent("remove_from_cart", {
    currency: CURRENCY,
    value: product.price * quantity,
    items: [toAnalyticsItem(product, quantity, size)],
  });
}

export function trackViewCart(cart: ReadonlyArray<AnalyticsCartLine>) {
  trackEvent("view_cart", {
    currency: CURRENCY,
    value: cartValue(cart),
    items: cartItems(cart),
  });
}

export function trackAddToWishlist(product: Product) {
  trackEvent("add_to_wishlist", {
    currency: CURRENCY,
    value: product.price,
    items: [toAnalyticsItem(product)],
  });
}

export function trackRemoveFromWishlist(product: Product) {
  trackEvent("remove_from_wishlist", {
    currency: CURRENCY,
    value: product.price,
    items: [toAnalyticsItem(product)],
  });
}

export function trackBeginCheckout(cart: ReadonlyArray<AnalyticsCartLine>) {
  trackEvent("begin_checkout", {
    currency: CURRENCY,
    value: cartValue(cart),
    items: cartItems(cart),
  });
}

export function trackAddShippingInfo(
  cart: ReadonlyArray<AnalyticsCartLine>,
  shippingTier: string,
  value = cartValue(cart),
) {
  trackEvent("add_shipping_info", {
    currency: CURRENCY,
    value,
    shipping_tier: shippingTier,
    items: cartItems(cart),
  });
}

export function trackPreviewOrder({
  transactionId,
  cart,
  value,
  tax,
  shipping,
  paymentType,
  deliveryMethod,
}: {
  transactionId: string;
  cart: ReadonlyArray<AnalyticsCartLine>;
  value: number;
  tax: number;
  shipping: number;
  paymentType: string;
  deliveryMethod: string;
}) {
  trackEvent("preview_order_created", {
    transaction_id: transactionId,
    currency: CURRENCY,
    value,
    tax,
    shipping,
    payment_type: paymentType,
    delivery_method: deliveryMethod,
    items: cartItems(cart),
  });
}

export function trackViewSearchResults(term: string, results: number, filter?: string) {
  trackEvent("view_search_results", {
    search_term: term,
    results,
    ...(filter ? { filter } : {}),
  });
}

export function trackFilterProducts(filter: string, results: number) {
  trackEvent("filter_products", {
    filter,
    results,
  });
}

export function trackNewsletterSignup() {
  trackEvent("newsletter_signup", { method: "footer" });
}

export function trackSignUp(method: string) {
  trackEvent("sign_up", { method });
}

export function trackLogin(method: string) {
  trackEvent("login", { method });
}

export function trackContactSeller(product: Product) {
  trackEvent("contact_seller", {
    item_id: product.marketplaceProductId ?? String(product.id),
    item_name: product.name,
    seller: product.seller,
  });
}

export function trackScrollDepth(percent: number, path?: string) {
  trackEvent("scroll_depth", {
    percent,
    ...(path ? { page_path: path } : {}),
  });
}

export function trackOutboundClick(url: string, label?: string) {
  trackEvent("outbound_click", {
    link_url: url,
    ...(label ? { link_text: label.slice(0, 100) } : {}),
  });
}

export function trackException(error: unknown, fatal = false) {
  const description = error instanceof Error ? error.message : String(error);
  trackEvent("exception", { description, fatal });
}
