import { accountPreferenceScope, clearAccountPreferences } from "./account-preferences";
import { deleteAccount } from "./accounts";
import { deleteMessagesFor } from "./messages";
import { deleteOrdersFor, deleteProfile } from "./orders";
import { deleteSupportFor } from "./support";
import { deleteSellerApplication } from "./seller-applications";

export function deleteAccountData(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  deleteAccount(normalized);
  deleteSellerApplication(normalized);
  deleteProfile(normalized);
  deleteOrdersFor(normalized);
  deleteMessagesFor(normalized);
  deleteSupportFor(normalized);
  clearAccountPreferences(accountPreferenceScope("buyer", normalized));
  clearAccountPreferences(accountPreferenceScope("seller", normalized));
  window.localStorage.removeItem(`suprecart-addresses:${normalized}`);
  window.localStorage.removeItem(`suprecart-seller-products:${normalized}`);
}
