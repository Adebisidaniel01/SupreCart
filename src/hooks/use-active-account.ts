import { useCallback, useEffect, useState } from "react";

import { accountAvatar, subscribeAccountPreferences } from "@/lib/account-preferences";
import {
  clearAccount,
  readActiveAccount,
  subscribeAccount,
  type Account,
} from "@/lib/accounts";

export function useActiveAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [avatar, setAvatar] = useState("");
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    const nextAccount = readActiveAccount();
    setAccount(nextAccount);
    setAvatar(nextAccount ? accountAvatar(nextAccount) : "");
    setReady(true);
  }, []);

  useEffect(() => {
    sync();
    const unsubscribeSession = subscribeAccount(sync);
    const unsubscribePreferences = subscribeAccountPreferences(sync);
    return () => {
      unsubscribeSession();
      unsubscribePreferences();
    };
  }, [sync]);

  const signOut = useCallback(() => {
    clearAccount();
    setAccount(null);
    setAvatar("");
  }, []);

  return { account, avatar, ready, signOut };
}

export function accountFirstName(account: Account | null) {
  if (!account) return "";
  return account.name.trim().split(/\s+/)[0] || account.email.split("@")[0] || "there";
}

export function accountInitials(account: Account | null) {
  if (!account) return "";
  const parts = account.name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return account.email.slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}
