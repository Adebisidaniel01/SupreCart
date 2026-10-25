import { useEffect, useState } from "react";

import {
  essentialOnly,
  readConsent,
  saveConsent,
  type ConsentPreferences,
} from "@/lib/consent";

export type { ConsentPreferences } from "@/lib/consent";

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
          We use one essential cookie to remember your choice. Google Analytics cookies are only
          set if you allow analytics. Marketing cookies are not installed.
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
                <small>Google Analytics. Off unless you accept.</small>
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
                <small>Not installed. Off by default.</small>
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
