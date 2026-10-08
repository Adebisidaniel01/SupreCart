import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Eye,
  KeyRound,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkAdminSession, getAdminDashboard, signInToAdmin, signOutOfAdmin } from "@/lib/admin";

type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — CoreCart" },
      { name: "description", content: "Private CoreCart marketplace administration dashboard." },
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

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        if (await checkAdminSession()) {
          const data = await getAdminDashboard();
          if (active) setDashboard(data);
        }
      } catch (error) {
        console.error("Could not restore the CoreCart admin session.", error);
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

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const success = await signInToAdmin({ data: { password } });
      if (!success) {
        setMessage("That password didn’t match. Please try again.");
        return;
      }
      setPassword("");
      setDashboard(await getAdminDashboard());
    } catch (error) {
      console.error("Could not sign in to the CoreCart admin dashboard.", error);
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
      console.error("Could not sign out of the CoreCart admin dashboard.", error);
      setMessage("Sign-out could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-loading" role="status">
        <span className="admin-brand-mark">C.</span>
        <span>Opening your workspace…</span>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="admin-login">
        <section className="admin-login-card">
          <Link to="/" className="admin-back-link">
            <ArrowLeft size={15} /> Back to CoreCart
          </Link>
          <span className="admin-brand-mark">C.</span>
          <div className="admin-lock-icon">
            <KeyRound size={20} />
          </div>
          <p className="admin-kicker">CORECART · PRIVATE WORKSPACE</p>
          <h1>
            Good to have you <span>back.</span>
          </h1>
          <p className="admin-login-intro">
            Sign in with your admin password to open the marketplace overview.
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
            Configure <code>ADMIN_PASSWORD</code> and a 32+ character{" "}
            <code>ADMIN_SESSION_SECRET</code> in your server environment.
          </p>
        </section>
        <aside className="admin-login-art" aria-hidden="true">
          <span className="admin-art-orbit admin-art-orbit-one" />
          <span className="admin-art-orbit admin-art-orbit-two" />
          <div className="admin-art-copy">
            <Sparkles size={17} />
            <p>Built for</p>
            <strong>the bigger picture.</strong>
            <span>CORECART · ADMIN</span>
          </div>
          <span className="admin-art-stamp">C.</span>
        </aside>
      </main>
    );
  }

  const icons = [ShoppingBag, Users, UserPlus, Eye];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-sidebar-brand" aria-label="CoreCart home">
          <span className="admin-brand-mark">C.</span>
          <span>
            CORE<span>CART</span>
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
        <a className="admin-side-link" href="#activity">
          <span className="admin-side-icon">
            <Users size={17} />
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
            <span>CORECART ADMIN STUDIO</span>
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
