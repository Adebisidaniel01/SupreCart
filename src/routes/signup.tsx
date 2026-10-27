import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackSignUp } from "@/lib/analytics";
import { createLocalAccount, saveDemoAccount } from "@/lib/demo-accounts";

type BuyerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — SupreCart" },
      { name: "description", content: "Create a SupreCart buyer account." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<"details" | "done">("details");
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [error, setError] = useState("");
  const [backendMessage, setBackendMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextProfile = {
      firstName: String(formData.get("firstName")).trim(),
      lastName: String(formData.get("lastName")).trim(),
      email: String(formData.get("email")).trim().toLowerCase(),
      phone: String(formData.get("phone")).trim(),
    };
    setProfile(nextProfile);
    setError("");
    setSubmitting(true);
    try {
      const account = await createLocalAccount({
        email: nextProfile.email,
        name: `${nextProfile.firstName} ${nextProfile.lastName}`.trim(),
        role: "buyer",
        password: String(formData.get("password")),
      });
      saveDemoAccount(account);
      trackSignUp("buyer_preview");
      setBackendMessage(
        "Your buyer account is saved in this browser. No email verification is needed.",
      );
      setStage("done");
    } catch (cause) {
      console.error("Could not create the SupreCart buyer account.", cause);
      setError(cause instanceof Error ? cause.message : "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="account-page">
      <div className="account-panel">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} /> Back to SupreCart
        </Link>
        <div className="account-brand">
          <img className="account-mark" src="/suprecart-logo.png" alt="SupreCart" />
          <span>
            SUPRECART <small>YOUR MARKETPLACE</small>
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
                <small>At least 8 characters. Use a unique password.</small>
              </label>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <Button size="lg" type="submit" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"} <ArrowRight size={16} />
              </Button>
            </form>
            <p className="account-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
            <p className="demo-disclaimer">
              <ShieldCheck size={15} /> Account details are stored in this browser only. No email
              confirmation is required.
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
              {backendMessage || "Your SupreCart buyer account is ready."}
            </p>
            <Button size="lg" onClick={() => navigate({ to: "/" })}>
              Go to your homepage <ArrowRight size={16} />
            </Button>
            <p className="demo-disclaimer">Your buyer account is stored in this browser only.</p>
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
