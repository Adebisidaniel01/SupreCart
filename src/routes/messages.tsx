import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCheck, MessageCircle, Send, Store } from "lucide-react";
import { accountInitials, useActiveAccount } from "@/hooks/use-active-account";
import {
  getDemoChatConversations,
  saveDemoChatMessages,
  type DemoChatConversation,
  type DemoChatMessage,
} from "@/lib/demo-messages";

type MessagesSearch = {
  productId?: string | undefined;
};

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): MessagesSearch => ({
    productId: typeof search["productId"] === "string" ? search["productId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Messages — SupreCart" },
      { name: "description", content: "Chat with buyers and sellers on SupreCart." },
    ],
  }),
  component: Messages,
});

function Messages() {
  const { productId } = Route.useSearch();
  const { account, ready } = useActiveAccount();
  const [threads, setThreads] = useState<DemoChatConversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!account) {
      setThreads([]);
      setActiveId("");
      return;
    }
    const loaded = getDemoChatConversations(account);
    setThreads(loaded);
    const preferred = productId
      ? loaded.find((conversation) => conversation.productName === productId)
      : undefined;
    setActiveId((current) => {
      if (current && loaded.some((conversation) => conversation.id === current)) return current;
      return preferred?.id ?? loaded[0]?.id ?? "";
    });
  }, [account, productId]);

  const activeThread = useMemo(
    () => threads.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, threads],
  );

  const peerFor = (conversation: DemoChatConversation) =>
    conversation.buyer.email === account?.email ? conversation.seller : conversation.buyer;

  useEffect(() => {
    if (!account || !activeThread) return;
    const incoming = activeThread.messages.filter(
      (message) => message.senderEmail !== account.email,
    );
    const unread = incoming.filter((message) => !message.readBy.includes(account.email));
    if (!unread.length) return;
    const updated = activeThread.messages.map((message) =>
      unread.some((entry) => entry.id === message.id)
        ? { ...message, readBy: [...message.readBy, account.email] }
        : message,
    );
    try {
      saveDemoChatMessages(activeThread.id, updated);
      setThreads((current) =>
        current.map((conversation) =>
          conversation.id === activeThread.id
            ? { ...conversation, messages: updated }
            : conversation,
        ),
      );
    } catch (cause) {
      console.error("Could not save the local preview read receipt.", cause);
    }
  }, [account, activeThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [activeThread?.messages.length]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !activeThread) return;
    const body = draft.trim();
    if (!body) return;
    const message: DemoChatMessage = {
      id: crypto.randomUUID(),
      senderEmail: account.email,
      body,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    const updated = [...activeThread.messages, message];
    try {
      saveDemoChatMessages(activeThread.id, updated);
      setThreads((current) =>
        current.map((conversation) =>
          conversation.id === activeThread.id
            ? { ...conversation, messages: updated }
            : conversation,
        ),
      );
      setDraft("");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this message.");
    }
  }

  if (ready && !account) {
    return (
      <main className="messages-page">
        <div className="messages-empty">
          <MessageCircle size={26} />
          <strong>Sign in to see your messages.</strong>
          <Link to="/login">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="messages-page">
      <div className="messages-topbar">
        <span>
          <MessageCircle size={14} /> {account?.role === "seller" ? "BUYER CHATS" : "SELLER CHATS"}
        </span>
        {account && (
          <Link
            to={account.role === "seller" ? "/sellers" : "/account"}
            className="messages-account-link"
          >
            {accountInitials(account)} · {account.name}
          </Link>
        )}
      </div>
      <div className="messages-layout">
        <aside className="messages-inbox" aria-label="Conversations">
          <div className="messages-inbox-heading">
            <div>
              <p className="eyebrow">INBOX</p>
              <h1>Messages</h1>
            </div>
            <span>{threads.length}</span>
          </div>
          <p className="messages-inbox-note">
            Local preview chats. Nothing is sent to a real buyer or seller.
          </p>
          <div className="conversation-list">
            {threads.map((conversation) => {
              const peer = peerFor(conversation);
              const latest = conversation.messages.at(-1);
              return (
                <button
                  type="button"
                  key={conversation.id}
                  className={`conversation-item${conversation.id === activeId ? " active" : ""}`}
                  onClick={() => setActiveId(conversation.id)}
                >
                  <span className="conversation-avatar">{accountInitials(peer)}</span>
                  <span className="conversation-copy">
                    <strong>{peer.name}</strong>
                    <small>{latest?.body ?? conversation.productName}</small>
                  </span>
                </button>
              );
            })}
            {!threads.length && (
              <div className="messages-empty">
                <Store size={22} />
                <strong>No conversations yet.</strong>
                <span>Start a chat from a product page when messaging opens.</span>
              </div>
            )}
          </div>
        </aside>

        {activeThread ? (
          <section
            className="messages-conversation"
            aria-label={`Chat with ${peerFor(activeThread).name}`}
          >
            <header className="conversation-header">
              <button
                type="button"
                className="conversation-back-mobile"
                onClick={() => setActiveId("")}
                aria-label="Back to conversations"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="conversation-avatar">{accountInitials(peerFor(activeThread))}</span>
              <div>
                <strong>{peerFor(activeThread).name}</strong>
                <span>{activeThread.productName}</span>
              </div>
            </header>
            <div className="message-list">
              {activeThread.messages.map((message) => {
                const own = message.senderEmail === account?.email;
                return (
                  <article key={message.id} className={`chat-message${own ? " own-message" : ""}`}>
                    <p>{message.body}</p>
                    <footer>
                      <time dateTime={message.createdAt}>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                      {own && (
                        <span title={message.readBy.length ? "Read" : "Sent"}>
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
                placeholder={`Message ${peerFor(activeThread).name}`}
                aria-label={`Message ${peerFor(activeThread).name}`}
                maxLength={1200}
              />
              <button type="submit" className="message-send-button" aria-label="Send message">
                <Send size={16} />
              </button>
            </form>
          </section>
        ) : (
          <div className="messages-placeholder">
            <MessageCircle size={24} />
            <h2>Your conversations live here.</h2>
            <p>Pick a chat to keep browsing with a little help from the seller.</p>
          </div>
        )}
      </div>
      <p className="messages-privacy-note">
        Messages are stored in this browser only while the marketplace is a preview.
      </p>
    </main>
  );
}
