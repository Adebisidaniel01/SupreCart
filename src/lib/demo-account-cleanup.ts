import { accountPreferenceScope, clearAccountPreferences } from "./account-preferences";
import { deleteDemoAccount } from "./demo-accounts";
import { deleteDemoMessagesFor } from "./demo-messages";
import { deleteDemoProfile } from "./demo-orders";
import { deleteSellerApplication } from "./seller-applications";

export function deleteDemoAccountData(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  deleteDemoAccount(normalized);
  deleteSellerApplication(normalized);
  deleteDemoProfile(normalized);
  deleteDemoMessagesFor(normalized);
  clearAccountPreferences(accountPreferenceScope("buyer", normalized));
  clearAccountPreferences(accountPreferenceScope("seller", normalized));
  window.localStorage.removeItem(`suprecart-demo-addresses:${normalized}`);
  window.localStorage.removeItem(`suprecart-seller-products:${normalized}`);
}
