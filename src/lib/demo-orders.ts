import { isDemoAccountDeleted, updateDemoAccountName } from "./demo-accounts";

export type DemoOrderStatus =
  "Delivered" | "In transit" | "Processing" | "Cancellation requested" | "Cancelled";

export type DemoOrder = {
  id: string;
  status: DemoOrderStatus;
  created_at: string;
  total: number;
  items: string;
  delivery: string;
  source?: "sample" | "checkout";
  cancelled_at?: string;
  cancellation_requested_at?: string;
  cancellation_reason?: string;
};

export const cancellationWindowMs = 24 * 60 * 60 * 1000;

const orderStatusKey = "suprecart-demo-order-status";
const previewOrdersKey = "suprecart-preview-orders";

type StoredOrderStatus = {
  status: "Cancellation requested" | "Cancelled";
  requestedAt: string;
  reason: string;
};

const day = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const hoursAgo = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

const sampleOrders: Record<string, DemoOrder[]> = {
  "blackrose@gmail.com": [
    {
      id: "SC-2026-10482",
      status: "Delivered",
      created_at: day(5),
      total: 185000,
      items: "Nike Air Force 1 '07 · Size 10",
      delivery: "Tanke, Ilorin South",
    },
    {
      id: "SC-2026-09816",
      status: "In transit",
      created_at: day(2),
      total: 52000,
      items: "Studio Ceramic Set · 1 item",
      delivery: "Tanke, Ilorin South",
    },
    {
      id: "SC-2026-08327",
      status: "Delivered",
      created_at: day(24),
      total: 89500,
      items: "Sonora Pocket Speaker · 1 item",
      delivery: "Fate, Ilorin East",
    },
  ],
  "vickybabs@gmail.com": [
    {
      id: "SC-2026-10531",
      status: "Processing",
      created_at: hoursAgo(6),
      total: 71500,
      items: "Botanical Skin Ritual + Serein Daily Hydration",
      delivery: "GRA, Ilorin West",
    },
    {
      id: "SC-2026-09144",
      status: "Delivered",
      created_at: day(13),
      total: 68000,
      items: "Everyday Leather Tote · 1 item",
      delivery: "GRA, Ilorin West",
    },
  ],
  "izzy@gmail.com": [
    {
      id: "SC-2026-10208",
      status: "In transit",
      created_at: day(3),
      total: 320000,
      items: "Air Jordan 4 Retro · Size 9",
      delivery: "Oke-Oyi, Ilorin East",
    },
    {
      id: "SC-2026-08720",
      status: "Delivered",
      created_at: day(20),
      total: 42000,
      items: "Weekend Oxford Shirt · Size L",
      delivery: "Oke-Oyi, Ilorin East",
    },
  ],
  "olowe@gmail.com": [
    {
      id: "SC-2026-10063",
      status: "Delivered",
      created_at: day(7),
      total: 88500,
      items: "Sculpted Stoneware Vase + Hand-thrown Coffee Cups",
      delivery: "Adewole, Ilorin West",
    },
    {
      id: "SC-2026-07652",
      status: "Delivered",
      created_at: day(31),
      total: 46500,
      items: "Ribbed Cotton Knit · Size M",
      delivery: "Adewole, Ilorin West",
    },
  ],
};

function readOrderStatusOverrides(): Record<string, StoredOrderStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(orderStatusKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const overrides: Record<string, StoredOrderStatus> = {};
    for (const [orderId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== "object" || value === null) continue;
      const entry = value as Partial<StoredOrderStatus> & { cancelledAt?: unknown };
      const status =
        entry.status === "Cancellation requested" || entry.status === "Cancelled"
          ? entry.status
          : null;
      const requestedAt =
        typeof entry.requestedAt === "string"
          ? entry.requestedAt
          : typeof entry.cancelledAt === "string"
            ? entry.cancelledAt
            : "";
      if (!status || !requestedAt) continue;
      overrides[orderId] = {
        status,
        requestedAt,
        reason: typeof entry.reason === "string" ? entry.reason : "",
      };
    }
    return overrides;
  } catch (cause) {
    console.error("Could not read the local SupreCart order status changes.", cause);
    return {};
  }
}

function writeOrderStatusOverrides(overrides: Record<string, StoredOrderStatus>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(orderStatusKey, JSON.stringify(overrides));
}

function previewOrderItems(lines: unknown) {
  if (!Array.isArray(lines)) return "Preview checkout order";
  const parts: string[] = [];
  for (const line of lines) {
    if (typeof line !== "object" || line === null) continue;
    const entry = line as {
      product?: { name?: unknown };
      size?: unknown;
      quantity?: unknown;
    };
    const name = typeof entry.product?.name === "string" ? entry.product.name : "";
    if (!name) continue;
    const size = typeof entry.size === "string" && entry.size ? ` · ${entry.size}` : "";
    const quantity = typeof entry.quantity === "number" ? entry.quantity : 1;
    parts.push(`${name}${size} × ${quantity}`);
  }
  return parts.length ? parts.join(", ") : "Preview checkout order";
}

