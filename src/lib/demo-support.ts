export type DemoSupportMessage = {
  id: string;
  sender: "customer" | "care";
  body: string;
  createdAt: string;
  automated?: boolean;
};

export type DemoSupportTicket = {
  requesterId: string;
  requesterName: string;
  topic?: string | undefined;
  joinedAt: string;
  lastMessageAt: string;
  messages: DemoSupportMessage[];
  seeded?: boolean;
};

export type DemoSupportQueueState = {
  inQueue: boolean;
  position: number;
  waitingAhead: number;
  estimatedMinutes: number;
  isNext: boolean;
};

const storageKey = "suprecart-demo-support";
const guestIdKey = "suprecart-demo-support-guest";
const seededKey = "suprecart-demo-support-seeded";
const serviceWindowMs = 4 * 60 * 1000;
const minutesPerTicket = 3;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `support-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function readTickets(): Record<string, DemoSupportTicket> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const tickets: Record<string, DemoSupportTicket> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== "object" || value === null) continue;
      const entry = value as Partial<DemoSupportTicket>;
      if (typeof entry.joinedAt !== "string" || !Array.isArray(entry.messages)) continue;
      const messages = entry.messages.filter(
        (message): message is DemoSupportMessage =>
          typeof message === "object" &&
          message !== null &&
          typeof (message as DemoSupportMessage).id === "string" &&
          ((message as DemoSupportMessage).sender === "customer" ||
            (message as DemoSupportMessage).sender === "care") &&
          typeof (message as DemoSupportMessage).body === "string" &&
          typeof (message as DemoSupportMessage).createdAt === "string",
      );
      tickets[id] = {
        requesterId: typeof entry.requesterId === "string" ? entry.requesterId : id,
        requesterName:
          typeof entry.requesterName === "string" ? entry.requesterName : "Guest shopper",
        topic: typeof entry.topic === "string" ? entry.topic : undefined,
        joinedAt: entry.joinedAt,
        lastMessageAt:
          typeof entry.lastMessageAt === "string" ? entry.lastMessageAt : entry.joinedAt,
        messages,
        seeded: Boolean(entry.seeded),
      };
    }
    return tickets;
  } catch (cause) {
    console.error("Could not read the local SupreCart customer care queue.", cause);
    return {};
  }
}

function writeTickets(tickets: Record<string, DemoSupportTicket>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(tickets));
}

function seedQueue(tickets: Record<string, DemoSupportTicket>) {
  if (!canUseStorage()) return tickets;
  try {
    if (window.localStorage.getItem(seededKey)) return tickets;
    const now = Date.now();
    const seeds = [
      { id: "demo-care-ada", name: "Ada", minutesAgo: 3 },
      { id: "demo-care-musa", name: "Musa", minutesAgo: 2 },
      { id: "demo-care-zainab", name: "Zainab", minutesAgo: 1 },
    ];
    for (const seed of seeds) {
      if (tickets[seed.id]) continue;
      const joinedAt = new Date(now - seed.minutesAgo * 60_000).toISOString();
      tickets[seed.id] = {
        requesterId: seed.id,
        requesterName: seed.name,
        joinedAt,
        lastMessageAt: joinedAt,
        seeded: true,
        messages: [
          {
            id: `${seed.id}-message`,
            sender: "customer",
            body: "I need help with my order.",
            createdAt: joinedAt,
          },
        ],
      };
    }
    writeTickets(tickets);
    window.localStorage.setItem(seededKey, "1");
  } catch (cause) {
    console.error("Could not prepare the local SupreCart customer care queue.", cause);
  }
  return tickets;
}

export function getDemoSupportGuestId() {
  if (!canUseStorage()) return "";
  try {
    const existing = window.localStorage.getItem(guestIdKey);
    if (existing) return existing;
    const id = createId();
    window.localStorage.setItem(guestIdKey, id);
    return id;
  } catch (cause) {
    console.error("Could not save the local SupreCart guest support identity.", cause);
    return createId();
  }
}

export function getDemoSupportTicket(requesterId: string) {
  if (!requesterId) return null;
  return readTickets()[requesterId] ?? null;
}

export function createDemoSupportTicket(
  requesterId: string,
  requesterName: string,
  body: string,
  topic?: string,
) {
  if (!requesterId) throw new Error("A customer care identity is required.");
  const tickets = seedQueue(readTickets());
  const now = new Date().toISOString();
  const ticket: DemoSupportTicket = {
    requesterId,
    requesterName,
    topic,
    joinedAt: now,
    lastMessageAt: now,
    messages: [
      { id: createId(), sender: "customer", body, createdAt: now },
      {
        id: createId(),
        sender: "care",
        body: "Thanks for reaching out. Your first message has joined the customer care queue. This is a local preview, so no live agent is connected yet.",
        createdAt: new Date(Date.now() + 1000).toISOString(),
        automated: true,
      },
    ],
  };
  tickets[requesterId] = ticket;
  writeTickets(tickets);
  return ticket;
}

export function appendDemoSupportMessage(requesterId: string, body: string) {
  if (!requesterId) return null;
  const tickets = readTickets();
  const ticket = tickets[requesterId];
  if (!ticket) return null;
  const now = new Date().toISOString();
  ticket.messages = [
    ...ticket.messages,
    { id: createId(), sender: "customer", body, createdAt: now },
  ];
  ticket.lastMessageAt = now;
  tickets[requesterId] = ticket;
  writeTickets(tickets);
  return ticket;
}

export function getDemoSupportQueue(requesterId: string, now = Date.now()): DemoSupportQueueState {
  const empty: DemoSupportQueueState = {
    inQueue: false,
    position: 0,
    waitingAhead: 0,
    estimatedMinutes: 0,
    isNext: false,
  };
  if (!requesterId) return empty;
  const tickets = readTickets();
  const ticket = tickets[requesterId];
  if (!ticket) return empty;
  const joinedAt = Date.parse(ticket.joinedAt);
  if (!Number.isFinite(joinedAt)) return empty;

  const waitingAhead = Object.values(tickets).filter((entry) => {
    if (entry.requesterId === requesterId) return false;
    const entryJoinedAt = Date.parse(entry.joinedAt);
    if (!Number.isFinite(entryJoinedAt)) return false;
    if (entryJoinedAt >= joinedAt) return false;
    return now - entryJoinedAt < serviceWindowMs;
  }).length;

  const position = waitingAhead + 1;
  return {
    inQueue: true,
    position,
    waitingAhead,
    estimatedMinutes: waitingAhead ? waitingAhead * minutesPerTicket : 0,
    isNext: waitingAhead === 0,
  };
}

export function deleteDemoSupportFor(requesterId: string) {
  if (!requesterId) return;
  const tickets = readTickets();
  if (!tickets[requesterId]) return;
  delete tickets[requesterId];
  writeTickets(tickets);
}
