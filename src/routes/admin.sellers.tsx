import { createFileRoute } from "@tanstack/react-router";
import { Check, Store, X } from "lucide-react";
import { useAdminWorkspace } from "@/lib/admin-workspace";

export const Route = createFileRoute("/admin/sellers")({
  head: () => ({
    meta: [{ title: "Seller applications — SupreCart Admin" }],
  }),
  component: AdminSellers,
});

function AdminSellers() {
  const {
    sellerApplications,
    pendingSellerApplications,
    reviewNotes,
    onReviewNoteChange,
    reviewApplication,
  } = useAdminWorkspace();

  return (
    <>
      <header className="admin-page-head">
        <div>
          <span className="admin-panel-overline">SELLER APPLICATIONS</span>
          <h1>Who wants to join.</h1>
          <p>Review new stores, leave a note, and approve the people ready to sell on SupreCart.</p>
        </div>
        <span className="admin-live-label">
          <span /> {pendingSellerApplications} PENDING
        </span>
      </header>
      <section className="admin-panel admin-seller-panel">
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
                          onReviewNoteChange(application.email, event.target.value)
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
          <div className="admin-empty-state">
            <span className="admin-empty-icon">
              <Store size={20} />
            </span>
            <h2>No applications yet.</h2>
            <p>When a buyer applies to sell, their store details will appear here for review.</p>
          </div>
        )}
      </section>
    </>
  );
}
