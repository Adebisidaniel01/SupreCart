export type DemoAccount = {
  email: string;
  name: string;
  role: "buyer" | "seller";
};

const demoAccounts: DemoAccount[] = [
  { email: "adebisidan01@gmail.com", name: "Daniel Adebisi", role: "buyer" },
  { email: "vickybabs@gmail.com", name: "Victoria Babatunde", role: "buyer" },
  { email: "izzy@gmail.com", name: "Isaac Oyebanji", role: "buyer" },
  { email: "olowe@gmail.com", name: "Olowe Goodness", role: "buyer" },
  { email: "shewa@gmail.com", name: "Bello-lawal Dorcas", role: "seller" },
  { email: "daniella@gmail.com", name: "Daniella Olusegun", role: "seller" },
  { email: "adeniji@gmail.com", name: "Emmanuel Adeniji", role: "seller" },
  { email: "bukunmi@gmail.com", name: "Bukunmi Oluwaseyin", role: "seller" },
];

const demoSessionKey = "suprecart-demo-account";

export function findDemoAccount(email: string, role: DemoAccount["role"]) {
  if (!import.meta.env.DEV) return undefined;
  return demoAccounts.find(
    (account) => account.email === email.trim().toLowerCase() && account.role === role,
  );
}

export function getDemoAccounts(role: DemoAccount["role"]) {
  return import.meta.env.DEV ? demoAccounts.filter((account) => account.role === role) : [];
}

export function saveDemoAccount(account: DemoAccount) {
  if (!import.meta.env.DEV) return;
  window.localStorage.setItem(demoSessionKey, JSON.stringify(account));
}

export function readDemoAccount(role: DemoAccount["role"]) {
  if (!import.meta.env.DEV) return null;
  const savedAccount = window.localStorage.getItem(demoSessionKey);
  if (!savedAccount) return null;
  try {
    const account = JSON.parse(savedAccount) as DemoAccount;
    return findDemoAccount(account.email, role) ?? null;
  } catch (cause) {
    console.error("Could not read the local SupreCart demo account.", cause);
    window.localStorage.removeItem(demoSessionKey);
    return null;
  }
}

export function clearDemoAccount() {
  if (import.meta.env.DEV) window.localStorage.removeItem(demoSessionKey);
}
