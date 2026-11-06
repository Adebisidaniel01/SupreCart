import { beforeEach, describe, expect, it } from "vitest";

import {
  appendDemoSupportMessage,
  createDemoSupportTicket,
  deleteDemoSupportFor,
  getDemoSupportQueue,
  getDemoSupportTicket,
} from "@/lib/demo-support";

beforeEach(() => {
  window.localStorage.clear();
});

describe("demo customer care queue", () => {
  it("creates a ticket and reserves a place behind earlier messages", () => {
    const ticket = createDemoSupportTicket("buyer@example.com", "Buyer", "Where is my order?");

    expect(ticket.messages).toHaveLength(2);
    expect(ticket.messages.at(-1)?.automated).toBe(true);

    const queue = getDemoSupportQueue("buyer@example.com");
    expect(queue).toMatchObject({
      inQueue: true,
      position: 4,
      waitingAhead: 3,
      isNext: false,
    });
  });

  it("keeps the original queue position when more messages arrive", () => {
    const ticket = createDemoSupportTicket("buyer@example.com", "Buyer", "Where is my order?");
    const updated = appendDemoSupportMessage("buyer@example.com", "Any update?");

    expect(updated?.joinedAt).toBe(ticket.joinedAt);
    expect(updated?.messages).toHaveLength(3);
    expect(getDemoSupportQueue("buyer@example.com").position).toBe(4);
  });

  it("moves the customer to the front once earlier tickets clear", () => {
    const ticket = createDemoSupportTicket("buyer@example.com", "Buyer", "Where is my order?");
    const joinedAt = Date.parse(ticket.joinedAt);
    const queue = getDemoSupportQueue("buyer@example.com", joinedAt + 5 * 60_000);

    expect(queue.position).toBe(1);
    expect(queue.isNext).toBe(true);
    expect(queue.estimatedMinutes).toBe(0);
  });

  it("removes the local support history", () => {
    createDemoSupportTicket("buyer@example.com", "Buyer", "Where is my order?");

    deleteDemoSupportFor("buyer@example.com");

    expect(getDemoSupportTicket("buyer@example.com")).toBeNull();
    expect(getDemoSupportQueue("buyer@example.com").inQueue).toBe(false);
  });
});
