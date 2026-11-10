import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useAdminWorkspace } from "@/lib/admin-workspace";

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

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
      <div className="admin-data-banner">
        <Sparkles size={15} />
        <span>
          These are illustrative figures. Connect your analytics and finance services to see live
          data.
        </span>
        <span className="admin-banner-tag">ILLUSTRATIVE</span>
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
      <section className="admin-leaderboard-grid" aria-label="Seller leaderboard and escrow">
        <article className="admin-panel admin-leaderboard-panel">
          <div className="admin-panel-heading">
            <div className="admin-leaderboard-title">
              <span className="admin-leaderboard-icon">
                <Trophy size={15} />
              </span>
              <div>
                <span className="admin-panel-overline">SELLER LEADERBOARD</span>
                <h2>Top sellers this month.</h2>
              </div>
            </div>
            <Link to="/admin/sellers" className="admin-panel-link">
              All sellers <ArrowRight size={13} />
            </Link>
          </div>
          <p className="admin-leaderboard-caption">
            Ranked by gross sales. Escrow is released after the buyer confirms delivery, less
            SupreCart commission.
          </p>
          <div className="admin-leaderboard-list">
            {dashboard.sellerLeaderboard.map((seller, index) => (
              <div className="admin-leaderboard-row" key={seller.seller}>
                <span
                  className={`admin-leaderboard-rank ${index < 3 ? "is-top" : ""}`}
                  aria-label={`Rank ${index + 1}`}
                >
                  {index + 1}
                </span>
                <div className="admin-leaderboard-seller">
                  <strong>{seller.seller}</strong>
                  <small>
                    {seller.owner} / {seller.orders} orders / {seller.rating} rating
                  </small>
                </div>
                <div className="admin-leaderboard-sales">
                  <strong>{nairaFormatter.format(seller.grossSales)}</strong>
                  <small>{seller.trend}</small>
                </div>
                <div className="admin-leaderboard-funds">
                  <span>{nairaFormatter.format(seller.heldFunds)} held</span>
                  <span>{nairaFormatter.format(seller.releasedFunds)} released</span>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="admin-panel admin-escrow-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-overline">BUYER FUNDS</span>
              <h2>Escrow overview.</h2>
            </div>
            <span className="admin-banner-tag">ESCROW</span>
          </div>
          <div className="admin-escrow-primary">
            <ShieldCheck size={17} />
            <span>HELD UNTIL BUYER CONFIRMATION</span>
            <strong>{nairaFormatter.format(dashboard.escrow.heldFunds)}</strong>
            <small>{dashboard.escrow.awaitingConfirmation} orders awaiting confirmation</small>
          </div>
          <div className="admin-escrow-split">
            <div>
              <span>Released to sellers</span>
              <strong>{nairaFormatter.format(dashboard.escrow.releasedFunds)}</strong>
            </div>
            <div>
              <span>SupreCart commission</span>
              <strong>{nairaFormatter.format(dashboard.escrow.platformCommission)}</strong>
            </div>
          </div>
          <p className="admin-escrow-note">
            <ShieldCheck size={13} /> SupreCart holds buyer funds, deducts its share, then releases
            the seller net after delivery is confirmed. Figures are illustrative.
          </p>
        </article>
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
            aria-label="Daily visits: Monday 42, Tuesday 64, Wednesday 52, Thursday 78, Friday 60, Saturday 92, Sunday 72 percent of peak."
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
