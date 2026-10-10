import { useEffect, useState } from "react";

const CONSENT_COOKIE = "suprecart-cookie-consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type ConsentChoice = "accepted" | "rejected";

function readConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`));
  const value = entry?.slice(CONSENT_COOKIE.length + 1);
  return value === "accepted" || value === "rejected" ? value : null;
}

function saveConsent(choice: ConsentChoice) {
  document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${
    window.location.protocol === "https:" ? "; Secure" : ""
  }`;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  function choose(choice: ConsentChoice) {
    saveConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="cookie-consent" aria-label="Cookie choices">
      <div>
        <strong>Cookies on SupreCart</strong>
        <p>
          We use an essential cookie to remember your choice. Optional analytics and marketing
          cookies are not enabled.
        </p>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-reject" onClick={() => choose("rejected")}>
          Reject optional
        </button>
        <button type="button" className="cookie-accept" onClick={() => choose("accepted")}>
          Accept
        </button>
      </div>
    </aside>
  );
}
