import { cleanEmail, cleanSecret, cleanText } from "./input";

export type Account = {
  email: string;
  name: string;
  role: "buyer" | "seller";
};

/**
 * The two built-in identities that ship with SupreCart. Both are buyers first;
 * the Shewa account also has a pre-approved seller application seeded locally.
 * They need no password, so sign-in is just the listed email address.
 */
const presetAccounts: Account[] = [
  { email: "blackrose@gmail.com", name: "Daniel Adebisi", role: "buyer" },
  { email: "shewa@gmail.com", name: "Bello-lawal Dorcas", role: "buyer" },
];

const sessionKey = "suprecart-account-session";
const localAccountsKey = "suprecart-local-accounts";
const deletedAccountsKey = "suprecart-deleted-accounts";
const moderationKey = "suprecart-account-moderation";
const sessionChangeEvent = "suprecart-session-change";
const moderationChangeEvent = "suprecart-account-moderation-change";

export type AccountModerationStatus = "active" | "warned" | "banned";

export type AccountModeration = {
  email: string;
  status: AccountModerationStatus;
  reason: string;
  updatedAt: string;
};

const defaultModeration: AccountModeration = {
  email: "",
  status: "active",
  reason: "",
  updatedAt: "",
};

type StoredAccount = Account & {
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
    if (!Array.isArray(parsed)) return [];
    const deleted = new Set<string>();
    for (const entry of parsed.slice(0, 500)) {
      const email = cleanEmail(entry);
      if (email) deleted.add(email);
    }
    return [...deleted];
  } catch (cause) {
    console.error("Could not read the list of deleted SupreCart accounts.", cause);
    return [];
  }
}

export function isAccountDeleted(email: string) {
  return readDeletedAccounts().includes(normalizeEmail(email));
}

function isModerationStatus(value: unknown): value is AccountModerationStatus {
  return value === "active" || value === "warned" || value === "banned";
}

function readModerationMap(): Record<string, AccountModeration> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(moderationKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const map: Record<string, AccountModeration> = {};
    for (const [email, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== "object" || value === null) continue;
      const entry = value as Partial<AccountModeration>;
      const normalizedEmail = cleanEmail(email);
      if (!normalizedEmail || !isModerationStatus(entry.status)) continue;
      map[normalizedEmail] = {
        email: normalizedEmail,
        status: entry.status,
        reason: cleanText(entry.reason, 300),
        updatedAt: cleanText(entry.updatedAt, 40),
      };
    }
    return map;
  } catch (cause) {
    console.error("Could not read the SupreCart account moderation state.", cause);
    return {};
  }
}

function writeModerationMap(map: Record<string, AccountModeration>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(moderationKey, JSON.stringify(map));
  window.dispatchEvent(new Event(moderationChangeEvent));
}

export function getAccountModeration(email: string): AccountModeration {
  const normalized = normalizeEmail(email);
  return (
    readModerationMap()[normalized] ?? {
      ...defaultModeration,
      email: normalized,
    }
  );
}

export function setAccountModeration(
  email: string,
  status: AccountModerationStatus,
  reason = "",
): AccountModeration {
  const normalized = normalizeEmail(email);
  const entry: AccountModeration = {
    email: normalized,
    status,
    reason: cleanText(reason, 300),
    updatedAt: new Date().toISOString(),
  };
  writeModerationMap({ ...readModerationMap(), [normalized]: entry });
  return entry;
}

