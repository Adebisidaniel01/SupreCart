import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  ShoppingBag,
  Sparkles,
  Store,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useAdminWorkspace } from "@/lib/admin-workspace";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Overview — SupreCart Admin" }],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const { dashboard, pendingSellerApplications, people, bannedCount } = useAdminWorkspace();
  const icons = [ShoppingBag, Users, UserPlus, Eye];

  return (
    <>
      <div className="admin-welcome">
        <div>
          <p className="admin-kicker">THURSDAY · YOUR MARKETPLACE AT A GLANCE</p>
          <h1>
            Make good <span>moves.</span>
          </h1>
          <p className="admin-welcome-copy">
            A little clarity goes a long way. Here’s the latest from your corner of the internet.
          </p>
        </div>
        <div className="admin-period">
          Last 30 days <span>⌄</span>
        </div>
      </div>
      <div className="admin-preview-banner">
        <Sparkles size={15} />
        <span>
          These are illustrative sample figures. Connect your analytics and finance services to see
          live data.
        </span>
        <span className="admin-banner-tag">SAMPLE</span>
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
        <article className="admin-panel admin-shortcuts-panel">
          <span className="admin-panel-overline">JUMP BACK IN</span>
          <h2>Your workspace.</h2>
          <p className="admin-shortcuts-copy">
            Review applications, keep an eye on the community, and manage people from one place.
          </p>
          <div className="admin-shortcuts">
            <Link to="/admin/sellers" className="admin-shortcut">
              <span className="admin-shortcut-icon">
                <Store size={16} />
              </span>
              <span className="admin-shortcut-copy">
                <strong>Seller applications</strong>
                <small>
                  {pendingSellerApplications > 0
                    ? `${pendingSellerApplications} pending review`
                    : "All caught up"}
                </small>
              </span>
              <ArrowRight size={15} />
            </Link>
            <Link to="/admin/people" className="admin-shortcut">
              <span className="admin-shortcut-icon">
                <Users size={16} />
              </span>
              <span className="admin-shortcut-copy">
                <strong>People</strong>
                <small>
                  {people.length} accounts{bannedCount > 0 ? ` · ${bannedCount} banned` : ""}
                </small>
              </span>
              <ArrowRight size={15} />
            </Link>
            <Link to="/admin/community" className="admin-shortcut">
              <span className="admin-shortcut-icon">
                <UserRound size={16} />
              </span>
              <span className="admin-shortcut-copy">
                <strong>Community</strong>
                <small>Recent activity and momentum</small>
              </span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </article>
      </section>
    </>
  );
}
