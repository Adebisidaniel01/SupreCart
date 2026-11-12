import { beforeEach, describe, expect, it } from "vitest";

import { deleteAccountData } from "@/lib/account-cleanup";
import { findAccount, getAccounts, isAccountDeleted, saveAccount } from "@/lib/accounts";
import { getChatConversations } from "@/lib/messages";
import { getOrders, getProfile, saveProfile } from "@/lib/orders";
import { getSellerApplication } from "@/lib/seller-applications";

beforeEach(() => {
  window.localStorage.clear();
});

describe("account cleanup", () => {
  it("renames the preset buyer account to blackrose", () => {
    expect(getAccounts("buyer").map((account) => account.email)).toContain("blackrose@gmail.com");
    expect(getAccounts("buyer").map((account) => account.email)).not.toContain(
      "adebisidan01@gmail.com",
    );
  });

  it("permanently removes a preset buyer and their messages", () => {
    expect(getOrders("blackrose@gmail.com")).toHaveLength(3);
    saveAccount({ email: "blackrose@gmail.com", name: "Daniel Adebisi", role: "buyer" });

    deleteAccountData("blackrose@gmail.com");

    expect(findAccount("blackrose@gmail.com", "buyer")).toBeUndefined();
    expect(isAccountDeleted("blackrose@gmail.com")).toBe(true);
    expect(getOrders("blackrose@gmail.com")).toHaveLength(0);
    expect(
      getChatConversations({
        email: "blackrose@gmail.com",
        name: "Daniel Adebisi",
        role: "buyer",
      }),
    ).toHaveLength(0);
  });

  it("permanently removes a seller application, profile and seeded chats", () => {
    expect(getSellerApplication("shewa@gmail.com")?.status).toBe("approved");
    saveProfile("shewa@gmail.com", { name: "Dorcas", phone: "+234 800 000 0000" });

    deleteAccountData("shewa@gmail.com");

    expect(getSellerApplication("shewa@gmail.com")).toBeNull();
    expect(getProfile("shewa@gmail.com", "Dorcas").phone).toBe("");
    expect(
      getChatConversations({
        email: "shewa@gmail.com",
        name: "Bello-lawal Dorcas",
        role: "seller",
      }),
    ).toHaveLength(0);
  });
});
