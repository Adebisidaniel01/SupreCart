import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackLogin } from "@/lib/analytics";
import {
  ensureSellerAccount,
  findDemoAccount,
  getAccountModeration,
  getDemoAccounts,
  isPresetAccount,
  saveDemoAccount,
  verifyAccountPassword,
} from "@/lib/demo-accounts";
import { getSellerApplication } from "@/lib/seller-applications";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SupreCart" },
      { name: "description", content: "Sign in to your SupreCart buyer or seller account." },
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
    const password = String(formData.get("password"));
    const sellerAccount = findDemoAccount(email, "seller");
    const buyerAccount = findDemoAccount(email, "buyer");
    const approvedBuyer =
      buyerAccount && getSellerApplication(buyerAccount.email)?.status === "approved"
        ? ensureSellerAccount(buyerAccount)
        : null;
    const demoAccount = sellerAccount ?? approvedBuyer ?? buyerAccount;
    if (!demoAccount) {
      setError("No account matches that email yet. Create an account first.");
      return;
    }
    const moderation = getAccountModeration(demoAccount.email);
    if (moderation.status === "banned") {
      setError(
        moderation.reason
          ? `This account is banned: ${moderation.reason}`
          : "This account has been banned by an administrator.",
      );
      return;
    }
    const passwordFree =
      isPresetAccount(email, demoAccount.role) ||
      Boolean(approvedBuyer && isPresetAccount(email, "buyer"));
    if (!passwordFree) {
      try {
        const passwordRoles = [
          ...(sellerAccount ? (["seller"] as const) : []),
          ...(buyerAccount ? (["buyer"] as const) : []),
        ];
        let passwordMatches = false;
        for (const role of passwordRoles) {
          if (await verifyAccountPassword(email, role, password)) {
            passwordMatches = true;
            break;
          }
        }
        if (!passwordMatches) {
          setError("That password does not match this account. Please try again.");
          return;
        }
      } catch (cause) {
        console.error("Could not check the SupreCart account password.", cause);
        setError(cause instanceof Error ? cause.message : "Could not sign in.");
        return;
      }
    }
    saveDemoAccount(demoAccount);
    trackLogin(demoAccount.role === "seller" ? "seller_preview" : "buyer_preview");
    setError("");
    await navigate({ to: demoAccount.role === "seller" ? "/sellers" : "/" });
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
            <input type="password" name="password" autoComplete="current-password" />
            <small>
              Use the password you chose when you created your account. Preview accounts can sign in
              without one.
            </small>
          </label>
          <div className="demo-disclaimer">
            <ShieldCheck size={15} />
            <span>
              Preview buyer accounts and approved seller accounts (no password or email
              verification):
              {getDemoAccounts("buyer").map((account) => (
                <span key={account.email}>
                  <br />
                  {account.name} — {account.email}
                </span>
              ))}
            </span>
          </div>
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
          <ShieldCheck size={15} /> Preview accounts are stored in this browser only.
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
