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
  isVerified: boolean;
};
const profileKey = "suprecart-demo-profile";

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
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [backendMessage, setBackendMessage] = useState("");

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
        isVerified: true,
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
      isVerified: false,
    };
    setProfile(nextProfile);
    setError("");
    if (supabase) {
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
          setBackendMessage("Your buyer profile has been saved securely.");
        } else {
          setStage("verify");
          setBackendMessage(
            `A verification link was sent to ${nextProfile.email}. Open it to finish creating your account.`,
          );
        }
      } catch (cause) {
        console.error("Could not create the SupreCart buyer profile.", cause);
        setError(cause instanceof Error ? cause.message : "Could not create your account.");
        return;
      }
      return;
    }
    localStorage.setItem(profileKey, JSON.stringify(nextProfile));
    setStage("verify");
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      setError("Please enter your account details before verifying your email.");
      setStage("details");
      return;
    }
    if (supabase) {
      setError("Use the verification link sent to your email. No code needs to be entered.");
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
                <small>
                  {supabase
                    ? "At least 8 characters. Use a unique password."
                    : "At least 8 characters. This preview does not store your password."}
                </small>
              </label>
              <Button size="lg" type="submit">
                Create account <ArrowRight size={16} />
              </Button>
            </form>
            <p className="account-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
            <p className="demo-disclaimer">
              <ShieldCheck size={15} />{" "}
              {supabase
                ? "Your buyer profile is stored securely and your email will be verified before access."
                : "Account details stay in this browser demo. Verification email is simulated; no email is sent."}
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
              {supabase ? (
                <p className="account-intro">
                  Check your inbox for the SupreCart verification link. This page will finish your
                  account setup when you return.
                </p>
              ) : (
                <>
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
                </>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              {!supabase && (
                <Button size="lg" type="submit">
                  Verify email <ArrowRight size={16} />
                </Button>
              )}
            </form>
            <p className="demo-disclaimer">
              <ShieldCheck size={15} />{" "}
              {supabase
                ? backendMessage
                : "This is a browser-only demonstration. No verification email was sent."}
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
              {backendMessage ||
                "Your demo profile is verified on this browser. Go find something good."}
            </p>
            <Button size="lg" onClick={() => navigate({ to: "/shop", search: { filter: "All" } })}>
              Explore the marketplace <ArrowRight size={16} />
            </Button>
            <p className="demo-disclaimer">
              {supabase
                ? "Your buyer account is connected to SupreCart."
                : "Preview account only. No real account or email verification service is connected."}
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
