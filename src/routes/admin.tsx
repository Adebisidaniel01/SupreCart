import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkAdminSession, getAdminDashboard, signInToAdmin, signOutOfAdmin } from "@/lib/admin";
import { accountAvatar } from "@/lib/account-preferences";
import {
  AdminWorkspaceContext,
  type AdminPerson,
  type AdminWorkspaceValue,
  type PeopleFilter,
} from "@/lib/admin-workspace";
import { deleteAccountData } from "@/lib/account-cleanup";
import {
  getAllAccounts,
  getAccountModeration,
  setAccountModeration,
  subscribeAccountModeration,
  type AccountModerationStatus,
} from "@/lib/accounts";
import {
  readSellerApplications,
  reviewSellerApplication,
  subscribeSellerApplications,
  type SellerApplication,
} from "@/lib/seller-applications";

type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

const sectionLabels: Record<string, string> = {
  "/admin": "Overview",
  "/admin/sellers": "Seller applications",
  "/admin/people": "People",
  "/admin/community": "Community",
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — SupreCart" },
      { name: "description", content: "Private SupreCart marketplace administration dashboard." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sellerApplications, setSellerApplications] = useState<SellerApplication[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<AdminPerson[]>([]);
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
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
        getAllAccounts().map((account) => {
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
      getAllAccounts().map((account) => {
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
    deleteAccountData(person.email);
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
      const success = await signInToAdmin({ data: { username, password } });
      if (!success) {
        setMessage("That username and password didn't match. Please try again.");
        return;
      }
      setUsername("");
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
      <main id="main-content" tabIndex={-1} className="admin-loading" role="status">
        <img className="admin-brand-mark" src="/suprecart-logo.png" alt="SupreCart" />
        <span>Opening your workspace…</span>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main id="main-content" tabIndex={-1} className="admin-login">
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
            Sign in with your admin username and password to open the marketplace overview.
          </p>
          <form className="admin-login-form" onSubmit={handleSignIn}>
            <label htmlFor="admin-username">Admin username</label>
            <input
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              required
            />
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
            Set <code>ADMIN_USERNAME</code> and either <code>ADMIN_PASSWORD</code> or{" "}
            <code>ADMIN_PASSWORD_HASH</code> in your server environment. No admin credentials are
            bundled with the source code. A session secret is optional until the admin site moves to
            a domain.
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

  const pendingSellerApplications = sellerApplications.filter(
    (application) => application.status === "pending",
  ).length;
  const buyerCount = people.filter((person) => person.role === "buyer").length;
  const sellerCount = people.filter((person) => person.role === "seller").length;
  const bannedCount = people.filter((person) => person.status === "banned").length;
  const currentSection =
    sectionLabels[pathname] ??
    (pathname.startsWith("/admin/sellers")
      ? sectionLabels["/admin/sellers"]
      : pathname.startsWith("/admin/people")
        ? sectionLabels["/admin/people"]
        : pathname.startsWith("/admin/community")
          ? sectionLabels["/admin/community"]
          : "Overview");

  const workspace: AdminWorkspaceValue = {
    dashboard,
    sellerApplications,
    pendingSellerApplications,
    reviewNotes,
    onReviewNoteChange: (email, value) =>
      setReviewNotes((current) => ({ ...current, [email]: value })),
    reviewApplication,
    people,
    peopleFilter,
    onPeopleFilterChange: setPeopleFilter,
    moderationNotes,
    onModerationNoteChange: (email, value) =>
      setModerationNotes((current) => ({ ...current, [email]: value })),
    moderatePerson,
    removePerson,
    buyerCount,
    sellerCount,
    bannedCount,
    signOut: handleSignOut,
    signingOut: submitting,
  };

  return (
    <AdminWorkspaceContext.Provider value={workspace}>
      <main id="main-content" tabIndex={-1} className="admin-shell">
        <aside className="admin-sidebar">
          <Link to="/" className="admin-sidebar-brand" aria-label="SupreCart home">
            <img className="admin-brand-mark" src="/suprecart-logo.png" alt="SupreCart" />
            <span>
              SUPRECART
              <small>ADMIN STUDIO</small>
            </span>
          </Link>
          <div className="admin-sidebar-label">WORKSPACE</div>
          <Link
            to="/admin"
            className="admin-side-link"
            activeProps={{ className: "admin-side-link admin-side-link-active" }}
            activeOptions={{ exact: true }}
          >
            <span className="admin-side-icon">
              <Sparkles size={17} />
            </span>{" "}
            Overview
          </Link>
          <Link
            to="/admin/sellers"
            className="admin-side-link"
            activeProps={{ className: "admin-side-link admin-side-link-active" }}
          >
            <span className="admin-side-icon">
              <Store size={17} />
            </span>{" "}
            Seller applications
            {pendingSellerApplications > 0 && (
              <span className="admin-side-count">{pendingSellerApplications}</span>
            )}
          </Link>
          <Link
            to="/admin/people"
            className="admin-side-link"
            activeProps={{ className: "admin-side-link admin-side-link-active" }}
          >
            <span className="admin-side-icon">
              <Users size={17} />
            </span>{" "}
            People
            {bannedCount > 0 && <span className="admin-side-count">{bannedCount}</span>}
          </Link>
          <Link
            to="/admin/community"
            className="admin-side-link"
            activeProps={{ className: "admin-side-link admin-side-link-active" }}
          >
            <span className="admin-side-icon">
              <UserRound size={17} />
            </span>{" "}
            Community
          </Link>
          <div className="admin-sidebar-bottom">
            <span className="admin-online-dot" />
            <span>Admin workspace</span>
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
              Workspace <span>/</span> {currentSection}
            </div>
            <div className="admin-topbar-right">
              <span className="admin-data-pill">
                <span /> OVERVIEW DATA
              </span>
              <span className="admin-avatar">CC</span>
            </div>
          </header>
          <div className="admin-content">
            <Outlet />
            <footer className="admin-footer">
              <span>SUPRECART ADMIN STUDIO</span>
              <span>Overview mode · No live data connected</span>
            </footer>
          </div>
        </section>
        <nav className="admin-mobile-nav" aria-label="Admin sections">
          <Link
            to="/admin"
            className="admin-mobile-link"
            activeProps={{ className: "admin-mobile-link is-active" }}
            activeOptions={{ exact: true }}
          >
            <Sparkles size={18} />
            <span>Overview</span>
          </Link>
          <Link
            to="/admin/sellers"
            className="admin-mobile-link"
            activeProps={{ className: "admin-mobile-link is-active" }}
          >
            <Store size={18} />
            <span>Sellers</span>
            {pendingSellerApplications > 0 && (
              <span className="admin-mobile-count">{pendingSellerApplications}</span>
            )}
          </Link>
          <Link
            to="/admin/people"
            className="admin-mobile-link"
            activeProps={{ className: "admin-mobile-link is-active" }}
          >
            <Users size={18} />
            <span>People</span>
            {bannedCount > 0 && <span className="admin-mobile-count">{bannedCount}</span>}
          </Link>
          <Link
            to="/admin/community"
            className="admin-mobile-link"
            activeProps={{ className: "admin-mobile-link is-active" }}
          >
            <UserRound size={18} />
            <span>Community</span>
          </Link>
        </nav>
        {message && (
          <div role="status" className="admin-toast">
            {message}
            <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}
      </main>
    </AdminWorkspaceContext.Provider>
  );
}
