export type DemoAccount = {
  email: string;
  name: string;
  role: "buyer" | "seller";
};

/**
 * The two preview identities that ship with SupreCart. Both are buyers first;
 * the Shewa account also has a pre-approved seller application seeded locally.
 * They need no password, so sign-in is just the listed email address.
 */
const presetAccounts: DemoAccount[] = [
  { email: "blackrose@gmail.com", name: "Daniel Adebisi", role: "buyer" },
  { email: "shewa@gmail.com", name: "Bello-lawal Dorcas", role: "buyer" },
];

const demoSessionKey = "suprecart-demo-account";
const localAccountsKey = "suprecart-local-accounts";
const deletedAccountsKey = "suprecart-deleted-demo-accounts";

type StoredAccount = DemoAccount & {
  salt: string;
  passwordHash: string;
  createdAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readDeletedAccounts(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(deletedAccountsKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((email): email is string => typeof email === "string")
      : [];
  } catch (cause) {
    console.error("Could not read the list of deleted SupreCart demo accounts.", cause);
    return [];
  }
}

export function isDemoAccountDeleted(email: string) {
  return readDeletedAccounts().includes(normalizeEmail(email));
}

function markDemoAccountDeleted(email: string) {
  if (!canUseStorage()) return;
  const normalized = normalizeEmail(email);
  const deleted = readDeletedAccounts();
  if (!deleted.includes(normalized)) {
    window.localStorage.setItem(deletedAccountsKey, JSON.stringify([...deleted, normalized]));
  }
}

function readStoredAccounts(): StoredAccount[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(localAccountsKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is StoredAccount =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as DemoAccount).email === "string" &&
        typeof (entry as DemoAccount).name === "string" &&
        typeof (entry as StoredAccount).passwordHash === "string",
    );
  } catch (cause) {
    console.error("Could not read the locally saved SupreCart accounts.", cause);
    return [];
  }
}

function writeStoredAccounts(accounts: StoredAccount[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(localAccountsKey, JSON.stringify(accounts));
}

function toDemoAccount(account: StoredAccount): DemoAccount {
  return { email: account.email, name: account.name, role: account.role };
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "This browser cannot store a password safely. Use the listed preview account instead.",
    );
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${password}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function findDemoAccount(email: string, role: DemoAccount["role"]) {
  const normalized = normalizeEmail(email);
  const local = readStoredAccounts().find(
    (account) => account.email === normalized && account.role === role,
  );
  if (local) return toDemoAccount(local);
  if (isDemoAccountDeleted(normalized)) return undefined;
  return presetAccounts.find((account) => account.email === normalized && account.role === role);
}

export function isPresetAccount(email: string, role: DemoAccount["role"]) {
  const normalized = normalizeEmail(email);
  if (isDemoAccountDeleted(normalized)) return false;
  return presetAccounts.some((account) => account.email === normalized && account.role === role);
}

export function getDemoAccounts(role: DemoAccount["role"]) {
  const local = readStoredAccounts()
    .filter((account) => account.role === role)
    .map(toDemoAccount);
  return [
    ...presetAccounts.filter(
      (account) => account.role === role && !isDemoAccountDeleted(account.email),
    ),
    ...local,
  ];
}

export function saveDemoAccount(account: DemoAccount) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(demoSessionKey, JSON.stringify(account));
}

export function readDemoAccount(role: DemoAccount["role"]) {
  if (!canUseStorage()) return null;
  const savedAccount = window.localStorage.getItem(demoSessionKey);
  if (!savedAccount) return null;
  try {
    const account = JSON.parse(savedAccount) as DemoAccount;
    const match = findDemoAccount(account.email, role) ?? null;
    if (!match) window.localStorage.removeItem(demoSessionKey);
    return match;
  } catch (cause) {
    console.error("Could not read the local SupreCart preview account.", cause);
    window.localStorage.removeItem(demoSessionKey);
    return null;
  }
}

export function clearDemoAccount() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(demoSessionKey);
}

export function deleteDemoAccount(email: string) {
  if (!canUseStorage()) return;
  const normalized = normalizeEmail(email);
  writeStoredAccounts(readStoredAccounts().filter((account) => account.email !== normalized));
  markDemoAccountDeleted(normalized);
  try {
    const saved = window.localStorage.getItem(demoSessionKey);
    if (saved && normalizeEmail((JSON.parse(saved) as DemoAccount).email) === normalized) {
      window.localStorage.removeItem(demoSessionKey);
    }
  } catch {
    window.localStorage.removeItem(demoSessionKey);
  }
}

/**
 * Creates an account that only exists in this browser. There is no email
 * verification and no server: the password is kept as a salted SHA-256 digest.
 */
export async function createLocalAccount(details: {
  email: string;
  name: string;
  role: DemoAccount["role"];
  password: string;
}): Promise<DemoAccount> {
  const email = details.email.trim().toLowerCase();
  if (findDemoAccount(email, details.role)) {
    throw new Error("An account with that email already exists. Try signing in instead.");
  }
  const salt = randomSalt();
  const accounts = readStoredAccounts();
  accounts.push({
    email,
    name: details.name.trim(),
    role: details.role,
    salt,
    passwordHash: await hashPassword(details.password, salt),
    createdAt: new Date().toISOString(),
  });
  writeStoredAccounts(accounts);
  return { email, name: details.name.trim(), role: details.role };
}

export async function verifyAccountPassword(
  email: string,
  role: DemoAccount["role"],
  password: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const stored = readStoredAccounts().find(
    (account) => account.email === normalized && account.role === role,
  );
  if (!stored) return false;
  return (await hashPassword(password, stored.salt)) === stored.passwordHash;
}