function readCheckoutPreviewOrders(email: string): DemoOrder[] {
  if (typeof window === "undefined") return [];
  const normalized = email.trim().toLowerCase();
  try {
    const raw = window.localStorage.getItem(previewOrdersKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const orders: DemoOrder[] = [];
    for (const value of parsed) {
      if (typeof value !== "object" || value === null) continue;
      const entry = value as Record<string, unknown>;
      if (typeof entry["batchNumber"] !== "string" || !entry["batchNumber"]) continue;
      if (typeof entry["buyerEmail"] !== "string") continue;
      if (entry["buyerEmail"].trim().toLowerCase() !== normalized) continue;
      if (typeof entry["createdAt"] !== "string" || typeof entry["total"] !== "number") continue;
      orders.push({
        id: entry["batchNumber"],
        status: "Processing",
        created_at: entry["createdAt"],
        total: entry["total"],
        items: previewOrderItems(entry["lines"]),
        delivery:
          typeof entry["deliveryDestination"] === "string" && entry["deliveryDestination"]
            ? entry["deliveryDestination"]
            : "Preview checkout",
        source: "checkout",
      });
    }
    return orders;
  } catch (cause) {
    console.error("Could not read the local SupreCart checkout preview orders.", cause);
    return [];
  }
}

export function getDemoOrders(email: string) {
  if (isDemoAccountDeleted(email)) return [];
  const overrides = readOrderStatusOverrides();
  const normalized = email.toLowerCase();
  const sample = (sampleOrders[normalized] ?? []).map((order) => ({
    ...order,
    source: "sample" as const,
  }));
  return [...readCheckoutPreviewOrders(email), ...sample]
    .map((order) => {
      const override = overrides[order.id];
      if (!override) return order;
      return {
        ...order,
        status: override.status,
        cancellation_requested_at: override.requestedAt,
        cancellation_reason: override.reason,
        ...(override.status === "Cancelled" ? { cancelled_at: override.requestedAt } : {}),
      };
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.created_at);
      const bTime = Date.parse(b.created_at);
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
}

export function canCancelDemoOrder(order: DemoOrder, now = Date.now()) {
  if (order.status !== "Processing") return false;
  const placedAt = Date.parse(order.created_at);
  if (!Number.isFinite(placedAt)) return false;
  const elapsed = now - placedAt;
  return elapsed >= 0 && elapsed <= cancellationWindowMs;
}

export function cancelDemoOrder(email: string, orderId: string, reason: string) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new Error("Choose a cancellation reason first.");
  const order = getDemoOrders(email).find((entry) => entry.id === orderId);
  if (!order) throw new Error("That order could not be found in this browser.");
  if (order.status === "Cancellation requested") {
    throw new Error("A cancellation request is already awaiting review for this order.");
  }
  if (order.status !== "Processing") {
    throw new Error(
      "This order can no longer be cancelled because it is already in transit, delivered or cancelled.",
    );
  }
  if (!canCancelDemoOrder(order)) {
    throw new Error("The 24-hour cancellation window for this order has closed.");
  }
  const overrides = readOrderStatusOverrides();
  overrides[orderId] = {
    status: "Cancellation requested",
    requestedAt: new Date().toISOString(),
    reason: trimmedReason,
  };
  writeOrderStatusOverrides(overrides);
  return getDemoOrders(email);
}

export function deleteDemoOrdersFor(email: string) {
  if (typeof window === "undefined") return;
  const normalized = email.trim().toLowerCase();
  const orderIds = new Set((sampleOrders[normalized] ?? []).map((order) => order.id));
  try {
    const raw = window.localStorage.getItem(previewOrdersKey);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const kept: unknown[] = [];
        for (const value of parsed) {
          if (typeof value === "object" && value !== null) {
            const entry = value as Record<string, unknown>;
            if (
              typeof entry["buyerEmail"] === "string" &&
              entry["buyerEmail"].trim().toLowerCase() === normalized
            ) {
              if (typeof entry["batchNumber"] === "string") orderIds.add(entry["batchNumber"]);
              continue;
            }
          }
          kept.push(value);
        }
        if (kept.length !== parsed.length) {
          window.localStorage.setItem(previewOrdersKey, JSON.stringify(kept));
        }
      }
    }
  } catch (cause) {
    console.error("Could not clear the local SupreCart checkout preview orders.", cause);
  }
  const overrides = readOrderStatusOverrides();
  let changed = false;
  for (const orderId of orderIds) {
    if (!overrides[orderId]) continue;
    delete overrides[orderId];
    changed = true;
  }
  if (changed) writeOrderStatusOverrides(overrides);
}

export function getDemoProfile(email: string, fallbackName: string) {
  try {
    const saved = window.localStorage.getItem(`suprecart-demo-profile:${email.toLowerCase()}`);
    if (!saved) return { name: fallbackName, phone: "" };
    const profile = JSON.parse(saved) as { name?: unknown; phone?: unknown };
    return {
      name: typeof profile.name === "string" && profile.name.trim() ? profile.name : fallbackName,
      phone: typeof profile.phone === "string" ? profile.phone : "",
    };
  } catch (cause) {
    console.error("Could not read the local SupreCart demo profile.", cause);
    return { name: fallbackName, phone: "" };
  }
}

export function saveDemoProfile(email: string, profile: { name: string; phone: string }) {
  try {
    window.localStorage.setItem(
      `suprecart-demo-profile:${email.toLowerCase()}`,
      JSON.stringify(profile),
    );
  } catch (cause) {
    console.error("Could not save the local SupreCart demo profile.", cause);
  }
  updateDemoAccountName(email, profile.name);
}

export function deleteDemoProfile(email: string) {
  window.localStorage.removeItem(`suprecart-demo-profile:${email.toLowerCase()}`);
}
