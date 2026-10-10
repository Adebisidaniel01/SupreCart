import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

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
  const [stage, setStage] = useState<"details" | "verify" | "done">("details");
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [error, setError] = useState("");
  const [backendMessage, setBackendMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const finishVerifiedProfile = (
      user: {
        email?: string;
        user_metadata?: { first_name?: string; last_name?: string; role?: string };
      } | null,
    ) => {
      if (!user || !active || user.user_metadata?.role !== "buyer") return;
      const verifiedProfile: BuyerProfile = {
        firstName: user.user_metadata.first_name ?? "",
        lastName: user.user_metadata.last_name ?? "",
        email: user.email ?? "",
        phone: "",
      };
      setProfile(verifiedProfile);
      setStage("done");
      setBackendMessage("Your email is verified and your buyer profile is saved to SupreCart.");
    };
    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) {
          console.error("Could not restore the SupreCart buyer session.", sessionError);
          if (active) setError(sessionError.message);
          return;
        }
        finishVerifiedProfile(data.session?.user ?? null);
      })
      .catch((cause: unknown) => {
        console.error("Could not restore the SupreCart buyer session.", cause);
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not restore your account.");
        }
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      finishVerifiedProfile(session?.user ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
    if (!supabase) {
      setError("Account service is temporarily unavailable. Please try again later.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: signUpResult, error: signUpError } = await supabase.auth.signUp({
        email: nextProfile.email,
        password: String(formData.get("password")),
        options: {
          data: {
            first_name: nextProfile.firstName,
            last_name: nextProfile.lastName,
            phone: nextProfile.phone,
            role: "buyer",
          },
          emailRedirectTo: `${window.location.origin}/signup`,
        },
      });
      if (signUpError) throw signUpError;
      if (signUpResult.session) {
        setStage("done");
        setBackendMessage("Your buyer account has been created.");
      } else {
        setStage("verify");
        setBackendMessage(
          `A verification link was sent to ${nextProfile.email}. Open it to finish creating your account.`,
        );
      }
    } catch (cause) {
      console.error("Could not create the SupreCart buyer profile.", cause);
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
              <ShieldCheck size={15} /> Your account details are stored securely. Email confirmation
              may be required before signing in.
            </p>
          </>
        )}
        {stage === "verify" && (
          <>
            <p className="eyebrow">ONE QUICK CHECK</p>
            <h1>Verify your email</h1>
            <p className="account-intro">Check your inbox for the verification link sent to {profile?.email}.</p>
            <div className="account-form">
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
            </div>
            <p className="demo-disclaimer">
              <ShieldCheck size={15} /> {backendMessage}
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
            <Button size="lg" onClick={() => navigate({ to: "/account" })}>
              View your account <ArrowRight size={16} />
            </Button>
            <p className="demo-disclaimer">
              Your buyer account is stored securely with Supabase.
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
