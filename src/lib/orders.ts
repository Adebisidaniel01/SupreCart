import { isAccountDeleted, updateAccountName } from "./accounts";
import { calculateCommission } from "./commission";
import { cleanPhone, cleanText } from "./input";

export type OrderStatus =
  "Delivered" | "In transit" | "Processing" | "Cancellation requested" | "Cancelled";

export type OrderSettlementStatus = "held" | "released";

export type OrderSettlement = {
  seller: string;
  gross: number;
  commission: number;
  sellerNet: number;
  status: OrderSettlementStatus;
  releasedAt?: string;
};

export type OrderFundsSummary = {
  gross: number;
  commission: number;
  sellerNet: number;
  held: number;
  released: number;
  heldGross: number;
  releasedGross: number;
  status: "held" | "released" | "partial" | "none";
};

export type Order = {
  id: string;
  status: OrderStatus;
  created_at: string;
  total: number;
  items: string;
  delivery: string;
  source?: "seeded" | "checkout";
  cancelled_at?: string;
  cancellation_requested_at?: string;
  cancellation_reason?: string;
  delivery_confirmed_at?: string;
  funds_released_at?: string;
  settlements?: OrderSettlement[];
};

export type SettlementInputLine = {
  product: { seller: string; price: number };
  quantity: number;
  subtotal?: number;
};

export const cancellationWindowMs = 24 * 60 * 60 * 1000;

const orderStatusKey = "suprecart-order-status";
const checkoutOrdersKey = "suprecart-checkout-orders";
const orderStatuses: OrderStatus[] = [
  "Delivered",
  "In transit",
  "Processing",
  "Cancellation requested",
  "Cancelled",
];

