export type DemoOrder = {
  id: string;
  status: "Delivered" | "In transit" | "Processing";
  created_at: string;
  total: number;
  items: string;
  delivery: string;
};

const day = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const sampleOrders: Record<string, DemoOrder[]> = {
  "adebisidan01@gmail.com": [
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
      created_at: day(1),
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

export function getDemoOrders(email: string) {
  return (sampleOrders[email.toLowerCase()] ?? []).map((order) => ({ ...order }));
}

export function getDemoProfile(email: string, fallbackName: string) {
  if (!import.meta.env.DEV) return { name: fallbackName, phone: "" };
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
  if (!import.meta.env.DEV) return;
  window.localStorage.setItem(
    `suprecart-demo-profile:${email.toLowerCase()}`,
    JSON.stringify(profile),
  );
}
