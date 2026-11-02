import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Ban, Check, Trash2, Users } from "lucide-react";
import { useAdminWorkspace } from "@/lib/admin-workspace";

export const Route = createFileRoute("/admin/people")({
  head: () => ({
    meta: [{ title: "People — SupreCart Admin" }],
  }),
  component: AdminPeople,
});

function AdminPeople() {
  const {
    people,
    peopleFilter,
    onPeopleFilterChange,
    buyerCount,
    sellerCount,
    bannedCount,
    moderationNotes,
    onModerationNoteChange,
    moderatePerson,
    removePerson,
  } = useAdminWorkspace();

  const filteredPeople = people.filter(
    (person) => peopleFilter === "all" || person.role === peopleFilter,
  );

  return (
    <>
      <header className="admin-page-head">
        <div>
          <span className="admin-panel-overline">REGISTERED PEOPLE</span>
          <h1>Everyone on the marketplace.</h1>
          <p>Find buyers and sellers, leave a moderation note, or take action on an account.</p>
        </div>
        <span className="admin-live-label">
          <span /> {people.length} ACCOUNTS
        </span>
      </header>
      <section className="admin-panel admin-people-panel">
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
              onClick={() => onPeopleFilterChange(key)}
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
                    <span className={`admin-seller-chip is-${person.status}`}>{person.status}</span>
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
                      onChange={(event) => onModerationNoteChange(person.email, event.target.value)}
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
          <div className="admin-empty-state">
            <span className="admin-empty-icon">
              <Users size={20} />
            </span>
            <h2>No accounts here yet.</h2>
            <p>
              No {peopleFilter === "all" ? "" : `${peopleFilter} `}accounts exist in this browser.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
