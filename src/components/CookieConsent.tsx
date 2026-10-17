import { useEffect, useState } from "react";

const CONSENT_COOKIE = "suprecart-cookie-consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

const essentialOnly: ConsentPreferences = { necessary: true, analytics: false, marketing: false };

function readConsent(): ConsentPreferences | null {
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

function saveConsent(preferences: ConsentPreferences) {
  const encoded = encodeURIComponent(JSON.stringify(preferences));
  document.cookie = `${CONSENT_COOKIE}=${encoded}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${
    window.location.protocol === "https:" ? "; Secure" : ""
  }`;
}

export function CookieConsent({
  policyHref,
}: {
  policyHref?: string | undefined;
} = {}) {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  function decide(preferences: ConsentPreferences) {
    saveConsent(preferences);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="cookie-consent" aria-label="Cookie choices">
      <div>
        <strong>Cookies on SupreCart</strong>
        <p>
          We use one essential cookie to remember your choice. Optional analytics and marketing
          cookies are not installed yet, so accepting does not turn on any tracker.
          {policyHref && (
            <>
              {" "}
              Read our{" "}
              <a className="cookie-policy-link" href={policyHref}>
                cookie policy
              </a>
              .
            </>
          )}
        </p>
        {showPreferences && (
          <div className="cookie-preferences">
            <label className="cookie-toggle">
              <span>
                <strong>Essential</strong>
                <small>Always on. Remembers this choice.</small>
              </span>
              <input type="checkbox" checked disabled readOnly />
            </label>
            <label className="cookie-toggle">
              <span>
                <strong>Analytics</strong>
                <small>Not installed yet. Off by default.</small>
              </span>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
              />
            </label>
            <label className="cookie-toggle">
              <span>
                <strong>Marketing</strong>
                <small>Not installed yet. Off by default.</small>
              </span>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
              />
            </label>
          </div>
        )}
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-reject" onClick={() => decide(essentialOnly)}>
          Reject optional
        </button>
        {showPreferences ? (
          <button
            type="button"
            className="cookie-accept"
            onClick={() => decide({ necessary: true, analytics, marketing })}
          >
            Save choices
          </button>
        ) : (
          <>
            <button
              type="button"
              className="cookie-manage"
              onClick={() => setShowPreferences(true)}
            >
              Manage
            </button>
            <button
              type="button"
              className="cookie-accept"
              onClick={() => decide({ necessary: true, analytics: true, marketing: true })}
            >
              Accept
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
