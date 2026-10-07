import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CoreCart" },
      { name: "description", content: "Sign in to your CoreCart buyer account." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim().toLowerCase();
    const saved = localStorage.getItem("corecart-demo-profile");
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
          <ArrowLeft size={15} /> Back to CoreCart
        </Link>
        <div className="account-brand">
          <span className="account-mark">C.</span>
          <span>
            CORECART <small>YOUR MARKETPLACE</small>
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
            <small>Preview only. Passwords are not checked or saved.</small>
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
          New to CoreCart? <Link to="/signup">Create an account</Link>
        </p>
        <p className="demo-disclaimer">
          <ShieldCheck size={15} /> Demo profiles live in this browser only; authentication is not
          connected.
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
