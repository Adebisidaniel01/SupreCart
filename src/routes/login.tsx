import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim().toLowerCase();
    if (supabase) {
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: String(formData.get("password")),
        });
        if (signInError) throw signInError;
        setError("");
        setMessage("You’re securely signed in to SupreCart.");
      } catch (cause) {
        console.error("Could not sign in to the SupreCart buyer account.", cause);
        setError(cause instanceof Error ? cause.message : "Could not sign in.");
        setMessage("");
      }
      return;
    }
    const saved = localStorage.getItem("suprecart-demo-profile");
    if (!saved) {
      setError("No demo account is saved in this browser yet. Create an account to get started.");
      return;
    }
    let profile: { email?: string; isVerified?: boolean };
    try {
      profile = JSON.parse(saved) as { email?: string; isVerified?: boolean };
    } catch {
      setError("Your saved preview profile could not be read. Please create a new demo account.");
      return;
    }
    if (email !== profile.email) {
      setError("That email does not match the demo account saved in this browser.");
      return;
    }
    if (!profile.isVerified) {
      setError(
        "This demo email has not been verified yet. Create your profile again to complete the preview verification.",
      );
      return;
    }
    setError("");
    setMessage(
      "Your verified demo profile is ready. Account sign-in is a preview and is not securely authenticated.",
    );
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
            <input type="password" name="password" autoComplete="current-password" required />
            <small>
              {supabase
                ? "Use the password you chose when you created your account."
                : "Preview only. Passwords are not checked or saved."}
            </small>
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="form-success">
              {message}
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
          <ShieldCheck size={15} />{" "}
          {supabase
            ? "Your account is securely connected to SupreCart."
            : "Demo profiles live in this browser only; authentication is not connected."}
        </p>
        {message && (
          <Button
            className="account-continue"
            variant="outline"
            onClick={() => navigate({ to: "/shop", search: { filter: "All" } })}
          >
            Browse the marketplace
          </Button>
        )}
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
