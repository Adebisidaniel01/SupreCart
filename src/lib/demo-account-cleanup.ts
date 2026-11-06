import { accountPreferenceScope, clearAccountPreferences } from "./account-preferences";
import { deleteDemoAccount } from "./demo-accounts";
import { deleteDemoMessagesFor } from "./demo-messages";
import { deleteDemoOrdersFor, deleteDemoProfile } from "./demo-orders";
import { deleteDemoSupportFor } from "./demo-support";
import { deleteSellerApplication } from "./seller-applications";

export function deleteDemoAccountData(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  deleteDemoAccount(normalized);
  deleteSellerApplication(normalized);
  deleteDemoProfile(normalized);
  deleteDemoOrdersFor(normalized);
  deleteDemoMessagesFor(normalized);
  deleteDemoSupportFor(normalized);
  clearAccountPreferences(accountPreferenceScope("buyer", normalized));
  clearAccountPreferences(accountPreferenceScope("seller", normalized));
  window.localStorage.removeItem(`suprecart-demo-addresses:${normalized}`);
  window.localStorage.removeItem(`suprecart-seller-products:${normalized}`);
}
