import { beforeEach, describe, expect, it } from "vitest";

import { deleteDemoAccountData } from "@/lib/demo-account-cleanup";
import {
  findDemoAccount,
  getDemoAccounts,
  isDemoAccountDeleted,
  saveDemoAccount,
} from "@/lib/demo-accounts";
import { getDemoChatConversations } from "@/lib/demo-messages";
import { getDemoOrders, getDemoProfile, saveDemoProfile } from "@/lib/demo-orders";
import { getSellerApplication } from "@/lib/seller-applications";

beforeEach(() => {
  window.localStorage.clear();
});

describe("demo account cleanup", () => {
  it("renames the preset buyer account to blackrose", () => {
    expect(getDemoAccounts("buyer").map((account) => account.email)).toContain(
      "blackrose@gmail.com",
    );
    expect(getDemoAccounts("buyer").map((account) => account.email)).not.toContain(
      "adebisidan01@gmail.com",
    );
  });

  it("permanently removes a preset buyer and their messages", () => {
    expect(getDemoOrders("blackrose@gmail.com")).toHaveLength(3);
    saveDemoAccount({ email: "blackrose@gmail.com", name: "Daniel Adebisi", role: "buyer" });

    deleteDemoAccountData("blackrose@gmail.com");

    expect(findDemoAccount("blackrose@gmail.com", "buyer")).toBeUndefined();
    expect(isDemoAccountDeleted("blackrose@gmail.com")).toBe(true);
    expect(getDemoOrders("blackrose@gmail.com")).toHaveLength(0);
    expect(
      getDemoChatConversations({
        email: "blackrose@gmail.com",
        name: "Daniel Adebisi",
        role: "buyer",
      }),
    ).toHaveLength(0);
  });

  it("permanently removes a seller application, profile and seeded chats", () => {
    expect(getSellerApplication("shewa@gmail.com")?.status).toBe("approved");
    saveDemoProfile("shewa@gmail.com", { name: "Dorcas", phone: "+234 800 000 0000" });

    deleteDemoAccountData("shewa@gmail.com");

    expect(getSellerApplication("shewa@gmail.com")).toBeNull();
    expect(getDemoProfile("shewa@gmail.com", "Dorcas").phone).toBe("");
    expect(
      getDemoChatConversations({
        email: "shewa@gmail.com",
        name: "Bello-lawal Dorcas",
        role: "seller",
      }),
    ).toHaveLength(0);
  });
});
