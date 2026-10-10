import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, LogOut, Package, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type BuyerProfile = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string | null;
  created_at: string;
};

type BuyerOrder = {
  id: string;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — SupreCart" },
      { name: "description", content: "View your SupreCart buyer account." },
    ],
  }),
  component: BuyerAccount,
});

function BuyerAccount() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setError("Account service is temporarily unavailable. Please try again later.");
      setLoading(false);
      return;
    }

    let active = true;
    const client = supabase;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        void navigate({ to: "/login" });
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    void client.auth
      .getSession()
      .then(({ data: sessionData, error: sessionError }) => {
        if (sessionError) throw sessionError;
        if (!active) return;
        if (!sessionData.session) {
          void navigate({ to: "/login" });
          return;
        }
        setUser(sessionData.session.user);
      })
      .catch((cause: unknown) => {
        console.error("Could not restore the SupreCart buyer session.", cause);
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not load your account.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!supabase || !user) return;
    if (user.user_metadata["role"] === "seller") {
      void navigate({ to: "/sellers" });
      return;
    }

    let active = true;
    setLoading(true);
    const client = supabase;
    void Promise.all([
      client
        .from("buyer_profiles")
        .select("first_name, middle_name, last_name, phone, created_at")
        .eq("id", user.id)
        .maybeSingle(),
      client
        .from("orders")
        .select("id, status, created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false }),
    ])
      .then(([profileResult, ordersResult]) => {
        if (profileResult.error) throw profileResult.error;
        if (ordersResult.error) throw ordersResult.error;
        if (!active) return;
        setProfile(profileResult.data as BuyerProfile | null);
        setOrders((ordersResult.data ?? []) as BuyerOrder[]);
        setError("");
      })
      .catch((cause: unknown) => {
        console.error("Could not load the SupreCart buyer account data.", cause);
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your account.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, user]);

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Could not sign out of the SupreCart buyer account.", signOutError);
      setError(signOutError.message);
      return;
    }
    setUser(null);
    await navigate({ to: "/login" });
  }

  const firstName = profile?.first_name || user?.user_metadata["first_name"] || "there";
  const emailVerified = Boolean(user?.email_confirmed_at);

  return (
    <main className="account-page">
      <section className="account-panel account-dashboard">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} /> Back to SupreCart
        </Link>
        <div className="account-brand">
          <img className="account-mark" src="/suprecart-logo.png" alt="SupreCart" />
          <span>
            SUPRECART <small>YOUR MARKETPLACE</small>
          </span>
        </div>
        <div className="account-dashboard-heading">
          <div>
            <p className="eyebrow">YOUR ACCOUNT</p>
            <h1>Good to see you, {firstName}.</h1>
            <p className="account-intro">Your SupreCart profile and activity.</p>
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut size={15} /> Sign out
          </Button>
        </div>

        {loading && <p className="account-intro">Loading your account…</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && (
          <>
            <section className="account-dashboard-card">
              <h2>Profile</h2>
              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>
                    {[profile?.first_name, profile?.middle_name, profile?.last_name]
                      .filter(Boolean)
                      .join(" ") || firstName}
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{user?.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{profile?.phone || user?.user_metadata["phone"] || "Not added"}</dd>
                </div>
                <div>
                  <dt>Email verification</dt>
                  <dd className="account-verification">
                    <ShieldCheck size={15} />
                    {emailVerified ? "Verified" : "Awaiting confirmation"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="account-dashboard-card">
              <div className="account-dashboard-section-heading">
                <h2>Orders</h2>
                <span>{orders.length}</span>
              </div>
              {orders.length ? (
                <ul className="account-order-list">
                  {orders.map((order) => (
                    <li key={order.id}>
                      <Package size={16} />
                      <span>Order {order.id.slice(0, 8)}</span>
                      <span>{order.status}</span>
                      <time dateTime={order.created_at}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="account-intro">Your order history will appear here.</p>
              )}
            </section>

            <Button size="lg" onClick={() => navigate({ to: "/shop", search: { filter: "All" } })}>
              Explore the marketplace <ArrowRight size={16} />
            </Button>
          </>
        )}
      </section>
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
