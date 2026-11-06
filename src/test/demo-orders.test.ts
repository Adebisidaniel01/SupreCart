import { beforeEach, describe, expect, it } from "vitest";

import { canCancelDemoOrder, cancelDemoOrder, getDemoOrders } from "@/lib/demo-orders";

const previewOrderKey = "suprecart-preview-orders";

function savePreviewOrder(overrides: Record<string, unknown> = {}) {
  const order = {
    batchNumber: "CC-BATCH-TEST",
    createdAt: new Date().toISOString(),
    buyerEmail: "vickybabs@gmail.com",
    lines: [{ product: { name: "Test Product" }, size: "M", quantity: 2 }],
    subtotal: 1000,
    vat: 75,
    deliveryFee: 2500,
    total: 3575,
    deliveryState: "Kwara",
    deliveryMethod: "doorstep",
    paymentMethod: "paystack",
    deliveryDestination: "12 Test Street, GRA, Ilorin West, Kwara",
    shipments: [],
    ...overrides,
  };
  window.localStorage.setItem(previewOrderKey, JSON.stringify([order]));
  return order;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("demo order cancellation", () => {
  it("requests cancellation for a Processing order with a reason and keeps it in this browser", () => {
    const processing = getDemoOrders("vickybabs@gmail.com").find(
      (order) => order.status === "Processing",
    );
    expect(processing).toBeDefined();
    if (!processing) return;

    expect(canCancelDemoOrder(processing)).toBe(true);

    const updated = cancelDemoOrder(
      "vickybabs@gmail.com",
      processing.id,
      "Delivery is taking too long",
    );
    const requested = updated.find((order) => order.id === processing.id);

    expect(requested?.status).toBe("Cancellation requested");
    expect(requested?.cancellation_requested_at).toBeTruthy();
    expect(requested?.cancellation_reason).toBe("Delivery is taking too long");
    expect(
      getDemoOrders("vickybabs@gmail.com").find((order) => order.id === processing.id)?.status,
    ).toBe("Cancellation requested");
  });

  it("requires a cancellation reason", () => {
    const processing = getDemoOrders("vickybabs@gmail.com").find(
      (order) => order.status === "Processing",
    );
    expect(processing).toBeDefined();
    if (!processing) return;

    expect(() => cancelDemoOrder("vickybabs@gmail.com", processing.id, "   ")).toThrow(
      /cancellation reason/,
    );
  });

  it("refuses to cancel an order that has already shipped", () => {
    const inTransit = getDemoOrders("blackrose@gmail.com").find(
      (order) => order.status === "In transit",
    );
    expect(inTransit).toBeDefined();
    if (!inTransit) return;

    expect(canCancelDemoOrder(inTransit)).toBe(false);
    expect(() => cancelDemoOrder("blackrose@gmail.com", inTransit.id, "Changed my mind")).toThrow(
      /no longer be cancelled/,
    );
  });

  it("shows checkout preview orders in the account and lets the buyer request cancellation", () => {
    const preview = savePreviewOrder();
    const saved = getDemoOrders("vickybabs@gmail.com").find(
      (order) => order.id === preview.batchNumber,
    );

    expect(saved).toBeDefined();
    expect(saved?.source).toBe("checkout");
    expect(saved?.items).toContain("Test Product");
    expect(saved?.status).toBe("Processing");
    if (!saved) return;

    expect(canCancelDemoOrder(saved)).toBe(true);

    const updated = cancelDemoOrder(
      "vickybabs@gmail.com",
      preview.batchNumber,
      "Ordered by mistake",
    );
    expect(updated.find((order) => order.id === preview.batchNumber)?.status).toBe(
      "Cancellation requested",
    );
  });

  it("closes the cancellation window 24 hours after ordering", () => {
    const preview = savePreviewOrder({
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    });
    const saved = getDemoOrders("vickybabs@gmail.com").find(
      (order) => order.id === preview.batchNumber,
    );

    expect(saved).toBeDefined();
    if (!saved) return;

    expect(canCancelDemoOrder(saved)).toBe(false);
    expect(() =>
      cancelDemoOrder("vickybabs@gmail.com", preview.batchNumber, "Changed my mind"),
    ).toThrow(/24-hour cancellation window/);
  });

  it("does not show checkout preview orders to another account", () => {
    savePreviewOrder();
    expect(getDemoOrders("blackrose@gmail.com")).not.toContainEqual(
      expect.objectContaining({ id: "CC-BATCH-TEST" }),
    );
  });
});
