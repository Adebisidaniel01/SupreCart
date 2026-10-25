import { findDemoAccount, isDemoAccountDeleted, type DemoAccount } from "./demo-accounts";

export type DemoChatMessage = {
  id: string;
  senderEmail: string;
  body: string;
  createdAt: string;
  readBy: string[];
};

export type DemoChatConversation = {
  id: string;
  buyer: DemoAccount;
  seller: DemoAccount;
  productName: string;
  messages: DemoChatMessage[];
};

const storageKey = "suprecart-demo-messages";

const seedConversations: DemoChatConversation[] = [
  {
    id: "chat-daniel-shewa",
    buyer: { email: "blackrose@gmail.com", name: "Daniel Adebisi", role: "buyer" },
    seller: { email: "shewa@gmail.com", name: "Bello-lawal Dorcas", role: "seller" },
    productName: "Hand-finished leather slides",
    messages: [
      {
        id: "ds-1",
        senderEmail: "blackrose@gmail.com",
        body: "Hi, are these true to size?",
        createdAt: "2026-09-18T09:12:00.000Z",
        readBy: [],
      },
      {
        id: "ds-2",
        senderEmail: "shewa@gmail.com",
        body: "Hello Daniel! Yes, they fit true to size. I can help with sizing if you share your usual size.",
        createdAt: "2026-09-18T09:18:00.000Z",
        readBy: ["blackrose@gmail.com"],
      },
      {
        id: "ds-3",
        senderEmail: "blackrose@gmail.com",
        body: "Great, thank you. I usually wear a 43.",
        createdAt: "2026-09-18T09:23:00.000Z",
        readBy: ["shewa@gmail.com"],
      },
    ],
  },
  {
    id: "chat-daniel-daniella",
    buyer: { email: "blackrose@gmail.com", name: "Daniel Adebisi", role: "buyer" },
    seller: { email: "daniella@gmail.com", name: "Daniella Olusegun", role: "seller" },
    productName: "Everyday glow face serum",
    messages: [
      {
        id: "dd-1",
        senderEmail: "blackrose@gmail.com",
        body: "Is this suitable for sensitive skin?",
        createdAt: "2026-09-17T14:04:00.000Z",
        readBy: ["daniella@gmail.com"],
      },
      {
        id: "dd-2",
        senderEmail: "daniella@gmail.com",
        body: "It is fragrance-free, but please check the ingredients list and patch test first.",
        createdAt: "2026-09-17T14:16:00.000Z",
        readBy: ["blackrose@gmail.com"],
      },
    ],
  },
  {
    id: "chat-victoria-daniella",
    buyer: { email: "vickybabs@gmail.com", name: "Victoria Babatunde", role: "buyer" },
    seller: { email: "daniella@gmail.com", name: "Daniella Olusegun", role: "seller" },
    productName: "Shea butter body cream",
    messages: [
      {
        id: "vd-1",
        senderEmail: "vickybabs@gmail.com",
        body: "Hi Daniella, what size is this jar?",
        createdAt: "2026-09-16T11:02:00.000Z",
        readBy: ["daniella@gmail.com"],
      },
      {
        id: "vd-2",
        senderEmail: "daniella@gmail.com",
        body: "Hi Victoria, it is 250 ml. I have added the size to the product details too.",
        createdAt: "2026-09-16T11:09:00.000Z",
        readBy: ["vickybabs@gmail.com"],
      },
    ],
  },
  {
    id: "chat-victoria-adeniji",
    buyer: { email: "vickybabs@gmail.com", name: "Victoria Babatunde", role: "buyer" },
    seller: { email: "adeniji@gmail.com", name: "Emmanuel Adeniji", role: "seller" },
    productName: "Relaxed-fit linen shirt",
    messages: [
      {
        id: "va-1",
        senderEmail: "vickybabs@gmail.com",
        body: "Could you confirm the fit around the shoulders?",
        createdAt: "2026-09-15T08:45:00.000Z",
        readBy: ["adeniji@gmail.com"],
      },
      {
        id: "va-2",
        senderEmail: "adeniji@gmail.com",
        body: "It has a relaxed cut with a little extra room. The size guide has garment measurements.",
        createdAt: "2026-09-15T09:01:00.000Z",
        readBy: ["vickybabs@gmail.com"],
      },
    ],
  },
  {
    id: "chat-isaac-adeniji",
    buyer: { email: "izzy@gmail.com", name: "Isaac Oyebanji", role: "buyer" },
    seller: { email: "adeniji@gmail.com", name: "Emmanuel Adeniji", role: "seller" },
    productName: "Classic cotton polo",
    messages: [
      {
        id: "ia-1",
        senderEmail: "izzy@gmail.com",
        body: "Is the navy colour available in medium?",
        createdAt: "2026-09-14T16:25:00.000Z",
        readBy: ["adeniji@gmail.com"],
      },
      {
        id: "ia-2",
        senderEmail: "adeniji@gmail.com",
        body: "Yes, medium is available in navy in this demo catalogue.",
        createdAt: "2026-09-14T16:31:00.000Z",
        readBy: ["izzy@gmail.com"],
      },
    ],
  },
  {
    id: "chat-isaac-bukunmi",
    buyer: { email: "izzy@gmail.com", name: "Isaac Oyebanji", role: "buyer" },
    seller: { email: "bukunmi@gmail.com", name: "Bukunmi Oluwaseyin", role: "seller" },
    productName: "Handwoven storage basket",
    messages: [
      {
        id: "ib-1",
        senderEmail: "izzy@gmail.com",
        body: "Would this fit on a small bookshelf?",
        createdAt: "2026-09-13T10:10:00.000Z",
        readBy: ["bukunmi@gmail.com"],
      },
      {
        id: "ib-2",
        senderEmail: "bukunmi@gmail.com",
        body: "It is about 28 cm wide, so please compare that with your shelf space.",
        createdAt: "2026-09-13T10:24:00.000Z",
        readBy: ["izzy@gmail.com"],
      },
    ],
  },
  {
    id: "chat-olowe-bukunmi",
    buyer: { email: "olowe@gmail.com", name: "Olowe Goodness", role: "buyer" },
    seller: { email: "bukunmi@gmail.com", name: "Bukunmi Oluwaseyin", role: "seller" },
    productName: "Hand-poured ceramic mug",
    messages: [
      {
        id: "ob-1",
        senderEmail: "olowe@gmail.com",
        body: "Is each mug slightly different?",
        createdAt: "2026-09-12T12:40:00.000Z",
        readBy: ["bukunmi@gmail.com"],
      },
      {
        id: "ob-2",
        senderEmail: "bukunmi@gmail.com",
        body: "Yes, each is handmade, so small variations in glaze and shape are part of the finish.",
        createdAt: "2026-09-12T12:52:00.000Z",
        readBy: ["olowe@gmail.com"],
      },
    ],
  },
  {
    id: "chat-olowe-shewa",
    buyer: { email: "olowe@gmail.com", name: "Olowe Goodness", role: "buyer" },
    seller: { email: "shewa@gmail.com", name: "Bello-lawal Dorcas", role: "seller" },
    productName: "Everyday leather sandals",
    messages: [
      {
        id: "os-1",
        senderEmail: "olowe@gmail.com",
        body: "Do you have these in a dark brown finish?",
        createdAt: "2026-09-11T13:15:00.000Z",
        readBy: ["shewa@gmail.com"],
      },
      {
        id: "os-2",
        senderEmail: "shewa@gmail.com",
        body: "I do. The available colours are listed on the product page; this chat is just a local demo.",
        createdAt: "2026-09-11T13:27:00.000Z",
        readBy: ["olowe@gmail.com"],
      },
    ],
  },
];

