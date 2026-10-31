import { beforeEach, describe, expect, it } from "vitest";

import {
  createLocalAccount,
  getAllDemoAccounts,
  getAccountModeration,
  readActiveAccount,
  saveDemoAccount,
  setAccountModeration,
} from "@/lib/demo-accounts";

beforeEach(() => {
  window.localStorage.clear();
});

describe("account moderation", () => {
  it("defaults accounts to active with no note", () => {
    expect(getAccountModeration("blackrose@gmail.com")).toMatchObject({
      email: "blackrose@gmail.com",
      status: "active",
      reason: "",
    });
  });

  it("lists preset and local accounts once each", async () => {
    await createLocalAccount({
      email: "new@example.com",
      name: "New Buyer",
      role: "buyer",
      password: "demo-password",
    });

    const accounts = getAllDemoAccounts();
    expect(accounts.map((account) => account.email)).toContain("blackrose@gmail.com");
    expect(accounts.filter((account) => account.email === "new@example.com")).toHaveLength(1);
  });

  it("signs out a banned account and keeps the note", () => {
    saveDemoAccount({ email: "blackrose@gmail.com", name: "Daniel Adebisi", role: "buyer" });
    expect(readActiveAccount()).not.toBeNull();

    setAccountModeration("BLACKROSE@gmail.com", "banned", "Repeated spam");

    expect(readActiveAccount()).toBeNull();
    expect(getAccountModeration("blackrose@gmail.com")).toMatchObject({
      status: "banned",
      reason: "Repeated spam",
    });
  });
});
