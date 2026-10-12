import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  House,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { clearDemoAccount, readDemoAccount, type DemoAccount } from "@/lib/demo-accounts";

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

type BuyerAddress = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lga: string;
  community: string;
  street_address: string;
  landmark: string;
  is_default: boolean;
};

type AccountSection = "overview" | "orders" | "addresses" | "settings";

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
  const [demoAccount, setDemoAccount] = useState<DemoAccount | null>(null);
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [section, setSection] = useState<AccountSection>("overview");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const localDemoAccount = readDemoAccount("buyer");
    if (localDemoAccount) {
      setDemoAccount(localDemoAccount);
      setLoading(false);
      return;
    }
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
    if (demoAccount) {
      setProfile(null);
      setOrders([]);
      setError("");
      setLoading(false);
      return;
    }
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
      client
        .from("buyer_addresses")
        .select(
          "id, first_name, last_name, email, phone, lga, community, street_address, landmark, is_default",
        )
        .eq("buyer_id", user.id)
        .order("is_default", { ascending: false }),
    ])
      .then(([profileResult, ordersResult, addressesResult]) => {
        if (profileResult.error) throw profileResult.error;
        if (ordersResult.error) throw ordersResult.error;
        if (addressesResult.error) throw addressesResult.error;
        if (!active) return;
        setProfile(profileResult.data as BuyerProfile | null);
        setOrders((ordersResult.data ?? []) as BuyerOrder[]);
        setAddresses((addressesResult.data ?? []) as BuyerAddress[]);
        setError("");
      })
      .catch((cause: unknown) => {
        console.error("Could not load the SupreCart buyer account data.", cause);
        if (active)
          setError(cause instanceof Error ? cause.message : "Could not load your account.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [demoAccount, navigate, user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user || demoAccount) return;
    setSaving(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("first_name")).trim();
    const middleName = String(form.get("middle_name")).trim();
    const lastName = String(form.get("last_name")).trim();
    const phone = String(form.get("phone")).trim();
    const { error: updateError } = await supabase.from("buyer_profiles").upsert({
      id: user.id,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      phone: phone || null,
    });
    if (updateError) {
      console.error("Could not update the SupreCart buyer profile.", updateError);
      setError(updateError.message);
    } else {
      setProfile({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        phone: phone || null,
        created_at: profile?.created_at ?? new Date().toISOString(),
      });
      setNotice("Your profile details have been saved.");
    }
    setSaving(false);
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user || demoAccount) return;
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    setNotice("");
    const form = new FormData(formElement);
    const nextAddress = {
      buyer_id: user.id,
      first_name: String(form.get("first_name")).trim(),
      last_name: String(form.get("last_name")).trim(),
      email: String(form.get("email")).trim().toLowerCase(),
      phone: String(form.get("phone")).trim(),
      lga: String(form.get("lga")).trim(),
      community: String(form.get("community")).trim(),
      street_address: String(form.get("street_address")).trim(),
      landmark: String(form.get("landmark")).trim(),
      is_default: addresses.length === 0 || form.get("is_default") === "on",
    };
    if (nextAddress.is_default) {
      const { error: clearDefaultError } = await supabase
        .from("buyer_addresses")
        .update({ is_default: false })
        .eq("buyer_id", user.id);
      if (clearDefaultError) {
        setError(clearDefaultError.message);
        setSaving(false);
        return;
      }
    }
    const { data, error: insertError } = await supabase
      .from("buyer_addresses")
      .insert(nextAddress)
      .select(
        "id, first_name, last_name, email, phone, lga, community, street_address, landmark, is_default",
      )
      .single();
    if (insertError) {
      console.error("Could not add the buyer delivery address.", insertError);
      setError(insertError.message);
    } else {
      setAddresses((current) => [
        ...(data.is_default
          ? current.map((address) => ({ ...address, is_default: false }))
          : current),
        data as BuyerAddress,
      ]);
      formElement.reset();
      setNotice("Delivery address saved.");
    }
    setSaving(false);
  }

  async function removeAddress(addressId: string) {
    if (!supabase || !user || demoAccount) return;
    setError("");
    const { error: deleteError } = await supabase
      .from("buyer_addresses")
      .delete()
      .eq("id", addressId)
      .eq("buyer_id", user.id);
    if (deleteError) {
      console.error("Could not remove the buyer delivery address.", deleteError);
      setError(deleteError.message);
      return;
    }
    setAddresses((current) => current.filter((address) => address.id !== addressId));
  }

  async function signOut() {
    if (demoAccount) {
      clearDemoAccount();
      setDemoAccount(null);
      await navigate({ to: "/login" });
      return;
    }
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

  const firstName =
    demoAccount?.name || profile?.first_name || user?.user_metadata["first_name"] || "there";
  const emailVerified = Boolean(user?.email_confirmed_at);

  return (
    <main className="account-page account-dashboard-layout">
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
            {demoAccount && (
              <p className="demo-disclaimer" role="status">
                Local demo account — email verification and Supabase data are bypassed for testing.
              </p>
            )}
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
        {!loading && (
          <>
            <nav className="account-section-nav" aria-label="Account sections">
              {(
                [
                  ["overview", "Overview", House],
                  ["orders", "Orders", Package],
                  ["addresses", "Addresses", MapPin],
                  ["settings", "Account settings", Settings],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  type="button"
                  key={key}
                  className={section === key ? "active" : ""}
                  onClick={() => {
                    setSection(key);
                    setError("");
                    setNotice("");
                  }}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
              <Link to="/messages" search={{ productId: undefined }}>
                <MessageCircle size={16} /> Messages
              </Link>
            </nav>
            {notice && (
              <p className="account-success-note" role="status">
                {notice}
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {section === "overview" && (
              <>
                <section className="account-summary-grid">
                  <article className="account-summary-card">
                    <span>ORDERS</span>
                    <strong>{orders.length}</strong>
                    <button type="button" onClick={() => setSection("orders")}>
                      View order history <ArrowRight size={14} />
                    </button>
                  </article>
                  <article className="account-summary-card">
                    <span>SAVED ADDRESSES</span>
                    <strong>{addresses.length}</strong>
                    <button type="button" onClick={() => setSection("addresses")}>
                      Manage delivery details <ArrowRight size={14} />
                    </button>
                  </article>
                </section>
                <section className="account-dashboard-card">
                  <h2>Profile overview</h2>
                  <dl>
                    <div>
                      <dt>Name</dt>
                      <dd>
                        {demoAccount?.name ||
                          [profile?.first_name, profile?.middle_name, profile?.last_name]
                            .filter(Boolean)
                            .join(" ") ||
                          firstName}
                      </dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{demoAccount?.email || user?.email}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        {demoAccount
                          ? "Demo data only"
                          : profile?.phone || user?.user_metadata["phone"] || "Not added"}
                      </dd>
                    </div>
                    <div>
                      <dt>Email verification</dt>
                      <dd className="account-verification">
                        <ShieldCheck size={15} />
                        {demoAccount
                          ? "Skipped for local testing"
                          : emailVerified
                            ? "Verified"
                            : "Awaiting confirmation"}
                      </dd>
                    </div>
                  </dl>
                </section>
                <section className="account-dashboard-card">
                  <div className="account-dashboard-section-heading">
                    <h2>Recent orders</h2>
                    <button type="button" onClick={() => setSection("orders")}>
                      See all
                    </button>
                  </div>
                  {orders.length ? (
                    <ul className="account-order-list">
                      {orders.slice(0, 3).map((order) => (
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
                <Button
                  size="lg"
                  onClick={() => navigate({ to: "/shop", search: { filter: "All", query: "" } })}
                >
                  Explore the marketplace <ArrowRight size={16} />
                </Button>
              </>
            )}
            {section === "orders" && (
              <section className="account-dashboard-card">
                <div className="account-dashboard-section-heading">
                  <h2>Order history</h2>
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
                  <p className="account-intro">
                    {demoAccount
                      ? "Demo accounts have no real orders. Complete checkout with a real Supabase account after order processing is connected."
                      : "You have no orders yet. Explore the marketplace to find something good."}
                  </p>
                )}
              </section>
            )}
            {section === "addresses" && (
              <>
                <section className="account-dashboard-card">
                  <h2>Delivery addresses</h2>
                  {demoAccount && (
                    <p className="demo-disclaimer">
                      Local demo accounts cannot save addresses to Supabase.
                    </p>
                  )}
                  {addresses.length ? (
                    <div className="account-address-list">
                      {addresses.map((address) => (
                        <article key={address.id} className="account-address-card">
                          <div>
                            <strong>
                              {address.first_name} {address.last_name}
                            </strong>
                            {address.is_default && <span>DEFAULT</span>}
                          </div>
                          <p>
                            {address.street_address}, {address.community}, {address.lga}
                          </p>
                          <small>
                            {address.phone} · {address.email}
                            {address.landmark ? ` · ${address.landmark}` : ""}
                          </small>
                          {!demoAccount && (
                            <button
                              type="button"
                              className="account-danger-link"
                              onClick={() => void removeAddress(address.id)}
                            >
                              Remove address
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="account-intro">No saved delivery addresses yet.</p>
                  )}
                </section>
                {!demoAccount && (
                  <form className="account-dashboard-card account-form" onSubmit={addAddress}>
                    <h2>Add a delivery address</h2>
                    <div className="field-pair">
                      <label>
                        First name
                        <input
                          name="first_name"
                          defaultValue={profile?.first_name ?? ""}
                          required
                        />
                      </label>
                      <label>
                        Last name
                        <input name="last_name" defaultValue={profile?.last_name ?? ""} required />
                      </label>
                    </div>
                    <div className="field-pair">
                      <label>
                        Email
                        <input
                          name="email"
                          type="email"
                          defaultValue={user?.email ?? ""}
                          required
                        />
                      </label>
                      <label>
                        Phone
                        <input name="phone" type="tel" required />
                      </label>
                    </div>
                    <div className="field-pair">
                      <label>
                        Kwara LGA
                        <input name="lga" placeholder="e.g. Ilorin West" required />
                      </label>
                      <label>
                        Community
                        <input name="community" required />
                      </label>
                    </div>
                    <label>
                      Street address
                      <input name="street_address" required />
                    </label>
                    <label>
                      Landmark (optional)
                      <input name="landmark" />
                    </label>
                    <label className="account-checkbox">
                      <input name="is_default" type="checkbox" />
                      Make this my default delivery address
                    </label>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving address…" : "Save address"}
                    </Button>
                  </form>
                )}
              </>
            )}
            {section === "settings" && (
              <section className="account-dashboard-card">
                <h2>Account settings</h2>
                {demoAccount ? (
                  <p className="demo-disclaimer">
                    Settings are read-only for local demo accounts. Sign in with a Supabase buyer
                    account to update profile data.
                  </p>
                ) : (
                  <>
                    <p className="account-intro">
                      Update the profile attached to your SupreCart buyer account.
                    </p>
                    <form className="account-form" onSubmit={saveProfile}>
                      <label>
                        First name
                        <input
                          name="first_name"
                          defaultValue={
                            profile?.first_name ?? user?.user_metadata["first_name"] ?? ""
                          }
                          required
                        />
                      </label>
                      <label>
                        Middle name
                        <input name="middle_name" defaultValue={profile?.middle_name ?? ""} />
                      </label>
                      <label>
                        Last name
                        <input
                          name="last_name"
                          defaultValue={
                            profile?.last_name ?? user?.user_metadata["last_name"] ?? ""
                          }
                          required
                        />
                      </label>
                      <label>
                        Phone
                        <input
                          name="phone"
                          type="tel"
                          defaultValue={profile?.phone ?? user?.user_metadata["phone"] ?? ""}
                        />
                      </label>
                      <label>
                        Account email
                        <input value={user?.email ?? ""} disabled />
                        <small>Email changes require the Supabase verification flow.</small>
                      </label>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving changes…" : "Save profile"}
                      </Button>
                    </form>
                  </>
                )}
              </section>
            )}
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
