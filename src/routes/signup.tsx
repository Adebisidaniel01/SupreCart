import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type BuyerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isVerified: boolean;
};
const profileKey = "corecart-demo-profile";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — CoreCart" },
      { name: "description", content: "Create a CoreCart buyer account." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"details" | "verify" | "done">("details");
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextProfile = {
      firstName: String(data.get("firstName")).trim(),
      lastName: String(data.get("lastName")).trim(),
      email: String(data.get("email")).trim().toLowerCase(),
      phone: String(data.get("phone")).trim(),
      isVerified: false,
    };
    localStorage.setItem(profileKey, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    setStage("verify");
    setError("");
  }

  function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      setError("Please enter your account details before verifying your email.");
      setStage("details");
      return;
    }
    if (code !== "424242") {
      setError("That code doesn’t match. Please check the preview code and try again.");
      return;
    }
    const verified = { ...profile, isVerified: true };
    localStorage.setItem(profileKey, JSON.stringify(verified));
    setProfile(verified);
    setError("");
    setStage("done");
  }

  return (
    <main className="account-page">
      <div className="account-panel">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} /> Back to CoreCart
        </Link>
        <div className="account-brand">
          <span className="account-mark">C.</span>
          <span>
            CORECART <small>YOUR MARKETPLACE</small>
          </span>
        </div>
        {stage === "details" && (
          <>
            <p className="eyebrow">YOUR NEXT GOOD FIND STARTS HERE</p>
            <h1>Create your account</h1>
            <p className="account-intro">One account. A whole marketplace to make your own.</p>
            <form className="account-form" onSubmit={createProfile}>
              <div className="field-pair">
                <label>
                  First name
                  <input name="firstName" autoComplete="given-name" required />
                </label>
                <label>
                  Last name
                  <input name="lastName" autoComplete="family-name" required />
                </label>
              </div>
              <label>
                Email address
                <input type="email" name="email" autoComplete="email" required />
              </label>
              <label>
                Phone number
                <input type="tel" name="phone" autoComplete="tel" placeholder="+234" required />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <small>At least 8 characters. This preview does not store your password.</small>
              </label>
              <Button size="lg" type="submit">
                Create account <ArrowRight size={16} />
              </Button>
            </form>
            <p className="account-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
            <p className="demo-disclaimer">
              <ShieldCheck size={15} /> Account details stay in this browser demo. Verification
              email is simulated; no email is sent.
            </p>
          </>
        )}
        {stage === "verify" && (
          <>
            <p className="eyebrow">ONE QUICK CHECK</p>
            <h1>Verify your email</h1>
            <p className="account-intro">
              Enter the 6-digit code to finish setting up {profile?.email}.
            </p>
            <form className="account-form" onSubmit={verifyEmail}>
              <label>
                Verification code
                <input
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="000000"
                  required
                />
              </label>
              <p className="demo-code">
                Preview verification code: <strong>424242</strong>
              </p>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <Button size="lg" type="submit">
                Verify email <ArrowRight size={16} />
              </Button>
            </form>
            <p className="demo-disclaimer">
              <ShieldCheck size={15} /> This is a browser-only demonstration. No verification email
              was sent.
            </p>
          </>
        )}
        {stage === "done" && (
          <div className="account-success">
            <span className="success-mark">
              <Check />
            </span>
            <p className="eyebrow">ALL SET</p>
            <h1>You’re in, {profile?.firstName}.</h1>
            <p className="account-intro">
              Your demo profile is verified on this browser. Go find something good.
            </p>
            <Button size="lg" onClick={() => navigate({ to: "/shop", search: { filter: "All" } })}>
              Explore the marketplace <ArrowRight size={16} />
            </Button>
            <p className="demo-disclaimer">
              Preview account only. No real account or email verification service is connected.
            </p>
          </div>
        )}
      </div>
      <aside className="account-aside">
        <span>
          GOOD FINDS.
          <br />
          GOOD PEOPLE.
        </span>
        <p>
          A little more considered.
          <br />A lot more to discover.
        </p>
        <div className="account-aside-note">
          Your marketplace,
          <br />
          <strong>your way.</strong>
        </div>
      </aside>
    </main>
  );
}
