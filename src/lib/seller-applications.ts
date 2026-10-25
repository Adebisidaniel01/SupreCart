import { isDemoAccountDeleted } from "./demo-accounts";

export type SellerApplicationStatus = "pending" | "approved" | "rejected";

export type SellerApplication = {
  email: string;
  name: string;
  storeName: string;
  phone: string;
  productDescription: string;
  bankName: string;
  bankAccountNumber: string;
  status: SellerApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export type SellerApplicationDraft = Pick<
  SellerApplication,
  "email" | "name" | "storeName" | "phone" | "productDescription" | "bankName" | "bankAccountNumber"
>;

const storageKey = "suprecart-seller-applications";
const changeEvent = "suprecart-seller-applications-change";

const seededApplications: SellerApplication[] = [
  {
    email: "shewa@gmail.com",
    name: "Bello-lawal Dorcas",
    storeName: "Shewa Studio",
    phone: "+234 803 000 0000",
    productDescription:
      "Considered footwear and everyday accessories, sourced and styled in small batches.",
    bankName: "Preview Bank",
    bankAccountNumber: "0000000000",
    status: "approved",
    submittedAt: "2026-08-28T09:30:00.000Z",
    reviewedAt: "2026-08-30T11:15:00.000Z",
    reviewNote: "Preview seller approved for the local demo.",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isSellerApplication(value: unknown): value is SellerApplication {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<SellerApplication>;
  return (
    typeof entry.email === "string" &&
    typeof entry.name === "string" &&
    typeof entry.storeName === "string" &&
    typeof entry.phone === "string" &&
    typeof entry.productDescription === "string" &&
    typeof entry.bankName === "string" &&
    typeof entry.bankAccountNumber === "string" &&
    ["pending", "approved", "rejected"].includes(entry.status ?? "") &&
    typeof entry.submittedAt === "string"
  );
}

function writeApplications(applications: SellerApplication[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(applications));
  window.dispatchEvent(new Event(changeEvent));
}

function ensureSeeded(applications: SellerApplication[]) {
  let changed = false;
  const next = [...applications];
  for (const application of seededApplications) {
    if (isDemoAccountDeleted(application.email)) continue;
    if (!next.some((entry) => normalizeEmail(entry.email) === application.email)) {
      next.push(application);
      changed = true;
    }
  }
  if (changed) {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }
  return next;
}

export function readSellerApplications(): SellerApplication[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const applications = Array.isArray(parsed) ? parsed.filter(isSellerApplication) : [];
    return ensureSeeded(applications).sort(
      (first, second) => Date.parse(second.submittedAt) - Date.parse(first.submittedAt),
    );
  } catch (cause) {
    console.error("Could not read the locally saved seller applications.", cause);
    return [];
  }
}

export function getSellerApplication(email: string): SellerApplication | null {
  const normalized = normalizeEmail(email);
  return readSellerApplications().find((entry) => entry.email === normalized) ?? null;
}

export function deleteSellerApplication(email: string) {
  const normalized = normalizeEmail(email);
  const applications = readSellerApplications();
  const remaining = applications.filter((entry) => entry.email !== normalized);
  if (remaining.length !== applications.length) writeApplications(remaining);
}

export function submitSellerApplication(draft: SellerApplicationDraft): SellerApplication {
  const email = normalizeEmail(draft.email);
  const applications = readSellerApplications();
  const existing = applications.find((entry) => entry.email === email);
  const application: SellerApplication = {
    ...draft,
    email,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  const next = existing
    ? applications.map((entry) => (entry.email === email ? application : entry))
    : [application, ...applications];
  writeApplications(next);
  return application;
}

export function reviewSellerApplication(
  email: string,
  status: Exclude<SellerApplicationStatus, "pending">,
  reviewNote = "",
): SellerApplication | null {
  const normalized = normalizeEmail(email);
  let reviewed: SellerApplication | null = null;
  const next = readSellerApplications().map((entry): SellerApplication => {
    if (entry.email !== normalized) return entry;
    const note = reviewNote.trim();
    const updated: SellerApplication = {
      email: entry.email,
      name: entry.name,
      storeName: entry.storeName,
      phone: entry.phone,
      productDescription: entry.productDescription,
      bankName: entry.bankName,
      bankAccountNumber: entry.bankAccountNumber,
      status,
      submittedAt: entry.submittedAt,
      reviewedAt: new Date().toISOString(),
      ...(note ? { reviewNote: note } : {}),
    };
    reviewed = updated;
    return updated;
  });
  if (reviewed) writeApplications(next);
  return reviewed;
}

export function subscribeSellerApplications(listener: () => void) {
  if (!canUseStorage()) return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) listener();
  };
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
