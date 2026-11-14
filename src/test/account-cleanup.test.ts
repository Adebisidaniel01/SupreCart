import { beforeEach, describe, expect, it } from "vitest";

import { deleteAccountData } from "@/lib/account-cleanup";
import { findAccount, getAccounts, isAccountDeleted, saveAccount } from "@/lib/accounts";
import { getChatConversations } from "@/lib/messages";
import { getOrders, getProfile, saveProfile } from "@/lib/orders";
import { getSellerApplication, submitSellerApplication } from "@/lib/seller-applications";

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

  it("permanently removes a seller application, profile and chats", () => {
    const email = "new.seller@example.com";
    submitSellerApplication({
      email,
      name: "New Seller",
      storeName: "New Seller Studio",
      phone: "+234 800 000 0000",
      productDescription: "Handmade goods.",
    });
    saveProfile(email, { name: "New Seller", phone: "+234 800 000 0000" });

    deleteAccountData(email);

    expect(getSellerApplication(email)).toBeNull();
    expect(getProfile(email, "New Seller").phone).toBe("");
    expect(
      getChatConversations({
        email,
        name: "New Seller",
        role: "seller",
      }),
    ).toHaveLength(0);
  });
});
