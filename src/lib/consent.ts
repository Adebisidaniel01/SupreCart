export const CONSENT_COOKIE = "suprecart-cookie-consent";
export const CONSENT_CHANGE_EVENT = "suprecart-consent-change";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export const essentialOnly: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function readConsent(): ConsentPreferences | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`));
  const value = entry?.slice(CONSENT_COOKIE.length + 1);
  if (!value) return null;
  if (value === "accepted") return { necessary: true, analytics: true, marketing: true };
  if (value === "rejected") return essentialOnly;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<ConsentPreferences>;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function saveConsent(preferences: ConsentPreferences) {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(JSON.stringify(preferences));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encoded}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(
    new CustomEvent<ConsentPreferences>(CONSENT_CHANGE_EVENT, { detail: preferences }),
  );
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}
