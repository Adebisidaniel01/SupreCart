import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { findDemoAccount, getDemoAccounts, saveDemoAccount } from "@/lib/demo-accounts";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SupreCart" },
      { name: "description", content: "Sign in to your SupreCart buyer account." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim().toLowerCase();
    const demoAccount = findDemoAccount(email, "buyer");
    if (demoAccount) {
      saveDemoAccount(demoAccount);
      await navigate({ to: "/account" });
      return;
    }
    const password = String(formData.get("password"));
    if (import.meta.env.DEV && !password) {
      setError("Enter a listed demo buyer email, or provide a password for a Supabase account.");
      return;
    }
    if (!supabase) {
      setError("Account service is temporarily unavailable. Please try again later.");
      return;
    }
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      setError("");
      await navigate({ to: "/account" });
    } catch (cause) {
      console.error("Could not sign in to the SupreCart buyer account.", cause);
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
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
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Good to see you.</h1>
        <p className="account-intro">Sign in to pick up right where you left off.</p>
        <form className="account-form" onSubmit={signIn}>
          <label>
            Email address
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required={!import.meta.env.DEV}
            />
            <small>
              {import.meta.env.DEV
                ? "For a listed local demo buyer, leave this blank. Otherwise use your Supabase password."
                : "Use the password you chose when you created your account."}
            </small>
          </label>
          {import.meta.env.DEV && (
            <div className="demo-disclaimer">
              <ShieldCheck size={15} />
              <span>
                Local demo accounts (no password or email verification):
                {getDemoAccounts("buyer").map((account) => (
                  <span key={account.email}>
                    <br />
                    {account.name} — {account.email}
                  </span>
                ))}
              </span>
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button size="lg" type="submit">
            Sign in <ArrowRight size={16} />
          </Button>
        </form>
        <p className="account-switch">
          New to SupreCart? <Link to="/signup">Create an account</Link>
        </p>
        <p className="demo-disclaimer">
          <ShieldCheck size={15} /> Your account is securely connected to SupreCart.
        </p>
      </div>
      <aside className="account-aside">
        <span>
          THE GOOD STUFF
          <br />
          IS STILL OUT THERE.
        </span>
        <p>
          Come on in.
          <br />
          Take a look around.
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