export function subscribeAccountModeration(listener: () => void) {
  if (!canUseStorage()) return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === moderationKey) listener();
  };
  window.addEventListener(moderationChangeEvent, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(moderationChangeEvent, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function markAccountDeleted(email: string) {
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
    const accounts: StoredAccount[] = [];
    for (const value of parsed.slice(-100)) {
      if (typeof value !== "object" || value === null) continue;
      const entry = value as Partial<StoredAccount>;
      const email = cleanEmail(entry.email);
      const name = cleanText(entry.name, 120);
      const role = entry.role === "seller" ? "seller" : entry.role === "buyer" ? "buyer" : null;
      const salt = cleanText(entry.salt, 120);
      const passwordHash = cleanText(entry.passwordHash, 500);
      if (!email || !name || !role || !salt || !passwordHash) continue;
      accounts.push({
        email,
        name,
        role,
        salt,
        passwordHash,
        createdAt: cleanText(entry.createdAt, 40),
      });
    }
    return accounts;
  } catch (cause) {
    console.error("Could not read the locally saved SupreCart accounts.", cause);
    return [];
  }
}

function writeStoredAccounts(accounts: StoredAccount[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(localAccountsKey, JSON.stringify(accounts));
}

function toAccount(account: StoredAccount): Account {
  return { email: account.email, name: account.name, role: account.role };
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const passwordHashPrefix = "pbkdf2-sha256";
const PASSWORD_ITERATIONS = 600_000;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;

function toHex(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(
  password: string,
  salt: string,
  iterations = PASSWORD_ITERATIONS,
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "This browser cannot store a password safely. Use one of the listed accounts instead.",
    );
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return toHex(bits);
}

async function legacyHashPassword(password: string, salt: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "This browser cannot store a password safely. Use one of the listed accounts instead.",
    );
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${password}`),
  );
  return toHex(digest);
}

function formatPasswordHash(iterations: number, hash: string) {
  return `${passwordHashPrefix}$${iterations}$${hash}`;
}

function parsePasswordHash(value: string): { iterations: number; hash: string } | null {
  const [scheme, iterations, hash] = value.split("$");
  if (scheme !== passwordHashPrefix || !iterations || !hash) return null;
  if (!/^[a-f0-9]{64}$/i.test(hash)) return null;
  const parsedIterations = Number(iterations);
  if (!Number.isInteger(parsedIterations) || parsedIterations < 100_000) return null;
  return { iterations: parsedIterations, hash };
}

function constantTimeEqual(first: string, second: string) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
}

function validatedPassword(value: unknown) {
  const password = cleanSecret(value, PASSWORD_MAX_LENGTH);
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Choose a password with at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  return password;
}

export function findAccount(email: string, role: Account["role"]) {
  const normalized = normalizeEmail(email);
  const local = readStoredAccounts().find(
    (account) => account.email === normalized && account.role === role,
  );
  if (local) return toAccount(local);
  if (isAccountDeleted(normalized)) return undefined;
  return presetAccounts.find((account) => account.email === normalized && account.role === role);
}

export function isPresetAccount(email: string, role: Account["role"]) {
  const normalized = normalizeEmail(email);
  if (isAccountDeleted(normalized)) return false;
  return presetAccounts.some((account) => account.email === normalized && account.role === role);
}

export function getPresetAccounts(role: Account["role"]) {
  return presetAccounts.filter(
    (account) => account.role === role && !isAccountDeleted(account.email),
  );
}

export function getAccounts(role: Account["role"]) {
  const local = readStoredAccounts()
    .filter((account) => account.role === role)
    .map(toAccount);
  return [...getPresetAccounts(role), ...local];
}

/** Every buyer and seller account known to this browser, without duplicates. */
export function getAllAccounts(): Account[] {
  const seen = new Set<string>();
  return [
    ...presetAccounts.filter((account) => !isAccountDeleted(account.email)),
    ...readStoredAccounts().map(toAccount),
  ].filter((account) => {
    const key = `${account.role}:${normalizeEmail(account.email)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function saveAccount(account: Account) {
  if (!canUseStorage()) return;
  const role = account.role === "seller" ? "seller" : "buyer";
  const match = findAccount(account.email, role);
  if (!match) throw new Error("That account is not available in this browser.");
  window.localStorage.setItem(sessionKey, JSON.stringify(match));
  window.dispatchEvent(new Event(sessionChangeEvent));
}

function notifySessionChange() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(sessionChangeEvent));
}

/** Returns the signed-in buyer or seller without assuming a role. */
export function readActiveAccount(): Account | null {
  if (!canUseStorage()) return null;
  const savedAccount = window.localStorage.getItem(sessionKey);
  if (!savedAccount) return null;
  try {
    const account = JSON.parse(savedAccount) as Partial<Account>;
    const email = cleanEmail(account.email);
    if (!email) {
      window.localStorage.removeItem(sessionKey);
      return null;
    }
    const role = account.role === "seller" ? "seller" : "buyer";
    const match = findAccount(email, role) ?? null;
    if (!match || getAccountModeration(match.email).status === "banned") {
      window.localStorage.removeItem(sessionKey);
      return null;
    }
    const sessionName = cleanText(account.name, 120) || match.name;
    return { email: match.email, name: sessionName, role: match.role };
  } catch (cause) {
    console.error("Could not read the local SupreCart account.", cause);
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function subscribeAccount(listener: () => void) {
  if (!canUseStorage()) return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === sessionKey) listener();
  };
  window.addEventListener(sessionChangeEvent, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(sessionChangeEvent, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function readAccount(role: Account["role"]) {
  const account = readActiveAccount();
  return account?.role === role ? account : null;
}

export function clearAccount() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(sessionKey);
  notifySessionChange();
}

export function deleteAccount(email: string) {
  if (!canUseStorage()) return;
  const normalized = normalizeEmail(email);
  writeStoredAccounts(readStoredAccounts().filter((account) => account.email !== normalized));
  markAccountDeleted(normalized);
  const moderation = readModerationMap();
  if (moderation[normalized]) {
    delete moderation[normalized];
    writeModerationMap(moderation);
  }
  try {
    const saved = window.localStorage.getItem(sessionKey);
    if (saved && normalizeEmail((JSON.parse(saved) as Account).email) === normalized) {
      window.localStorage.removeItem(sessionKey);
      notifySessionChange();
    }
  } catch {
    window.localStorage.removeItem(sessionKey);
    notifySessionChange();
  }
}

/** Gives an approved buyer a seller-side identity in this browser. */
export function ensureSellerAccount(buyer: Account): Account {
  const existing = findAccount(buyer.email, "seller");
  if (existing) return existing;
  const accounts = readStoredAccounts();
  const account: StoredAccount = {
    email: normalizeEmail(buyer.email),
    name: buyer.name,
    role: "seller",
    salt: "approved-seller",
    passwordHash: "approved-seller",
    createdAt: new Date().toISOString(),
  };
  writeStoredAccounts([
    ...accounts.filter((entry) => !(entry.email === account.email && entry.role === account.role)),
    account,
  ]);
  return toAccount(account);
}

/** Keeps the active session, navbar and stored account in sync after a profile edit. */
export function updateAccountName(email: string, name: string) {
  if (!canUseStorage()) return;
  const normalized = normalizeEmail(email);
  const trimmed = cleanText(name, 120);
  if (!trimmed) return;
  writeStoredAccounts(
    readStoredAccounts().map((account) =>
      account.email === normalized ? { ...account, name: trimmed } : account,
    ),
  );
  const active = readActiveAccount();
  if (active && active.email === normalized) {
    window.localStorage.setItem(sessionKey, JSON.stringify({ ...active, name: trimmed }));
    notifySessionChange();
  }
}

/**
 * Creates an account that only exists in this browser. There is no email
 * verification and no server: the password is kept as a salted PBKDF2 digest.
 */
export async function createLocalAccount(details: {
  email: string;
  name: string;
  role: Account["role"];
  password: string;
}): Promise<Account> {
  const email = cleanEmail(details.email);
  const name = cleanText(details.name, 120);
  const role = details.role === "seller" ? "seller" : details.role === "buyer" ? "buyer" : null;
  if (!role) throw new Error("Choose a valid account type.");
  if (!email) throw new Error("Enter a valid email address.");
  if (!name) throw new Error("Enter your name.");
  const password = validatedPassword(details.password);
  if (findAccount(email, role)) {
    throw new Error("An account with that email already exists. Try signing in instead.");
  }
  const salt = randomSalt();
  const accounts = readStoredAccounts();
  accounts.push({
    email,
    name,
    role,
    salt,
    passwordHash: formatPasswordHash(PASSWORD_ITERATIONS, await hashPassword(password, salt)),
    createdAt: new Date().toISOString(),
  });
  writeStoredAccounts(accounts);
  return { email, name, role };
}

export async function verifyAccountPassword(
  email: string,
  role: Account["role"],
  password: string,
): Promise<boolean> {
  const normalized = cleanEmail(email);
  const passwordValue = cleanSecret(password, PASSWORD_MAX_LENGTH);
  if (!normalized || !passwordValue) return false;
  const stored = readStoredAccounts().find(
    (account) => account.email === normalized && account.role === role,
  );
  if (!stored) return false;

  const parsed = parsePasswordHash(stored.passwordHash);
  if (parsed) {
    const candidate = await hashPassword(passwordValue, stored.salt, parsed.iterations);
    return constantTimeEqual(candidate, parsed.hash);
  }

  const legacyCandidate = await legacyHashPassword(passwordValue, stored.salt);
  if (!constantTimeEqual(legacyCandidate, stored.passwordHash)) return false;

  // Upgrade older SHA-256 accounts the next time the correct password is used.
  try {
    const salt = randomSalt();
    const upgraded = await hashPassword(passwordValue, salt);
    writeStoredAccounts(
      readStoredAccounts().map((account) =>
        account.email === stored.email && account.role === stored.role
          ? {
              ...account,
              salt,
              passwordHash: formatPasswordHash(PASSWORD_ITERATIONS, upgraded),
            }
          : account,
      ),
    );
  } catch (cause) {
    console.error("Could not upgrade the saved SupreCart password hash.", cause);
  }
  return true;
}

/**
 * Resets the password for any locally saved account using the email. The
 * accounts ship without passwords, so this only works for accounts created in
 * this browser.
 */
export async function resetLocalAccountPassword(email: string, password: string): Promise<void> {
  const normalized = cleanEmail(email);
  if (!normalized) throw new Error("Enter the email you signed up with.");
  const passwordValue = validatedPassword(password);
  const accounts = readStoredAccounts();
  const matching = accounts.filter((account) => account.email === normalized);
  if (matching.length === 0) {
    throw new Error(
      "No account saved in this browser uses that email. The accounts listed on the sign-in page do not need a password.",
    );
  }
  const salt = randomSalt();
  const passwordHash = formatPasswordHash(
    PASSWORD_ITERATIONS,
    await hashPassword(passwordValue, salt),
  );
  writeStoredAccounts(
    accounts.map((account) =>
      account.email === normalized ? { ...account, salt, passwordHash } : account,
    ),
  );
}
