import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useAdminWorkspace } from "@/lib/admin-workspace";

export const Route = createFileRoute("/admin/community")({
  head: () => ({
    meta: [{ title: "Community — SupreCart Admin" }],
  }),
  component: AdminCommunity,
});

function AdminCommunity() {
  const { dashboard } = useAdminWorkspace();

  return (
    <>
      <header className="admin-page-head">
        <div>
          <span className="admin-panel-overline">THE COMMUNITY</span>
          <h1>What’s moving.</h1>
          <p>A quick read on the people finding their way around the marketplace.</p>
        </div>
        <span className="admin-live-label">
          <span /> RECENT ACTIVITY
        </span>
      </header>
      <section className="admin-panel admin-insight-panel admin-community-insight">
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
      </section>
      <section className="admin-panel admin-activity-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-overline">RECENT ACTIVITY</span>
            <h2>The latest from the community.</h2>
          </div>
          <span className="admin-live-label">
            <span /> RECENT ACTIVITY
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
    </>
  );
}