type StoredOrderStatus = {
  status?: OrderStatus;
  requestedAt?: string;
  reason?: string;
  deliveryConfirmedAt?: string;
  fundsReleasedAt?: string;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function settlementForSeller(
  seller: string,
  gross: number,
  status: OrderSettlementStatus = "held",
  releasedAt?: string,
): OrderSettlement {
  const safeGross = Number.isFinite(gross) && gross > 0 ? roundMoney(gross) : 0;
  const breakdown = calculateCommission(safeGross);
  return {
    seller,
    gross: safeGross,
    commission: breakdown.commission,
    sellerNet: breakdown.sellerNet,
    status,
    ...(releasedAt ? { releasedAt } : {}),
  };
}

export function createOrderSettlements(lines: SettlementInputLine[]): OrderSettlement[] {
  const grouped = new Map<string, { gross: number; commission: number; sellerNet: number }>();
  for (const line of lines) {
    const seller = line.product.seller.trim();
    if (!seller) continue;
    const quantity = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1;
    const unitPrice =
      Number.isFinite(line.product.price) && line.product.price > 0 ? line.product.price : 0;
    const gross =
      typeof line.subtotal === "number" && Number.isFinite(line.subtotal)
        ? line.subtotal
        : unitPrice * quantity;
    const breakdown = calculateCommission(unitPrice);
    const current = grouped.get(seller) ?? { gross: 0, commission: 0, sellerNet: 0 };
    current.gross += gross;
    current.commission += breakdown.commission * quantity;
    current.sellerNet += breakdown.sellerNet * quantity;
    grouped.set(seller, current);
  }
  return [...grouped.entries()].map(([seller, value]) => ({
    seller,
    gross: roundMoney(value.gross),
    commission: roundMoney(value.commission),
    sellerNet: roundMoney(value.sellerNet),
    status: "held" as const,
  }));
}

export function summarizeOrderFunds(order: Order): OrderFundsSummary {
  const settlements = order.settlements ?? [];
  const summary = settlements.reduce(
    (totals, settlement) => {
      const gross = Number.isFinite(settlement.gross) ? settlement.gross : 0;
      const commission = Number.isFinite(settlement.commission) ? settlement.commission : 0;
      const sellerNet = Number.isFinite(settlement.sellerNet) ? settlement.sellerNet : 0;
      totals.gross += gross;
      totals.commission += commission;
      totals.sellerNet += sellerNet;
      if (settlement.status === "released") {
        totals.released += sellerNet;
        totals.releasedGross += gross;
      } else {
        totals.held += sellerNet;
        totals.heldGross += gross;
      }
      return totals;
    },
    {
      gross: 0,
      commission: 0,
      sellerNet: 0,
      held: 0,
      released: 0,
      heldGross: 0,
      releasedGross: 0,
    },
  );
  const status: OrderFundsSummary["status"] = !settlements.length
    ? "none"
    : summary.released > 0 && summary.held > 0
      ? "partial"
      : summary.released > 0
        ? "released"
        : "held";
  return {
    gross: roundMoney(summary.gross),
    commission: roundMoney(summary.commission),
    sellerNet: roundMoney(summary.sellerNet),
    held: roundMoney(summary.held),
    released: roundMoney(summary.released),
    heldGross: roundMoney(summary.heldGross),
    releasedGross: roundMoney(summary.releasedGross),
    status,
  };
}

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

const seededOrders: Record<string, Order[]> = {
  "blackrose@gmail.com": [
    {
      id: "SC-2026-10482",
      status: "Delivered",
      created_at: day(5),
      total: 185000,
      items: "Nike Air Force 1 '07 · Size 10",
      delivery: "Tanke, Ilorin South",
      settlements: [settlementForSeller("The Sole House", 185000)],
    },
    {
      id: "SC-2026-09816",
      status: "In transit",
      created_at: day(2),
      total: 52000,
      items: "Dorm Bedding Set · 1 item",
      delivery: "Tanke, Ilorin South",
      settlements: [settlementForSeller("Dorm Depot", 52000)],
    },
    {
      id: "SC-2026-08327",
      status: "Delivered",
      created_at: day(24),
      total: 89500,
      items: "Sonora Pocket Speaker · 1 item",
      delivery: "Fate, Ilorin East",
      settlements: [settlementForSeller("Sound House Lagos", 89500)],
    },
  ],
  "vickybabs@gmail.com": [
    {
      id: "SC-2026-10531",
      status: "Processing",
      created_at: hoursAgo(6),
      total: 71500,
      items: "Everyday Sunscreen SPF 50 + Serein Daily Hydration",
      delivery: "GRA, Ilorin West",
      settlements: [settlementForSeller("Serein Beauty", 71500)],
    },
    {
      id: "SC-2026-09144",
      status: "Delivered",
      created_at: day(13),
      total: 68000,
      items: "North Campus Backpack · 1 item",
      delivery: "GRA, Ilorin West",
      settlements: [settlementForSeller("The Study Store", 68000)],
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
      settlements: [settlementForSeller("Lace & Legacy", 320000)],
    },
    {
      id: "SC-2026-08720",
      status: "Delivered",
      created_at: day(20),
      total: 42000,
      items: "Oversized Study Tee · Size L",
      delivery: "Oke-Oyi, Ilorin East",
      settlements: [settlementForSeller("UniWear Lagos", 42000)],
    },
  ],
  "olowe@gmail.com": [
    {
      id: "SC-2026-10063",
      status: "Delivered",
      created_at: day(7),
      total: 88500,
      items: "LED Study Desk Lamp + A5 Study Notebook Set",
      delivery: "Adewole, Ilorin West",
      settlements: [
        settlementForSeller("Dorm Depot", 22500),
        settlementForSeller("The Study Store", 66000),
      ],
    },
    {
      id: "SC-2026-07652",
      status: "Delivered",
      created_at: day(31),
      total: 46500,
      items: "Ribbed Cotton Knit · Size M",
      delivery: "Adewole, Ilorin West",
      settlements: [settlementForSeller("North & Loom", 46500)],
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
      const status = orderStatuses.find((candidate) => candidate === entry.status);
      const requestedAt =
        typeof entry.requestedAt === "string"
          ? entry.requestedAt
          : typeof entry.cancelledAt === "string"
            ? entry.cancelledAt
            : "";
      const deliveryConfirmedAt =
        typeof entry.deliveryConfirmedAt === "string" ? entry.deliveryConfirmedAt : "";
      const fundsReleasedAt =
        typeof entry.fundsReleasedAt === "string" ? entry.fundsReleasedAt : "";
      if (!status && !deliveryConfirmedAt && !fundsReleasedAt) continue;
      overrides[orderId] = {
        ...(status ? { status } : {}),
        ...(requestedAt ? { requestedAt } : {}),
        reason: cleanText(entry.reason, 300),
        ...(deliveryConfirmedAt ? { deliveryConfirmedAt } : {}),
        ...(fundsReleasedAt ? { fundsReleasedAt } : {}),
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

function checkoutOrderItems(lines: unknown) {
  if (!Array.isArray(lines)) return "Checkout order";
  const parts: string[] = [];
  for (const line of lines.slice(0, 100)) {
    if (typeof line !== "object" || line === null) continue;
    const entry = line as {
      product?: { name?: unknown };
      size?: unknown;
      quantity?: unknown;
    };
    const name = cleanText(entry.product?.name, 160);
    if (!name) continue;
    const size = typeof entry.size === "string" && entry.size ? ` · ${entry.size}` : "";
    const quantity =
      typeof entry.quantity === "number" && Number.isFinite(entry.quantity) && entry.quantity > 0
        ? Math.min(Math.floor(entry.quantity), 999)
        : 1;
    parts.push(`${name}${size} × ${quantity}`);
  }
  return parts.length ? parts.join(", ") : "Checkout order";
}

function readSettlements(value: unknown): OrderSettlement[] {
  if (!Array.isArray(value)) return [];
  const settlements: OrderSettlement[] = [];
  for (const item of value.slice(0, 50)) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Partial<OrderSettlement>;
    const seller = cleanText(entry.seller, 120);
    if (!seller) continue;
    if (
      typeof entry.gross !== "number" ||
      !Number.isFinite(entry.gross) ||
      typeof entry.commission !== "number" ||
      !Number.isFinite(entry.commission) ||
      typeof entry.sellerNet !== "number" ||
      !Number.isFinite(entry.sellerNet)
    ) {
      continue;
    }
    const status: OrderSettlementStatus = entry.status === "released" ? "released" : "held";
    settlements.push({
      seller,
      gross: entry.gross,
      commission: entry.commission,
      sellerNet: entry.sellerNet,
      status,
      ...(typeof entry.releasedAt === "string"
        ? { releasedAt: cleanText(entry.releasedAt, 40) }
        : {}),
    });
  }
  return settlements;
}

function checkoutOrderSettlements(lines: unknown, stored: unknown) {
  const saved = readSettlements(stored);
  if (saved.length) return saved;
  if (!Array.isArray(lines)) return [];
  const settlementLines: SettlementInputLine[] = [];
  for (const value of lines) {
    if (typeof value !== "object" || value === null) continue;
    const entry = value as {
      product?: { seller?: unknown; price?: unknown };
      quantity?: unknown;
      subtotal?: unknown;
    };
    if (typeof entry.product?.seller !== "string") continue;
    if (typeof entry.product.price !== "number") continue;
    settlementLines.push({
      product: { seller: entry.product.seller, price: entry.product.price },
      quantity: typeof entry.quantity === "number" ? entry.quantity : 1,
      ...(typeof entry.subtotal === "number" ? { subtotal: entry.subtotal } : {}),
    });
  }
  return createOrderSettlements(settlementLines);
}

function readCheckoutOrders(email: string): Order[] {
  if (typeof window === "undefined") return [];
  const normalized = email.trim().toLowerCase();
  try {
    const raw = window.localStorage.getItem(checkoutOrdersKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const orders: Order[] = [];
    for (const value of parsed.slice(-200)) {
      if (typeof value !== "object" || value === null) continue;
      const entry = value as Record<string, unknown>;
      const batchNumber = cleanText(entry["batchNumber"], 80);
      const buyerEmail = cleanText(entry["buyerEmail"], 254).toLowerCase();
      const createdAt = cleanText(entry["createdAt"], 40);
      const total = entry["total"];
      if (!batchNumber || buyerEmail !== normalized) continue;
      if (!createdAt || !Number.isFinite(Date.parse(createdAt))) continue;
      if (typeof total !== "number" || !Number.isFinite(total) || total < 0) continue;
      orders.push({
        id: batchNumber,
        status: "Processing",
        created_at: createdAt,
        total,
        items: checkoutOrderItems(entry["lines"]),
        delivery: cleanText(entry["deliveryDestination"], 400) || "Checkout",
        source: "checkout",
        settlements: checkoutOrderSettlements(entry["lines"], entry["settlements"]),
      });
    }
    return orders;
  } catch (cause) {
    console.error("Could not read the local SupreCart checkout orders.", cause);
    return [];
  }
}

export function getOrders(email: string) {
  if (isAccountDeleted(email)) return [];
  const overrides = readOrderStatusOverrides();
  const normalized = email.trim().toLowerCase();
  const seeded = (seededOrders[normalized] ?? []).map((order) => ({
    ...order,
    source: "seeded" as const,
  }));
  return [...readCheckoutOrders(email), ...seeded]
    .map((order) => {
      const override = overrides[order.id];
      if (!override) return order;
      const fundsReleasedAt = override.fundsReleasedAt;
      const settlements = fundsReleasedAt
        ? order.settlements?.map((settlement) => ({
            ...settlement,
            status: "released" as const,
            releasedAt: fundsReleasedAt,
          }))
        : order.settlements;
      return {
        ...order,
        ...(override.status ? { status: override.status } : {}),
        ...(override.requestedAt ? { cancellation_requested_at: override.requestedAt } : {}),
        ...(override.reason ? { cancellation_reason: override.reason } : {}),
        ...(override.status === "Cancelled" && override.requestedAt
          ? { cancelled_at: override.requestedAt }
          : {}),
        ...(override.deliveryConfirmedAt
          ? { delivery_confirmed_at: override.deliveryConfirmedAt }
          : {}),
        ...(fundsReleasedAt ? { funds_released_at: fundsReleasedAt } : {}),
        ...(settlements ? { settlements } : {}),
      };
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.created_at);
      const bTime = Date.parse(b.created_at);
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
}

export function canCancelOrder(order: Order, now = Date.now()) {
  if (order.status !== "Processing") return false;
  const placedAt = Date.parse(order.created_at);
  if (!Number.isFinite(placedAt)) return false;
  const elapsed = now - placedAt;
  return elapsed >= 0 && elapsed <= cancellationWindowMs;
}

export function cancelOrder(email: string, orderId: string, reason: string) {
  const trimmedReason = cleanText(reason, 300);
  if (!trimmedReason) throw new Error("Choose a cancellation reason first.");
  const order = getOrders(email).find((entry) => entry.id === orderId);
  if (!order) throw new Error("That order could not be found in this browser.");
  if (order.status === "Cancellation requested") {
    throw new Error("A cancellation request is already awaiting review for this order.");
  }
  if (order.status !== "Processing") {
    throw new Error(
      "This order can no longer be cancelled because it is already in transit, delivered or cancelled.",
    );
  }
  if (!canCancelOrder(order)) {
    throw new Error("The 24-hour cancellation window for this order has closed.");
  }
  const overrides = readOrderStatusOverrides();
  overrides[orderId] = {
    status: "Cancellation requested",
    requestedAt: new Date().toISOString(),
    reason: trimmedReason,
  };
  writeOrderStatusOverrides(overrides);
  return getOrders(email);
}

export function canConfirmOrderDelivery(order: Order) {
  if (order.funds_released_at) return false;
  return order.status === "In transit" || order.status === "Delivered";
}

export function confirmOrderDelivery(email: string, orderId: string) {
  const order = getOrders(email).find((entry) => entry.id === orderId);
  if (!order) throw new Error("That order could not be found in this browser.");
  if (order.funds_released_at) {
    throw new Error("Delivery is already confirmed and this escrow record is released.");
  }
  if (order.status === "Cancelled" || order.status === "Cancellation requested") {
    throw new Error("A cancelled order cannot be confirmed as received.");
  }
  if (!canConfirmOrderDelivery(order)) {
    throw new Error("You can confirm receipt once the package is in transit or delivered.");
  }
  const now = new Date().toISOString();
  const overrides = readOrderStatusOverrides();
  overrides[orderId] = {
    ...overrides[orderId],
    status: "Delivered",
    deliveryConfirmedAt: now,
    fundsReleasedAt: now,
  };
  writeOrderStatusOverrides(overrides);
  return getOrders(email);
}

export function deleteOrdersFor(email: string) {
  if (typeof window === "undefined") return;
  const normalized = email.trim().toLowerCase();
  const orderIds = new Set((seededOrders[normalized] ?? []).map((order) => order.id));
  try {
    const raw = window.localStorage.getItem(checkoutOrdersKey);
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
          window.localStorage.setItem(checkoutOrdersKey, JSON.stringify(kept));
        }
      }
    }
  } catch (cause) {
    console.error("Could not clear the local SupreCart checkout orders.", cause);
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

function profileKey(email: string) {
  return `suprecart-profile:${email.trim().toLowerCase()}`;
}

export function getProfile(email: string, fallbackName: string) {
  if (typeof window === "undefined") return { name: fallbackName, phone: "" };
  try {
    const saved = window.localStorage.getItem(profileKey(email));
    if (!saved) return { name: fallbackName, phone: "" };
    const profile = JSON.parse(saved) as { name?: unknown; phone?: unknown };
    return {
      name: cleanText(profile.name, 120) || fallbackName,
      phone: cleanPhone(profile.phone),
    };
  } catch (cause) {
    console.error("Could not read the local SupreCart profile.", cause);
    return { name: fallbackName, phone: "" };
  }
}

export function saveProfile(email: string, profile: { name: string; phone: string }) {
  if (typeof window === "undefined") return;
  const safeProfile = {
    name: cleanText(profile.name, 120),
    phone: cleanPhone(profile.phone),
  };
  try {
    window.localStorage.setItem(profileKey(email), JSON.stringify(safeProfile));
  } catch (cause) {
    console.error("Could not save the local SupreCart profile.", cause);
  }
  updateAccountName(email, safeProfile.name);
}

export function deleteProfile(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(profileKey(email));
}
