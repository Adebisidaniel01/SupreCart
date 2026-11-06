import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCheck, Clock3, Headphones, Send, ShieldCheck, Users } from "lucide-react";
import { accountInitials, useActiveAccount } from "@/hooks/use-active-account";
import {
  appendDemoSupportMessage,
  createDemoSupportTicket,
  getDemoSupportGuestId,
  getDemoSupportQueue,
  getDemoSupportTicket,
  type DemoSupportQueueState,
  type DemoSupportTicket,
} from "@/lib/demo-support";

type SupportSearch = {
  orderId?: string | undefined;
  topic?: string | undefined;
};

const emptyQueue: DemoSupportQueueState = {
  inQueue: false,
  position: 0,
  waitingAhead: 0,
  estimatedMinutes: 0,
  isNext: false,
};

export const Route = createFileRoute("/support")({
  validateSearch: (search: Record<string, unknown>): SupportSearch => ({
    orderId: typeof search["orderId"] === "string" ? search["orderId"] : undefined,
    topic: typeof search["topic"] === "string" ? search["topic"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Customer care — SupreCart" },
      {
        name: "description",
        content: "Join the SupreCart customer care preview queue and chat with support.",
      },
    ],
  }),
  component: CustomerCare,
});

function CustomerCare() {
  const { orderId, topic } = Route.useSearch();
  const { account, ready } = useActiveAccount();
  const [guestId, setGuestId] = useState("");
  const [ticket, setTicket] = useState<DemoSupportTicket | null>(null);
  const [queue, setQueue] = useState<DemoSupportQueueState>(emptyQueue);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const requesterId = account?.email ?? guestId;
  const requesterName = account?.name ?? "Guest shopper";

  useEffect(() => {
    setGuestId(getDemoSupportGuestId());
  }, []);

  useEffect(() => {
    if (!requesterId) {
      setTicket(null);
      setQueue(emptyQueue);
      return;
    }
    setTicket(getDemoSupportTicket(requesterId));
    setQueue(getDemoSupportQueue(requesterId));
  }, [requesterId]);

  useEffect(() => {
    if (!orderId) return;
    setDraft((current) => current || `I need help with order ${orderId}.`);
  }, [orderId]);

  useEffect(() => {
    if (!requesterId) return;
    const updateQueue = () => setQueue(getDemoSupportQueue(requesterId));
    const timer = window.setInterval(updateQueue, 30_000);
    return () => window.clearInterval(timer);
  }, [requesterId, ticket?.lastMessageAt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [ticket?.messages.length]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!requesterId || !body) return;
    try {
      const updated = ticket
        ? appendDemoSupportMessage(requesterId, body)
        : createDemoSupportTicket(
            requesterId,
            requesterName,
            body,
            orderId ? `Order ${orderId}` : topic,
          );
      if (!updated) throw new Error("This preview chat could not be saved.");
      setTicket(updated);
      setDraft("");
      setError("");
      setQueue(getDemoSupportQueue(requesterId));
    } catch (cause) {
      console.error("Could not save the SupreCart customer care preview.", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save this message in your browser. Please try again.",
      );
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="support-page">
      <div className="support-topbar">
        <span>
          <Headphones size={14} /> CUSTOMER CARE
        </span>
        {ready &&
          (account ? (
            <Link to="/account" className="messages-account-link">
              {accountInitials(account)} · {account.name}
            </Link>
          ) : (
            <span className="support-guest-label">Guest preview</span>
          ))}
      </div>

      <div className="support-heading">
        <p className="eyebrow">WE&apos;RE HERE TO HELP</p>
        <h1>Chat with customer care</h1>
        <p>
          Ask about an order, delivery, returns or your account. Your first message reserves your
          place in the queue, and this preview keeps the conversation in your browser.
        </p>
      </div>

      <div className="support-layout">
        <section className="support-chat" aria-label="Customer care chat">
          <header className="support-chat-header">
            <span className="support-avatar" aria-hidden="true">
              <Headphones size={18} />
            </span>
            <div>
              <strong>SupreCart Customer Care</strong>
              <span>
                {ticket
                  ? queue.isNext
                    ? "You're next in the preview queue"
                    : `About ${queue.estimatedMinutes} min wait in the preview queue`
                  : "Send a message to join the queue"}
              </span>
            </div>
            <span className="support-status-pill">
              {ticket ? (queue.position ? `#${queue.position}` : "Queued") : "Preview"}
            </span>
          </header>

          <div className="support-message-list">
            <article className="chat-message support-welcome">
              <p>
                Hello! Tell us what you need help with. Earlier conversations are served first, so
                sending your first message quickly reserves your place.
              </p>
              <footer>
                <span>Automated preview</span>
              </footer>
            </article>
            {ticket?.messages.map((message) => {
              const own = message.sender === "customer";
              return (
                <article key={message.id} className={`chat-message${own ? " own-message" : ""}`}>
                  {!own && (
                    <span className="support-message-label">
                      {message.automated ? "Automated preview" : "Customer care"}
                    </span>
                  )}
                  <p>{message.body}</p>
                  <footer>
                    <time dateTime={message.createdAt}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    {own && (
                      <span title="Saved in this browser">
                        <CheckCheck size={12} />
                      </span>
                    )}
                  </footer>
                </article>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {error && (
            <p className="messages-error" role="alert">
              {error}
            </p>
          )}

          <form className="message-composer" onSubmit={sendMessage}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tell customer care what you need"
              aria-label="Message customer care"
              maxLength={1200}
              disabled={!requesterId}
            />
            <button
              type="submit"
              className="message-send-button"
              aria-label="Send message"
              disabled={!requesterId || !draft.trim()}
            >
              <Send size={16} />
            </button>
          </form>
          {!ready && <p className="support-loading">Loading your chat…</p>}
        </section>

        <aside className="support-sidebar" aria-label="Queue and support information">
          <section className={`support-queue-card${ticket ? " is-active" : ""}`}>
            <span className="support-queue-kicker">
              <Users size={14} /> CUSTOMER CARE QUEUE
            </span>
            {ticket ? (
              <>
                <div className="support-queue-figure">
                  <strong>{queue.position ? `#${queue.position}` : "…"}</strong>
                  <span>{queue.isNext ? "You're next" : "Your place"}</span>
                </div>
                <p>
                  {queue.isNext
                    ? "A live agent would pick up next in a connected queue."
                    : `About ${queue.estimatedMinutes} min estimated wait. Earlier messages are served first.`}
                </p>
                <p className="support-queue-note">
                  <Clock3 size={13} /> Your place is set by your first message. Sending more
                  messages does not move you back.
                </p>
              </>
            ) : (
              <>
                <strong className="support-queue-empty">Ready when you are.</strong>
                <p>Send your first message to join the queue. Earlier messages are served first.</p>
              </>
            )}
            <p className="demo-disclaimer support-disclaimer">
              <ShieldCheck size={14} /> Preview only. Messages stay in this browser and no real
              agent is connected.
            </p>
          </section>

          <section className="support-help-card">
            <h2>Quick help</h2>
            <Link to="/info/$slug" params={{ slug: "shipping" }}>
              Shipping & delivery
            </Link>
            <Link to="/info/$slug" params={{ slug: "returns" }}>
              Returns & refunds
            </Link>
            <Link to="/info/$slug" params={{ slug: "faq" }}>
              FAQs
            </Link>
            {account ? (
              <Link to="/account">Your orders</Link>
            ) : (
              <Link to="/login">Sign in to view your orders</Link>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
