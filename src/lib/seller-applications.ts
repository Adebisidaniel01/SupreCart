import { isAccountDeleted } from "./accounts";
import { cleanEmail, cleanMultiline, cleanPhone, cleanText } from "./input";

export type SellerApplicationStatus = "pending" | "approved" | "rejected";

export type SellerApplication = {
  email: string;
  name: string;
  storeName: string;
  phone: string;
  productDescription: string;
  status: SellerApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export type SellerApplicationDraft = Pick<
  SellerApplication,
  "email" | "name" | "storeName" | "phone" | "productDescription"
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
    status: "approved",
    submittedAt: "2026-08-28T09:30:00.000Z",
    reviewedAt: "2026-08-30T11:15:00.000Z",
    reviewNote: "Seller approved for the marketplace.",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const applicationStatuses = new Set<SellerApplicationStatus>(["pending", "approved", "rejected"]);
const maxApplications = 200;

function validTimestamp(value: unknown) {
  const timestamp = cleanText(value, 40);
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : "";
}

function normalizeApplication(value: unknown): SellerApplication | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as Partial<SellerApplication>;
  const email = cleanEmail(entry.email);
  const name = cleanText(entry.name, 120);
  const storeName = cleanText(entry.storeName, 120);
  const phone = cleanPhone(entry.phone);
  const productDescription = cleanMultiline(entry.productDescription, 2_000);
  const status = entry.status;
  const submittedAt = validTimestamp(entry.submittedAt);
  if (!email || !name || !storeName || !phone || !productDescription) return null;
  if (!status || !applicationStatuses.has(status) || !submittedAt) return null;
  const reviewedAt = validTimestamp(entry.reviewedAt);
  const reviewNote = cleanText(entry.reviewNote, 300);
  return {
    email,
    name,
    storeName,
    phone,
    productDescription,
    status,
    submittedAt,
    ...(reviewedAt ? { reviewedAt } : {}),
    ...(reviewNote ? { reviewNote } : {}),
  };
}

function normalizeApplications(value: unknown): SellerApplication[] {
  if (!Array.isArray(value)) return [];
  const applications: SellerApplication[] = [];
  for (const entry of value.slice(-maxApplications)) {
    const application = normalizeApplication(entry);
    if (!application) continue;
    const existing = applications.findIndex((item) => item.email === application.email);
    if (existing >= 0) applications[existing] = application;
    else applications.push(application);
  }
  return applications;
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
    if (isAccountDeleted(application.email)) continue;
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
    return ensureSeeded(normalizeApplications(parsed)).sort(
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
  const application = normalizeApplication({
    ...draft,
    status: "pending",
    submittedAt: new Date().toISOString(),
  });
  if (!application) {
    throw new Error("Complete the seller application with valid details before submitting.");
  }
  const applications = readSellerApplications();
  const existing = applications.find((entry) => entry.email === application.email);
  const next = existing
    ? applications.map((entry) => (entry.email === application.email ? application : entry))
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
    const note = cleanText(reviewNote, 300);
    const updated: SellerApplication = {
      email: entry.email,
      name: entry.name,
      storeName: entry.storeName,
      phone: entry.phone,
      productDescription: entry.productDescription,
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
