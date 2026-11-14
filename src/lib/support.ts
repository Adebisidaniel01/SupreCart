import { cleanMultiline, cleanText } from "./input";

export type SupportMessage = {
  id: string;
  sender: "customer" | "care";
  body: string;
  createdAt: string;
  automated?: boolean;
};

export type SupportTicket = {
  requesterId: string;
  requesterName: string;
  topic?: string | undefined;
  joinedAt: string;
  lastMessageAt: string;
  messages: SupportMessage[];
  seeded?: boolean;
};

export type SupportQueueState = {
  inQueue: boolean;
  position: number;
  waitingAhead: number;
  estimatedMinutes: number;
  isNext: boolean;
};

const storageKey = "suprecart-support";
const guestIdKey = "suprecart-support-guest";
const seededKey = "suprecart-support-seeded";
const serviceWindowMs = 4 * 60 * 1000;
const minutesPerTicket = 3;
const maxTickets = 200;
const maxMessagesPerTicket = 500;
const messageBodyLimit = 2_000;
const requesterIdLimit = 320;

function normalizeRequesterId(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, requesterIdLimit) : "";
}

function normalizeSupportMessage(value: unknown): SupportMessage | null {
  if (typeof value !== "object" || value === null) return null;
  const message = value as Partial<SupportMessage>;
  if (typeof message.id !== "string" || !message.id) return null;
  if (message.sender !== "customer" && message.sender !== "care") return null;
  if (typeof message.createdAt !== "string" || !message.createdAt) return null;
  const body = cleanMultiline(message.body, messageBodyLimit);
  if (!body) return null;
  return {
    id: message.id.slice(0, 120),
    sender: message.sender,
    body,
    createdAt: message.createdAt.slice(0, 40),
    ...(typeof message.automated === "boolean" ? { automated: message.automated } : {}),
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `support-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function readTickets(): Record<string, SupportTicket> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const tickets: Record<string, SupportTicket> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>).slice(
      0,
      maxTickets,
    )) {
      if (typeof value !== "object" || value === null) continue;
      const entry = value as Partial<SupportTicket>;
      if (typeof entry.joinedAt !== "string" || !Array.isArray(entry.messages)) continue;
      const messages = entry.messages
        .map(normalizeSupportMessage)
        .filter((message): message is SupportMessage => message !== null)
        .slice(-maxMessagesPerTicket);
      const ticketId = id.slice(0, requesterIdLimit);
      tickets[ticketId] = {
        requesterId: normalizeRequesterId(entry.requesterId) || ticketId,
        requesterName: cleanText(entry.requesterName, 120) || "Guest shopper",
        topic: typeof entry.topic === "string" ? cleanText(entry.topic, 120) : undefined,
        joinedAt: entry.joinedAt.slice(0, 40),
        lastMessageAt:
          typeof entry.lastMessageAt === "string"
            ? entry.lastMessageAt.slice(0, 40)
            : entry.joinedAt.slice(0, 40),
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

function writeTickets(tickets: Record<string, SupportTicket>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(tickets));
}

function seedQueue(tickets: Record<string, SupportTicket>) {
  if (!canUseStorage()) return tickets;
  try {
    if (window.localStorage.getItem(seededKey)) return tickets;
    const now = Date.now();
    const seeds = [
      { id: "care-ada", name: "Ada", minutesAgo: 3 },
      { id: "care-musa", name: "Musa", minutesAgo: 2 },
      { id: "care-zainab", name: "Zainab", minutesAgo: 1 },
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

export function getSupportGuestId() {
  if (!canUseStorage()) return "";
  try {
    const existing = normalizeRequesterId(window.localStorage.getItem(guestIdKey));
    if (existing) return existing;
    const id = createId();
    window.localStorage.setItem(guestIdKey, id);
    return id;
  } catch (cause) {
    console.error("Could not save the local SupreCart guest support identity.", cause);
    return createId();
  }
}

export function getSupportTicket(requesterId: string) {
  const id = normalizeRequesterId(requesterId);
  if (!id) return null;
  return readTickets()[id] ?? null;
}

export function createSupportTicket(
  requesterId: string,
  requesterName: string,
  body: string,
  topic?: string,
) {
  const id = normalizeRequesterId(requesterId);
  if (!id) throw new Error("A customer care identity is required.");
  const messageBody = cleanMultiline(body, messageBodyLimit);
  if (!messageBody) throw new Error("Write a message before joining the queue.");
  const tickets = seedQueue(readTickets());
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    requesterId: id,
    requesterName: cleanText(requesterName, 120) || "Guest shopper",
    topic: typeof topic === "string" ? cleanText(topic, 120) : undefined,
    joinedAt: now,
    lastMessageAt: now,
    messages: [
      { id: createId(), sender: "customer", body: messageBody, createdAt: now },
      {
        id: createId(),
        sender: "care",
        body: "Thanks for reaching out. Your first message has joined the customer care queue.",
        createdAt: new Date(Date.now() + 1000).toISOString(),
        automated: true,
      },
    ],
  };
  tickets[id] = ticket;
  writeTickets(tickets);
  return ticket;
}

export function appendSupportMessage(requesterId: string, body: string) {
  const id = normalizeRequesterId(requesterId);
  if (!id) return null;
  const messageBody = cleanMultiline(body, messageBodyLimit);
  if (!messageBody) return null;
  const tickets = readTickets();
  const ticket = tickets[id];
  if (!ticket) return null;
  const now = new Date().toISOString();
  const message: SupportMessage = {
    id: createId(),
    sender: "customer",
    body: messageBody,
    createdAt: now,
  };
  ticket.messages = [...ticket.messages, message].slice(-maxMessagesPerTicket);
  ticket.lastMessageAt = now;
  tickets[id] = ticket;
  writeTickets(tickets);
  return ticket;
}

export function getSupportQueue(requesterId: string, now = Date.now()): SupportQueueState {
  const empty: SupportQueueState = {
    inQueue: false,
    position: 0,
    waitingAhead: 0,
    estimatedMinutes: 0,
    isNext: false,
  };
  const id = normalizeRequesterId(requesterId);
  if (!id) return empty;
  const tickets = readTickets();
  const ticket = tickets[id];
  if (!ticket) return empty;
  const joinedAt = Date.parse(ticket.joinedAt);
  if (!Number.isFinite(joinedAt)) return empty;

  const waitingAhead = Object.values(tickets).filter((entry) => {
    if (entry.requesterId === id) return false;
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

export function deleteSupportFor(requesterId: string) {
  const id = normalizeRequesterId(requesterId);
  if (!id) return;
  const tickets = readTickets();
  if (!tickets[id]) return;
  delete tickets[id];
  writeTickets(tickets);
}
