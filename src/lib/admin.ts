import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader, useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const sessionLifetime = 60 * 60 * 8;

function getServerSecret(name: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} must be configured as a server-side environment secret.`);
  }
  if (name === "ADMIN_SESSION_SECRET" && secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function useAdminSession() {
  return useSession<{ authenticated?: boolean }>({
    name: "corecart_admin",
    password: getServerSecret("ADMIN_SESSION_SECRET"),
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

  let difference = 0;
  for (let index = 0; index < inputBytes.length; index += 1) {
    difference |= inputBytes[index]! ^ expectedBytes[index]!;
  }
  return difference === 0;
}

export const checkAdminSession = createServerFn().handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const session = await useAdminSession();
  return session.data.authenticated === true;
});

export const signInToAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(1).max(256) }))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const password = getServerSecret("ADMIN_PASSWORD");
    if (!constantTimeEqual(data.password, password)) return false;

    const session = await useAdminSession();
    await session.update({ authenticated: true });
    return true;
  });

export const signOutOfAdmin = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const session = await useAdminSession();
  await session.clear();
});

const dashboardPreview = {
  stats: [
    { label: "Gross sales", value: "$18,420", change: "+12.8%", detail: "vs. last month" },
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
};

export const getAdminDashboard = createServerFn().handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const session = await useAdminSession();
  if (session.data.authenticated !== true) {
    throw new Error("Your admin session has expired. Sign in again to view this dashboard.");
  }
  return dashboardPreview;
});
