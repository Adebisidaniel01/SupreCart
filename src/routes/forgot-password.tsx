import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetLocalAccountPassword } from "@/lib/accounts";
import { cleanEmail, cleanSecret } from "@/lib/input";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — SupreCart" },
      {
        name: "description",
        content: "Reset the password for a SupreCart account saved in this browser.",
      },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = cleanEmail(formData.get("email"));
    const password = cleanSecret(formData.get("password"));
    const confirmPassword = cleanSecret(formData.get("confirmPassword"));

    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await resetLocalAccountPassword(email, password);
      setDone(true);
    } catch (cause) {
      console.error("Could not reset the SupreCart account password.", cause);
      setError(cause instanceof Error ? cause.message : "Could not reset your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="account-page auth-page">
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
        {done ? (
          <>
            <p className="eyebrow">PASSWORD UPDATED</p>
            <h1>You&rsquo;re all set.</h1>
            <p className="account-intro">
              Your new password is saved in this browser. Sign in with it to continue.
            </p>
            <Button size="lg" asChild>
              <Link to="/login">
                Go to sign in <ArrowRight size={16} />
              </Link>
            </Button>
            <p className="local-data-note">
              <ShieldCheck size={15} /> This reset only changes an account stored in this browser.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">FORGOT PASSWORD</p>
            <h1>Reset your password.</h1>
            <p className="account-intro">
              Enter the email you signed up with, then choose a new password.
            </p>
            <form className="account-form" onSubmit={resetPassword}>
              <label>
                Email address
                <input type="email" name="email" autoComplete="email" required />
              </label>
              <label>
                New password
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <small>At least 8 characters.</small>
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <Button size="lg" type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Reset password"} <ArrowRight size={16} />
              </Button>
            </form>
            <p className="account-switch">
              Remembered it? <Link to="/login">Back to sign in</Link>
            </p>
            <p className="local-data-note">
              <ShieldCheck size={15} /> No email is sent. Accounts listed on the sign-in page do not
              use a password.
            </p>
          </>
        )}
      </div>
      <aside className="account-aside">
        <Link to="/" className="auth-aside-back">
          <ArrowLeft size={15} /> Back to SupreCart
        </Link>
        <img className="auth-aside-logo" src="/suprecart-logo.png" alt="SupreCart" />
        <span>
          A FRESH START
          <br />
          IS ONE STEP AWAY.
        </span>
        <p>
          Reset it.
          <br />
          Get back in.
        </p>
        <div className="account-aside-note">
          Find your kind of
          <br />
          <strong>good.</strong>
        </div>
      </aside>
    </main>
  );
}
