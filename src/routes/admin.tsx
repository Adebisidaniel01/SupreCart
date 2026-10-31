import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Check,
  Eye,
  KeyRound,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  UserRound,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkAdminSession, getAdminDashboard, signInToAdmin, signOutOfAdmin } from "@/lib/admin";
import { accountAvatar } from "@/lib/account-preferences";
import { deleteDemoAccountData } from "@/lib/demo-account-cleanup";
import {
  getAllDemoAccounts,
  getAccountModeration,
  setAccountModeration,
  subscribeAccountModeration,
  type AccountModerationStatus,
  type DemoAccount,
} from "@/lib/demo-accounts";
import {
  readSellerApplications,
  reviewSellerApplication,
  subscribeSellerApplications,
  type SellerApplication,
} from "@/lib/seller-applications";

type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

type AdminPerson = DemoAccount & {
  avatar: string;
  status: AccountModerationStatus;
  reason: string;
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — SupreCart" },
      { name: "description", content: "Private SupreCart marketplace administration dashboard." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sellerApplications, setSellerApplications] = useState<SellerApplication[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<AdminPerson[]>([]);
  const [peopleFilter, setPeopleFilter] = useState<"all" | "buyer" | "seller">("all");
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        if (await checkAdminSession()) {
          const data = await getAdminDashboard();
          if (active) setDashboard(data);
        }
      } catch (error) {
        console.error("Could not restore the SupreCart admin session.", error);
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "The admin dashboard could not be loaded. Please try again.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dashboard) {
      setSellerApplications([]);
      return;
    }
    const syncApplications = () => setSellerApplications(readSellerApplications());
    syncApplications();
    return subscribeSellerApplications(syncApplications);
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard) {
      setPeople([]);
      return;
    }
    const syncPeople = () =>
      setPeople(
        getAllDemoAccounts().map((account) => {
          const moderation = getAccountModeration(account.email);
          return {
            ...account,
            avatar: accountAvatar(account),
            status: moderation.status,
            reason: moderation.reason,
          };
        }),
      );
    syncPeople();
    const unsubscribe = subscribeAccountModeration(syncPeople);
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === "suprecart-local-accounts" ||
        event.key === "suprecart-account-moderation"
      ) {
        syncPeople();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, [dashboard]);

  function refreshPeople() {
    setPeople(
      getAllDemoAccounts().map((account) => {
        const moderation = getAccountModeration(account.email);
        return {
          ...account,
          avatar: accountAvatar(account),
          status: moderation.status,
          reason: moderation.reason,
        };
      }),
    );
  }

  function moderatePerson(person: AdminPerson, status: AccountModerationStatus) {
    const note = status === "active" ? "" : (moderationNotes[person.email] ?? person.reason);
    setAccountModeration(person.email, status, note);
    refreshPeople();
    setModerationNotes((current) => ({ ...current, [person.email]: "" }));
    setMessage(
      status === "banned"
        ? `${person.name} is banned and can no longer sign in.`
        : status === "warned"
          ? `${person.name} was warned. The note is visible on their account record.`
          : `${person.name} is active again.`,
    );
  }

  function removePerson(person: AdminPerson) {
    deleteDemoAccountData(person.email);
    refreshPeople();
    setSellerApplications(readSellerApplications());
    setMessage(`${person.name}'s local account and data were deleted.`);
  }

  function reviewApplication(application: SellerApplication, status: "approved" | "rejected") {
    const reviewed = reviewSellerApplication(
      application.email,
      status,
      reviewNotes[application.email] ?? "",
    );
    if (!reviewed) return;
    setSellerApplications(readSellerApplications());
    setReviewNotes((current) => ({ ...current, [application.email]: "" }));
    setMessage(
      status === "approved"
        ? `${reviewed.storeName} is now approved. The seller studio is unlocked for that buyer.`
        : `${reviewed.storeName} was not approved. The buyer can update and resubmit.`,
    );
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const success = await signInToAdmin({ data: { password } });
      if (!success) {
        setMessage("That password didn't match. Please try again.");
        return;
      }
      setPassword("");
      setDashboard(await getAdminDashboard());
    } catch (error) {
      console.error("Could not sign in to the SupreCart admin dashboard.", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Sign-in could not be completed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setSubmitting(true);
    setMessage("");
    try {
      await signOutOfAdmin();
      setDashboard(null);
    } catch (error) {
      console.error("Could not sign out of the SupreCart admin dashboard.", error);
      setMessage("Sign-out could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-loading" role="status">
        <img className="admin-brand-mark" src="/suprecart-logo.png" alt="SupreCart" />
        <span>Opening your workspace…</span>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="admin-login">
        <section className="admin-login-card">
          <Link to="/" className="admin-back-link">
            <ArrowLeft size={15} /> Back to SupreCart
          </Link>
          <img className="admin-brand-mark" src="/suprecart-logo.png" alt="SupreCart" />
          <div className="admin-lock-icon">
            <KeyRound size={20} />
          </div>
          <p className="admin-kicker">SUPRECART · PRIVATE WORKSPACE</p>
          <h1>
            Good to have you <span>back.</span>
          </h1>
          <p className="admin-login-intro">
            Enter your admin password to open the marketplace overview.
          </p>
          <form className="admin-login-form" onSubmit={handleSignIn}>
            <label htmlFor="admin-password">Admin password</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
            {message && (
              <p role="alert" className="admin-error">
                {message}
              </p>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Checking…" : "Open dashboard"} <ArrowRight size={16} />
            </Button>
          </form>
          <p className="admin-security-note">
            <ShieldCheck size={15} /> Protected by a secure, server-verified session.
          </p>
          <p className="admin-setup-note">
            Configure <code>ADMIN_USERNAME</code> and either <code>ADMIN_PASSWORD</code> or{" "}
            <code>ADMIN_PASSWORD_HASH</code> in your server environment. The form only asks for the
            password, and no session secret is required until the admin site moves to a domain.
          </p>
        </section>
        <aside className="admin-login-art" aria-hidden="true">
          <span className="admin-art-orbit admin-art-orbit-one" />
          <span className="admin-art-orbit admin-art-orbit-two" />
          <div className="admin-art-copy">
            <Sparkles size={17} />
            <p>Built for</p>
            <strong>the bigger picture.</strong>
            <span>SUPRECART · ADMIN</span>
          </div>
          <img className="admin-art-stamp" src="/suprecart-logo.png" alt="" />
        </aside>
      </main>
    );
  }

  const icons = [ShoppingBag, Users, UserPlus, Eye];
  const pendingSellerApplications = sellerApplications.filter(
    (application) => application.status === "pending",
  ).length;
  const filteredPeople = people.filter(
    (person) => peopleFilter === "all" || person.role === peopleFilter,
  );
  const buyerCount = people.filter((person) => person.role === "buyer").length;
  const sellerCount = people.filter((person) => person.role === "seller").length;
  const bannedCount = people.filter((person) => person.status === "banned").length;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-sidebar-brand" aria-label="SupreCart home">
          <img className="admin-brand-mark" src="/suprecart-logo.png" alt="SupreCart" />
          <span>
            SUPRECART
            <small>ADMIN STUDIO</small>
          </span>
        </Link>
        <div className="admin-sidebar-label">WORKSPACE</div>
        <a className="admin-side-link admin-side-link-active" href="#overview">
          <span className="admin-side-icon">
            <Sparkles size={17} />
          </span>{" "}
          Overview
        </a>
        <a className="admin-side-link" href="#sellers">
          <span className="admin-side-icon">
            <Store size={17} />
          </span>{" "}
          Seller applications
          {pendingSellerApplications > 0 && (
            <span className="admin-side-count">{pendingSellerApplications}</span>
          )}
        </a>
        <a className="admin-side-link" href="#people">
          <span className="admin-side-icon">
            <Users size={17} />
          </span>{" "}
          People
          {bannedCount > 0 && <span className="admin-side-count">{bannedCount}</span>}
        </a>
        <a className="admin-side-link" href="#activity">
          <span className="admin-side-icon">
            <UserRound size={17} />
          </span>{" "}
          Community
        </a>
        <div className="admin-sidebar-bottom">
          <span className="admin-online-dot" />
          <span>Preview workspace</span>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={handleSignOut}
            disabled={submitting}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            Workspace <span>/</span> Overview
          </div>
          <div className="admin-topbar-right">
            <span className="admin-preview-pill">
              <span /> PREVIEW DATA
            </span>
            <span className="admin-avatar">CC</span>
          </div>
        </header>
        <div className="admin-content" id="overview">
          <div className="admin-welcome">
            <div>
              <p className="admin-kicker">THURSDAY · YOUR MARKETPLACE AT A GLANCE</p>
              <h1>
                Make good <span>moves.</span>
              </h1>
              <p className="admin-welcome-copy">
                A little clarity goes a long way. Here’s the latest from your corner of the
                internet.
              </p>
            </div>
            <div className="admin-period">
              Last 30 days <span>⌄</span>
            </div>
          </div>
          <div className="admin-preview-banner">
            <Sparkles size={15} />
            <span>
              These are illustrative sample figures. Connect your analytics and finance services to
              see live data.
            </span>
            <span className="admin-banner-tag">DEMO</span>
          </div>
          <section className="admin-stat-grid" aria-label="Marketplace summary">
            {dashboard.stats.map((stat, index) => {
              const Icon = icons[index] ?? Sparkles;
              return (
                <article className="admin-stat-card" key={stat.label}>
                  <div className="admin-stat-top">
                    <span>{stat.label}</span>
                    <span className={`admin-stat-icon admin-stat-icon-${index}`}>
                      <Icon size={16} />
                    </span>
                  </div>
                  <strong className="admin-stat-value">{stat.value}</strong>
                  <div className="admin-stat-foot">
                    <span className="admin-stat-change">
                      <ArrowUpRight size={13} /> {stat.change}
                    </span>
                    <span>{stat.detail}</span>
                  </div>
                </article>
              );
            })}
          </section>
          <section className="admin-panel admin-seller-panel" id="sellers">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-panel-overline">SELLER APPLICATIONS</span>
                <h2>Who wants to join.</h2>
              </div>
              <span className="admin-live-label">
                <span /> {pendingSellerApplications} PENDING
              </span>
            </div>
            {sellerApplications.length ? (
              <div className="admin-seller-list">
                {sellerApplications.map((application) => (
                  <article
                    className={`admin-seller-row is-${application.status}`}
                    key={application.email}
                  >
                    <span className="admin-seller-monogram" aria-hidden="true">
                      {application.storeName
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="admin-seller-main">
                      <div className="admin-seller-title">
                        <strong>{application.storeName}</strong>
                        <span className={`admin-seller-chip is-${application.status}`}>
                          {application.status}
                        </span>
                      </div>
                      <p>
                        {application.name} · {application.email} · {application.phone}
                      </p>
                      <small>{application.productDescription}</small>
                      <div className="admin-seller-meta">
                        <span>
                          {application.bankName} · {application.bankAccountNumber}
                        </span>
                        <span>
                          Submitted{" "}
                          {new Date(application.submittedAt).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {application.reviewNote && (
                        <p className="admin-seller-review-note">{application.reviewNote}</p>
                      )}
                      {application.status === "pending" && (
                        <div className="admin-seller-actions">
                          <input
                            aria-label={`Review note for ${application.storeName}`}
                            placeholder="Optional note for the applicant"
                            value={reviewNotes[application.email] ?? ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [application.email]: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="admin-seller-approve"
                            onClick={() => reviewApplication(application, "approved")}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            type="button"
                            className="admin-seller-reject"
                            onClick={() => reviewApplication(application, "rejected")}
                          >
                            <X size={14} /> Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-seller-empty">
                No seller applications have been submitted in this browser yet.
              </p>
            )}
          </section>
          <section className="admin-panel admin-people-panel" id="people">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-panel-overline">REGISTERED PEOPLE</span>
                <h2>Everyone on the marketplace.</h2>
              </div>
              <span className="admin-live-label">
                <span /> {people.length} ACCOUNTS
              </span>
            </div>
            <div className="admin-people-summary">
              <span>
                <strong>{buyerCount}</strong> buyers
              </span>
              <span>
                <strong>{sellerCount}</strong> sellers
              </span>
              <span>
                <strong>{bannedCount}</strong> banned
              </span>
            </div>
            <div className="admin-people-filters" role="tablist" aria-label="Filter people">
              {(
                [
                  ["all", "All"],
                  ["buyer", "Buyers"],
                  ["seller", "Sellers"],
                ] as const
              ).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  role="tab"
                  aria-selected={peopleFilter === key}
                  className={peopleFilter === key ? "active" : ""}
                  onClick={() => setPeopleFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {filteredPeople.length ? (
              <div className="admin-people-list">
                {filteredPeople.map((person) => (
                  <article
                    className={`admin-person-row is-${person.status}`}
                    key={`${person.role}:${person.email}`}
                  >
                    <span className="admin-person-avatar" aria-hidden="true">
                      {person.avatar ? (
                        <img src={person.avatar} alt="" />
                      ) : (
                        person.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join("")
                          .toUpperCase()
                      )}
                    </span>
                    <div className="admin-person-main">
                      <div className="admin-person-title">
                        <strong>{person.name}</strong>
                        <span className={`admin-role-chip is-${person.role}`}>{person.role}</span>
                        <span className={`admin-seller-chip is-${person.status}`}>
                          {person.status}
                        </span>
                      </div>
                      <p>{person.email}</p>
                      {person.reason && (
                        <p className="admin-person-note">
                          <AlertTriangle size={12} /> {person.reason}
                        </p>
                      )}
                      <div className="admin-person-actions">
                        <input
                          aria-label={`Moderation note for ${person.name}`}
                          placeholder="Optional note for this account"
                          value={moderationNotes[person.email] ?? ""}
                          onChange={(event) =>
                            setModerationNotes((current) => ({
                              ...current,
                              [person.email]: event.target.value,
                            }))
                          }
                        />
                        {person.status === "banned" ? (
                          <button
                            type="button"
                            className="admin-seller-approve"
                            onClick={() => moderatePerson(person, "active")}
                          >
                            <Check size={14} /> Unban
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="admin-person-warn"
                              onClick={() => moderatePerson(person, "warned")}
                            >
                              <AlertTriangle size={14} /> Warn
                            </button>
                            <button
                              type="button"
                              className="admin-seller-reject"
                              onClick={() => moderatePerson(person, "banned")}
                            >
                              <Ban size={14} /> Ban
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="admin-person-delete"
                          onClick={() => removePerson(person)}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-seller-empty">
                No {peopleFilter === "all" ? "" : `${peopleFilter} `}accounts in this browser yet.
              </p>
            )}
          </section>
          <section className="admin-panel-grid">
            <article className="admin-panel admin-visits-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-panel-overline">TRAFFIC</span>
                  <h2>People are finding you.</h2>
                </div>
                <button type="button" className="admin-chart-menu" aria-label="Chart options">
                  ···
                </button>
              </div>
              <div className="admin-visits-total">
                <strong>24,892</strong>
                <span>
                  <ArrowUpRight size={14} /> 5.7%
                </span>
              </div>
              <p className="admin-chart-caption">Marketplace visits this week</p>
              <div
                className="admin-bar-chart"
                role="img"
                aria-label="Sample daily visits: Monday 42, Tuesday 64, Wednesday 52, Thursday 78, Friday 60, Saturday 92, Sunday 72 percent of peak."
              >
                {dashboard.visits.map((item) => (
                  <div className="admin-chart-day" key={item.day}>
                    <div className="admin-chart-bar-wrap">
                      <span className="admin-chart-bar" style={{ height: `${item.value}%` }} />
                    </div>
                    <span>{item.day}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="admin-panel admin-insight-panel">
              <span className="admin-panel-overline">COMMUNITY MOMENTUM</span>
              <div className="admin-insight-number">
                342<span>new faces</span>
              </div>
              <p>
                Your community is growing. Sign-ups are up <strong>16.4%</strong> compared with last
                month.
              </p>
              <div className="admin-avatar-stack" aria-hidden="true">
                <span>AM</span>
                <span>DO</span>
                <span>TN</span>
                <span>FK</span>
                <span>+338</span>
              </div>
              <div className="admin-insight-foot">
                A good thing is catching on <ArrowUpRight size={15} />
              </div>
            </article>
          </section>
          <section className="admin-panel admin-activity-panel" id="activity">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-panel-overline">THE COMMUNITY</span>
                <h2>Recent activity</h2>
              </div>
              <span className="admin-live-label">
                <span /> SAMPLE ACTIVITY
              </span>
            </div>
            <div className="admin-activity-list">
              {dashboard.activity.map((item) => (
                <div className="admin-activity-row" key={`${item.name}-${item.time}`}>
                  <span className="admin-activity-avatar">{item.initials}</span>
                  <strong>{item.name}</strong>
                  <span className="admin-activity-event">{item.event}</span>
                  <span className="admin-activity-time">{item.time}</span>
                </div>
              ))}
            </div>
          </section>
          <footer className="admin-footer">
            <span>SUPRECART ADMIN STUDIO</span>
            <span>Preview mode · No live data connected</span>
          </footer>
        </div>
      </section>
      {message && (
        <div role="status" className="admin-toast">
          {message}
          <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
    </main>
  );
}
