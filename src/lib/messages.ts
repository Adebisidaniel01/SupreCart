import { findAccount, isAccountDeleted, type Account } from "./accounts";

export type ChatMessage = {
  id: string;
  senderEmail: string;
  body: string;
  createdAt: string;
  readBy: string[];
};

export type ChatConversation = {
  id: string;
  buyer: Account;
  seller: Account;
  productName: string;
  messages: ChatMessage[];
};

const storageKey = "suprecart-messages";

const seedConversations: ChatConversation[] = [
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
    productName: "Campus Oversized Hoodie",
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
    productName: "Oversized Study Tee",
    messages: [
      {
        id: "ia-1",
        senderEmail: "izzy@gmail.com",
        body: "Is this available in medium?",
        createdAt: "2026-09-14T16:25:00.000Z",
        readBy: ["adeniji@gmail.com"],
      },
      {
        id: "ia-2",
        senderEmail: "adeniji@gmail.com",
        body: "Yes, medium is available in white and sage in this catalogue.",
        createdAt: "2026-09-14T16:31:00.000Z",
        readBy: ["izzy@gmail.com"],
      },
    ],
  },
  {
    id: "chat-isaac-bukunmi",
    buyer: { email: "izzy@gmail.com", name: "Isaac Oyebanji", role: "buyer" },
    seller: { email: "bukunmi@gmail.com", name: "Bukunmi Oluwaseyin", role: "seller" },
    productName: "North Campus Backpack",
    messages: [
      {
        id: "ib-1",
        senderEmail: "izzy@gmail.com",
        body: "Would this fit a 15-inch laptop?",
        createdAt: "2026-09-13T10:10:00.000Z",
        readBy: ["bukunmi@gmail.com"],
      },
      {
        id: "ib-2",
        senderEmail: "bukunmi@gmail.com",
        body: "Yes, the padded sleeve fits most 15-inch laptops and still leaves room for notebooks.",
        createdAt: "2026-09-13T10:24:00.000Z",
        readBy: ["izzy@gmail.com"],
      },
    ],
  },
  {
    id: "chat-olowe-bukunmi",
    buyer: { email: "olowe@gmail.com", name: "Olowe Goodness", role: "buyer" },
    seller: { email: "bukunmi@gmail.com", name: "Bukunmi Oluwaseyin", role: "seller" },
    productName: "LED Study Desk Lamp",
    messages: [
      {
        id: "ob-1",
        senderEmail: "olowe@gmail.com",
        body: "Does the lamp have a USB charging port?",
        createdAt: "2026-09-12T12:40:00.000Z",
        readBy: ["bukunmi@gmail.com"],
      },
      {
        id: "ob-2",
        senderEmail: "bukunmi@gmail.com",
        body: "It has a USB-C port and three brightness levels, which is handy for late study sessions.",
        createdAt: "2026-09-12T12:52:00.000Z",
        readBy: ["olowe@gmail.com"],
      },
    ],
  },
  {
    id: "chat-olowe-shewa",
    buyer: { email: "olowe@gmail.com", name: "Olowe Goodness", role: "buyer" },
    seller: { email: "shewa@gmail.com", name: "Bello-lawal Dorcas", role: "seller" },
    productName: "Adidas Superstar",
    messages: [
      {
        id: "os-1",
        senderEmail: "olowe@gmail.com",
        body: "Do you have these in a UK 9?",
        createdAt: "2026-09-11T13:15:00.000Z",
        readBy: ["shewa@gmail.com"],
      },
      {
        id: "os-2",
        senderEmail: "shewa@gmail.com",
        body: "Yes, the available sizes are listed on the product page; this chat is stored locally.",
        createdAt: "2026-09-11T13:27:00.000Z",
        readBy: ["olowe@gmail.com"],
      },
    ],
  },
];

export function getChatConversations(account: Account) {
  return seedConversations
    .filter((conversation) => {
      if (isAccountDeleted(conversation.buyer.email)) return false;
      if (isAccountDeleted(conversation.seller.email)) return false;
      return account.role === "buyer"
        ? conversation.buyer.email === account.email
        : conversation.seller.email === account.email;
    })
    .map((conversation) => ({ ...conversation, messages: readChatMessages(conversation) }));
}

export function readChatMessages(conversation: ChatConversation) {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return conversation.messages;
  let savedMessages: Record<string, ChatMessage[]>;
  try {
    savedMessages = JSON.parse(stored) as Record<string, ChatMessage[]>;
  } catch (cause) {
    console.error("Could not read the local SupreCart messages.", cause);
    throw new Error("Conversations could not be loaded from this browser.");
  }
  return savedMessages[conversation.id] ?? conversation.messages;
}

export function saveChatMessages(conversationId: string, messages: ChatMessage[]) {
  const stored = window.localStorage.getItem(storageKey);
  let savedMessages: Record<string, ChatMessage[]> = {};
  if (stored) {
    try {
      savedMessages = JSON.parse(stored) as Record<string, ChatMessage[]>;
    } catch (cause) {
      console.error("Could not update the local SupreCart messages.", cause);
      throw new Error("Conversations could not be saved because local data is invalid.");
    }
  }
  savedMessages[conversationId] = messages;
  window.localStorage.setItem(storageKey, JSON.stringify(savedMessages));
}

export function getChatAccount(email: string, role: Account["role"]) {
  return findAccount(email, role);
}

export function deleteMessagesFor(email: string) {
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
    const savedMessages = JSON.parse(stored) as Record<string, ChatMessage[]>;
    for (const id of conversationIds) delete savedMessages[id];
    window.localStorage.setItem(storageKey, JSON.stringify(savedMessages));
  } catch (cause) {
    console.error("Could not clear the local SupreCart messages.", cause);
    window.localStorage.removeItem(storageKey);
  }
}
