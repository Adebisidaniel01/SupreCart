import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader, useSession } from "@tanstack/react-start/server";
import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { cleanSecret, cleanText } from "./input";

const sessionLifetime = 60 * 60 * 8;
const demoAdminUsername = "timie_daniel";
const demoAdminPassword = "BlackRose";

function getServerSecret(name: "ADMIN_USERNAME" | "ADMIN_PASSWORD") {
  const secret =
    process.env[name] ?? (name === "ADMIN_USERNAME" ? demoAdminUsername : demoAdminPassword);
  if (!secret) {
    throw new Error(
      `${name} must be configured as a server-side environment secret before admin access can work.`,
    );
  }
  return secret;
}

/**
 * Sessions are signed with ADMIN_SESSION_SECRET when it is configured. Until a
 * domain is connected, a stable secret is derived from the admin credentials so
 * only ADMIN_USERNAME and a password (plain or hash) are required.
 */
function getSessionPassword() {
  const configured = process.env["ADMIN_SESSION_SECRET"];
  if (configured) {
    if (configured.length < 32) {
      throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
    }
    return configured;
  }

  const username = getServerSecret("ADMIN_USERNAME");
  const passwordMaterial =
    process.env["ADMIN_PASSWORD"] ?? process.env["ADMIN_PASSWORD_HASH"] ?? demoAdminPassword;
  if (!passwordMaterial) {
    throw new Error(
      "ADMIN_PASSWORD or ADMIN_PASSWORD_HASH must be configured as a server-side environment secret.",
    );
  }
  return createHash("sha256")
    .update(`suprecart-admin-session:${username}:${passwordMaterial}`)
    .digest("hex");
}

function useAdminSession() {
  return useSession<{ authenticated?: boolean }>({
    name: "suprecart_admin",
    password: getSessionPassword(),
    maxAge: sessionLifetime,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      path: "/",
      maxAge: sessionLifetime,
    },
  });
}

function constantTimeEqual(input: string, expected: string) {
  const inputBytes = new TextEncoder().encode(input);
  const expectedBytes = new TextEncoder().encode(expected);
  if (inputBytes.length !== expectedBytes.length) return false;

  try {
    return timingSafeEqual(inputBytes, expectedBytes);
  } catch {
    let difference = 0;
    for (let index = 0; index < inputBytes.length; index += 1) {
      difference |= inputBytes[index]! ^ expectedBytes[index]!;
    }
    return difference === 0;
  }
}

function verifyAdminPassword(plainPassword: string, username: string) {
  const passwordHash = process.env["ADMIN_PASSWORD_HASH"];
  if (passwordHash) {
    try {
      const stored = Buffer.from(passwordHash, "hex");
      const derived = scryptSync(plainPassword, `suprecart-admin-salt:${username}`, stored.length);
      if (stored.length !== derived.length) return false;
      return timingSafeEqual(stored, derived);
    } catch {
      return false;
    }
  }

  const password = getServerSecret("ADMIN_PASSWORD");
  return constantTimeEqual(plainPassword, password ?? "");
}

export const checkAdminSession = createServerFn().handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const session = await useAdminSession();
  return session.data.authenticated === true;
});

export const signInToAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z
        .string()
        .max(256)
        .transform((value) => cleanText(value, 256))
        .refine((value) => value.length >= 1 && value.length <= 256),
      password: z
        .string()
        .max(256)
        .transform((value) => cleanSecret(value, 256))
        .refine((value) => value.length >= 1 && value.length <= 256),
    }),
  )
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const username = getServerSecret("ADMIN_USERNAME");
    const validUsername = constantTimeEqual(data.username, username);
    const validPassword = verifyAdminPassword(data.password, username);
    if (!validUsername || !validPassword) {
      return false;
    }

    const session = await useAdminSession();
    await session.update({ authenticated: true });
    return true;
  });

export const signOutOfAdmin = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const session = await useAdminSession();
  await session.clear();
});

const dashboardData = {
  stats: [
    { label: "Gross sales", value: "₦18,420", change: "+12.8%", detail: "vs. last month" },
    { label: "Total users", value: "1,284", change: "+8.2%", detail: "vs. last month" },
    { label: "New sign-ups", value: "342", change: "+16.4%", detail: "vs. last month" },
    { label: "Page visits", value: "24,892", change: "+5.7%", detail: "vs. last month" },
  ],
  visits: [
    { day: "MON", value: 42 },
    { day: "TUE", value: 64 },
    { day: "WED", value: 52 },
    { day: "THU", value: 78 },
    { day: "FRI", value: 60 },
    { day: "SAT", value: 92 },
    { day: "SUN", value: 72 },
  ],
  activity: [
    { initials: "AM", name: "Amina Musa", event: "Created an account", time: "2 min ago" },
    { initials: "DO", name: "David Okafor", event: "Visited the marketplace", time: "8 min ago" },
    { initials: "TN", name: "Tolu Nwosu", event: "Created an account", time: "14 min ago" },
    { initials: "FK", name: "Farah Kalu", event: "Visited the marketplace", time: "21 min ago" },
  ],
  sellerLeaderboard: [
    {
      seller: "The Sole House",
      owner: "Tunde A.",
      orders: 312,
      grossSales: 4820000,
      commission: 530200,
      heldFunds: 186000,
      releasedFunds: 4103800,
      rating: "4.9",
      trend: "+18.4%",
    },
    {
      seller: "Lace & Legacy",
      owner: "Kemi O.",
      orders: 268,
      grossSales: 3965000,
      commission: 436150,
      heldFunds: 242000,
      releasedFunds: 3286850,
      rating: "5.0",
      trend: "+14.1%",
    },
    {
      seller: "Serein Beauty",
      owner: "Daniella I.",
      orders: 241,
      grossSales: 2874000,
      commission: 316140,
      heldFunds: 148500,
      releasedFunds: 2409360,
      rating: "4.7",
      trend: "+11.7%",
    },
    {
      seller: "The Study Store",
      owner: "Adeniji B.",
      orders: 198,
      grossSales: 2148000,
      commission: 236280,
      heldFunds: 97500,
      releasedFunds: 1814220,
      rating: "4.8",
      trend: "+9.6%",
    },
    {
      seller: "Dorm Depot",
      owner: "Bukunmi S.",
      orders: 174,
      grossSales: 1865000,
      commission: 205150,
      heldFunds: 129000,
      releasedFunds: 1530850,
      rating: "4.8",
      trend: "+7.3%",
    },
  ],
  escrow: {
    heldFunds: 1642000,
    releasedFunds: 9840000,
    platformCommission: 1325000,
    awaitingConfirmation: 37,
  },
};

export const getAdminDashboard = createServerFn().handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const session = await useAdminSession();
  if (session.data.authenticated !== true) {
    throw new Error("Your admin session has expired. Sign in again to view this dashboard.");
  }
  return dashboardData;
});
