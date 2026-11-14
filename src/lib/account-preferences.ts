import { cleanMultiline, cleanText } from "./input";
import { sanitizeImageDataUrl } from "./image-safety";

export type NotificationPreferences = {
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
  securityAlerts: boolean;
};

export type StoreProfilePreferences = {
  storeName: string;
  tagline: string;
  description: string;
  logoDataUrl: string;
};

export type FulfilmentPreferences = {
  processingTime: string;
  shippingOptions: string[];
  openingHours: string;
};

export type AccountPreferences = {
  avatarDataUrl: string;
  notifications: NotificationPreferences;
  twoFactorEnabled: boolean;
  store: StoreProfilePreferences;
  fulfilment: FulfilmentPreferences;
};

export const processingTimeOptions = [
  "1–2 business days",
  "3–5 business days",
  "1–2 weeks",
  "Made to order",
] as const;
export type ShippingOption = {
  id: string;
  label: string;
  description: string;
};

export const shippingOptionsCatalog: readonly ShippingOption[] = [
  {
    id: "doorstep",
    label: "Doorstep delivery",
    description: "Courier brings the order to the buyer's address.",
  },
  {
    id: "pickup-station",
    label: "Pickup station",
    description: "Buyer collects from a nearby SupreCart pickup point.",
  },
  {
    id: "local-pickup",
    label: "Local pickup",
    description: "Buyer collects directly from your shop.",
  },
  {
    id: "nationwide-courier",
    label: "Nationwide courier",
    description: "3–5 business days to anywhere in Nigeria.",
  },
  {
    id: "express",
    label: "Express delivery",
    description: "Priority 1–2 day delivery within major cities.",
  },
  {
    id: "interstate",
    label: "Inter-state delivery",
    description: "Delivery to another state via a logistics partner.",
  },
  {
    id: "park-waybill",
    label: "Bus / park waybill",
    description: "Buyer receives the order through a motor-park waybill.",
  },
  {
    id: "free-shipping",
    label: "Free shipping",
    description: "You cover delivery on qualifying orders.",
  },
];

export const shippingOptionChoices: readonly string[] = shippingOptionsCatalog.map(
  (option) => option.label,
);

export const shippingOptionDescription = (label: string) =>
  shippingOptionsCatalog.find((option) => option.label === label)?.description ?? "";

export function defaultAccountPreferences(): AccountPreferences {
  return {
    avatarDataUrl: "",
    notifications: {
      orderUpdates: true,
      promotions: false,
      newsletter: false,
      securityAlerts: true,
    },
    twoFactorEnabled: false,
    store: {
      storeName: "",
      tagline: "",
      description: "",
      logoDataUrl: "",
    },
    fulfilment: {
      processingTime: "1–2 business days",
      shippingOptions: ["Doorstep delivery"],
      openingHours: "",
    },
  };
}

const storagePrefix = "suprecart-account-preferences:";
const preferencesChangeEvent = "suprecart-account-preferences-change";

const shippingLabels = new Set(shippingOptionChoices);
const processingTimes = new Set<string>(processingTimeOptions);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePreferences(value: unknown): AccountPreferences {
  const defaults = defaultAccountPreferences();
  const parsed = asRecord(value);
  const notifications = asRecord(parsed["notifications"]);
  const store = asRecord(parsed["store"]);
  const fulfilment = asRecord(parsed["fulfilment"]);
  const savedShipping = fulfilment["shippingOptions"];
  const shippingOptions = Array.isArray(savedShipping)
    ? savedShipping
        .filter((entry): entry is string => typeof entry === "string" && shippingLabels.has(entry))
        .slice(0, shippingOptionChoices.length)
    : defaults.fulfilment.shippingOptions;
  const processingTime = fulfilment["processingTime"];

  return {
    avatarDataUrl: sanitizeImageDataUrl(parsed["avatarDataUrl"]),
    notifications: {
      orderUpdates: readBoolean(notifications["orderUpdates"], defaults.notifications.orderUpdates),
      promotions: readBoolean(notifications["promotions"], defaults.notifications.promotions),
      newsletter: readBoolean(notifications["newsletter"], defaults.notifications.newsletter),
      securityAlerts: readBoolean(
        notifications["securityAlerts"],
        defaults.notifications.securityAlerts,
      ),
    },
    twoFactorEnabled: readBoolean(parsed["twoFactorEnabled"], defaults.twoFactorEnabled),
    store: {
      storeName: cleanText(store["storeName"], 120),
      tagline: cleanText(store["tagline"], 160),
      description: cleanMultiline(store["description"], 1_000),
      logoDataUrl: sanitizeImageDataUrl(store["logoDataUrl"]),
    },
    fulfilment: {
      processingTime:
        typeof processingTime === "string" && processingTimes.has(processingTime)
          ? processingTime
          : defaults.fulfilment.processingTime,
      shippingOptions: shippingOptions.length
        ? shippingOptions
        : defaults.fulfilment.shippingOptions,
      openingHours: cleanText(fulfilment["openingHours"], 160),
    },
  };
}

const clone = (value: AccountPreferences): AccountPreferences =>
  JSON.parse(JSON.stringify(normalizePreferences(value)));

export function accountPreferenceScope(role: "buyer" | "seller", identity: string) {
  return `${role}:${identity.trim().toLowerCase()}`;
}

export function readAccountPreferences(scope: string): AccountPreferences {
  const preferences = defaultAccountPreferences();
  if (typeof window === "undefined") return preferences;
  try {
    const saved = window.localStorage.getItem(`${storagePrefix}${scope.toLowerCase()}`);
    if (!saved) return preferences;
    return normalizePreferences(JSON.parse(saved));
  } catch (cause) {
    console.error("Could not read the saved SupreCart account preferences.", cause);
    return preferences;
  }
}

export function saveAccountPreferences(scope: string, preferences: AccountPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${storagePrefix}${scope.toLowerCase()}`,
      JSON.stringify(clone(preferences)),
    );
    window.dispatchEvent(new Event(preferencesChangeEvent));
  } catch (cause) {
    console.error("Could not save the SupreCart account preferences.", cause);
  }
}

export function clearAccountPreferences(scope: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${storagePrefix}${scope.toLowerCase()}`);
  window.dispatchEvent(new Event(preferencesChangeEvent));
}

export function subscribeAccountPreferences(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(storagePrefix)) listener();
  };
  window.addEventListener(preferencesChangeEvent, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(preferencesChangeEvent, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function accountAvatar(account: { email: string; role: "buyer" | "seller" }) {
  return readAccountPreferences(accountPreferenceScope(account.role, account.email)).avatarDataUrl;
}