export function getDemoChatConversations(account: DemoAccount) {
  return seedConversations
    .filter((conversation) => {
      if (isDemoAccountDeleted(conversation.buyer.email)) return false;
      if (isDemoAccountDeleted(conversation.seller.email)) return false;
      return account.role === "buyer"
        ? conversation.buyer.email === account.email
        : conversation.seller.email === account.email;
    })
    .map((conversation) => ({ ...conversation, messages: readDemoChatMessages(conversation) }));
}

export function readDemoChatMessages(conversation: DemoChatConversation) {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return conversation.messages;
  let savedMessages: Record<string, DemoChatMessage[]>;
  try {
    savedMessages = JSON.parse(stored) as Record<string, DemoChatMessage[]>;
  } catch (cause) {
    console.error("Could not read the local SupreCart demo messages.", cause);
    throw new Error("Demo conversations could not be loaded from this browser.");
  }
  return savedMessages[conversation.id] ?? conversation.messages;
}

export function saveDemoChatMessages(conversationId: string, messages: DemoChatMessage[]) {
  const stored = window.localStorage.getItem(storageKey);
  let savedMessages: Record<string, DemoChatMessage[]> = {};
  if (stored) {
    try {
      savedMessages = JSON.parse(stored) as Record<string, DemoChatMessage[]>;
    } catch (cause) {
      console.error("Could not update the local SupreCart demo messages.", cause);
      throw new Error("Demo conversations could not be saved because local data is invalid.");
    }
  }
  savedMessages[conversationId] = messages;
  window.localStorage.setItem(storageKey, JSON.stringify(savedMessages));
}

export function getDemoChatAccount(email: string, role: DemoAccount["role"]) {
  return findDemoAccount(email, role);
}

export function deleteDemoMessagesFor(email: string) {
  const normalized = email.trim().toLowerCase();
  const conversationIds = seedConversations
    .filter(
      (conversation) =>
        conversation.buyer.email === normalized || conversation.seller.email === normalized,
    )
    .map((conversation) => conversation.id);
  if (!conversationIds.length) return;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return;
  try {
    const savedMessages = JSON.parse(stored) as Record<string, DemoChatMessage[]>;
    for (const id of conversationIds) delete savedMessages[id];
    window.localStorage.setItem(storageKey, JSON.stringify(savedMessages));
  } catch (cause) {
    console.error("Could not clear the local SupreCart demo messages.", cause);
    window.localStorage.removeItem(storageKey);
  }
}
