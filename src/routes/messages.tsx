import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, CheckCheck, MessageCircle, Mic, Send, Square, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  created_at: string;
  productName: string;
  peerName: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  audio_path: string | null;
  audio_url?: string;
  created_at: string;
};

type ChatReceipt = { message_id: string };

const MAX_VOICE_NOTE_BYTES = 25 * 1024 * 1024;

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );

  const loadConversations = useCallback(
    async (activeUser: User, sellerMode: boolean) => {
      const client = supabase;
      if (!client) throw new Error("Messaging service is temporarily unavailable.");
      const { data, error: conversationsError } = await client
        .from("chat_conversations")
        .select("id, buyer_id, seller_id, product_id, created_at")
        .order("created_at", { ascending: false });
      if (conversationsError) throw conversationsError;
      const rows = (data ?? []) as Omit<Conversation, "productName" | "peerName">[];
      const productIds = [...new Set(rows.map((row) => row.product_id))];
      const sellerIds = [...new Set(rows.map((row) => row.seller_id))];
      const [productsResult, sellersResult] = await Promise.all([
        productIds.length
          ? client.from("products").select("id, name").in("id", productIds)
          : Promise.resolve({ data: [], error: null }),
        sellerIds.length
          ? client
              .from("public_seller_profiles")
              .select("id, first_name, last_name")
              .in("id", sellerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (productsResult.error) throw productsResult.error;
      if (sellersResult.error) throw sellersResult.error;
      const productNames = new Map(
        ((productsResult.data ?? []) as { id: string; name: string }[]).map((item) => [
          item.id,
          item.name,
        ]),
      );
      const sellerNames = new Map(
        (
          (sellersResult.data ?? []) as {
            id: string;
            first_name: string;
            last_name: string;
          }[]
        ).map((seller) => [seller.id, `${seller.first_name} ${seller.last_name}`.trim()]),
      );
      setConversations(
        rows.map((row) => ({
          ...row,
          productName: productNames.get(row.product_id) ?? "SupreCart product",
          peerName: sellerMode ? "Buyer" : (sellerNames.get(row.seller_id) ?? "SupreCart seller"),
        })),
      );
      const firstConversation = rows.at(0);
      if (!activeId && firstConversation) setActiveId(firstConversation.id);
      if (activeId && !rows.some((row) => row.id === activeId)) setActiveId("");
      if (productId && !sellerMode) {
        const productConversation = rows.find((row) => row.product_id === productId);
        if (productConversation) {
          setActiveId(productConversation.id);
        } else {
          const { data: product, error: productError } = await client
            .from("products")
            .select("id, seller_id")
            .eq("id", productId)
            .eq("published", true)
            .maybeSingle();
          if (productError) throw productError;
          if (!product) throw new Error("This live product is not available for messaging.");
          const { data: created, error: createError } = await client
            .from("chat_conversations")
            .insert({
              buyer_id: activeUser.id,
              seller_id: product.seller_id,
              product_id: product.id,
            })
            .select("id")
            .single();
          if (createError && createError.code !== "23505") throw createError;
          let newConversationId = created?.id as string | undefined;
          if (!newConversationId) {
            const { data: existing, error: existingError } = await client
              .from("chat_conversations")
              .select("id")
              .eq("buyer_id", activeUser.id)
              .eq("product_id", productId)
              .single();
            if (existingError) throw existingError;
            newConversationId = existing.id;
          }
          if (!newConversationId) throw new Error("Could not open the product conversation.");
          setActiveId(newConversationId);
          const { data: refreshed, error: refreshError } = await client
            .from("chat_conversations")
            .select("id, buyer_id, seller_id, product_id, created_at")
            .eq("id", newConversationId)
            .single();
          if (refreshError) throw refreshError;
          const { data: productRow } = await client
            .from("products")
            .select("id, name")
            .eq("id", productId)
            .single();
          const { data: sellerRow } = await client
            .from("public_seller_profiles")
            .select("id, first_name, last_name")
            .eq("id", product.seller_id)
            .maybeSingle();
          setConversations((current) => [
            {
              ...(refreshed as Omit<Conversation, "productName" | "peerName">),
              productName: productRow?.name ?? "SupreCart product",
              peerName: sellerRow
                ? `${sellerRow.first_name} ${sellerRow.last_name}`.trim()
                : "SupreCart seller",
            },
            ...current.filter((item) => item.id !== newConversationId),
          ]);
        }
      }
    },
    [activeId, productId],
  );

  useEffect(() => {
    if (!supabase) {
      setError("Messaging service is temporarily unavailable.");
      setLoading(false);
      return;
    }
    let active = true;
    const client = supabase;
    void client.auth
      .getSession()
      .then(async ({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        const currentUser = data.session?.user;
        if (!currentUser) {
          await navigate({ to: "/login" });
          return;
        }
        const { data: seller, error: sellerError } = await client
          .from("seller_applications")
          .select("id")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (sellerError) throw sellerError;
        const sellerMode = Boolean(seller);
        if (active) {
          setUser(currentUser);
          setIsSeller(sellerMode);
        }
        await loadConversations(currentUser, sellerMode);
      })
      .catch((cause: unknown) => {
        console.error("Could not load SupreCart conversations.", cause);
        if (active) setError(cause instanceof Error ? cause.message : "Could not load messages.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadConversations, navigate]);

  const loadMessages = useCallback(async (conversationId: string, currentUser: User) => {
    const client = supabase;
    if (!client) return;
    const { data, error: messagesError } = await client
      .from("chat_messages")
      .select("id, conversation_id, sender_id, body, audio_path, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (messagesError) throw messagesError;
    const loaded = (data ?? []) as ChatMessage[];
    const audioMessages = loaded.filter((message) => message.audio_path);
    const signedUrls = await Promise.all(
      audioMessages.map(async (message) => {
        const { data: signed, error: signedError } = await client.storage
          .from("voice-notes")
          .createSignedUrl(message.audio_path!, 3600);
        if (signedError) throw signedError;
        return [message.id, signed.signedUrl] as const;
      }),
    );
    const urlMap = new Map(signedUrls);
    const nextMessages = loaded.map((message) => {
      const audioUrl = urlMap.get(message.id);
      return { ...message, ...(audioUrl ? { audio_url: audioUrl } : {}) };
    });
    const incomingIds = nextMessages
      .filter((message) => message.sender_id !== currentUser.id)
      .map((message) => message.id);
    if (incomingIds.length) {
      const { error: receiptError } = await client.from("chat_read_receipts").upsert(
        incomingIds.map((message_id) => ({ message_id, reader_id: currentUser.id })),
        {
          onConflict: "message_id,reader_id",
          ignoreDuplicates: true,
        },
      );
      if (receiptError) throw receiptError;
    }
    const outgoingIds = nextMessages
      .filter((message) => message.sender_id === currentUser.id)
      .map((message) => message.id);
    const receiptsResult = outgoingIds.length
      ? await client.from("chat_read_receipts").select("message_id").in("message_id", outgoingIds)
      : { data: [], error: null };
    if (receiptsResult.error) throw receiptsResult.error;
    setReadIds(
      new Set(((receiptsResult.data ?? []) as ChatReceipt[]).map((item) => item.message_id)),
    );
    setMessages(nextMessages);
  }, []);

  useEffect(() => {
    if (!activeId || !user || !supabase) return;
    let active = true;
    const client = supabase;
    void loadMessages(activeId, user).catch((cause: unknown) => {
      console.error("Could not load a SupreCart conversation.", cause);
      if (active) setError(cause instanceof Error ? cause.message : "Could not load this chat.");
    });
    const channel = client
      .channel(`chat-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        () => {
          void loadMessages(activeId, user).catch((cause: unknown) => {
            console.error("Could not refresh SupreCart messages.", cause);
            if (active)
              setError(cause instanceof Error ? cause.message : "Could not refresh chat.");
          });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_read_receipts" }, () => {
        void loadMessages(activeId, user).catch((cause: unknown) => {
          console.error("Could not refresh SupreCart read receipts.", cause);
          if (active) setError(cause instanceof Error ? cause.message : "Could not refresh chat.");
        });
      })
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [activeId, loadMessages, user]);

  async function sendText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !activeConversation || !user) return;
    const form = event.currentTarget;
    const body = String(new FormData(form).get("message")).trim();
    if (!body) return;
    setSending(true);
    setError("");
    const { error: sendError } = await supabase
      .from("chat_messages")
      .insert({ conversation_id: activeConversation.id, sender_id: user.id, body });
    setSending(false);
    if (sendError) {
      console.error("Could not send the SupreCart message.", sendError);
      setError(sendError.message);
      return;
    }
    form.reset();
    await loadMessages(activeConversation.id, user);
  }

  async function uploadVoiceNote(blob: Blob) {
    if (!supabase || !activeConversation || !user) return;
    if (blob.size > MAX_VOICE_NOTE_BYTES) {
      setError(
        "This voice note exceeds the 25 MB upload limit. Record a shorter or lower-quality note.",
      );
      return;
    }
    setSending(true);
    setError("");
    const extension = blob.type.includes("ogg")
      ? "ogg"
      : blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("mpeg")
          ? "mp3"
          : "webm";
    const path = `${activeConversation.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("voice-notes")
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (uploadError) {
      setSending(false);
      console.error("Could not upload the SupreCart voice note.", uploadError);
      setError(uploadError.message);
      return;
    }
    const { error: insertError } = await supabase.from("chat_messages").insert({
      conversation_id: activeConversation.id,
      sender_id: user.id,
      audio_path: path,
    });
    if (insertError) {
      await supabase.storage.from("voice-notes").remove([path]);
      setSending(false);
      console.error("Could not save the SupreCart voice note.", insertError);
      setError(insertError.message);
      return;
    }
    setSending(false);
    await loadMessages(activeConversation.id, user);
  }

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Voice recording is not supported by this browser.");
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mediaStream;
      audioChunks.current = [];
      const mimeType = ["audio/webm", "audio/ogg", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        audioChunks.current.push(event.data);
        if (
          audioChunks.current.reduce((size, chunk) => size + chunk.size, 0) > MAX_VOICE_NOTE_BYTES
        ) {
          setError("Voice note reached the 25 MB upload limit and recording has stopped.");
          mediaRecorder.stop();
          mediaStream.getTracks().forEach((track) => track.stop());
          setRecording(false);
        }
      };
      mediaRecorder.onstop = () => {
        const audio = new Blob(audioChunks.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        if (audio.size) void uploadVoiceNote(audio);
      };
      mediaRecorder.start();
      setRecording(true);
      setError("");
    } catch (cause) {
      console.error("Could not start SupreCart voice recording.", cause);
      setError(cause instanceof Error ? cause.message : "Microphone permission is required.");
    }
  }

  useEffect(
    () => () => {
      recorder.current?.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  return (
    <main className="messages-page">
      <header className="messages-topbar">
        <Link to="/" className="back-link">
          <ArrowLeft size={15} /> SupreCart
        </Link>
        <span>
          <MessageCircle size={17} /> MESSAGES
        </span>
        <Link to={isSeller ? "/sellers" : "/account"} className="messages-account-link">
          <Store size={15} /> {isSeller ? "Seller studio" : "My account"}
        </Link>
      </header>
      <div className="messages-layout">
        <aside className="messages-inbox">
          <div className="messages-inbox-heading">
            <div>
              <p className="eyebrow">YOUR MARKETPLACE</p>
              <h1>Messages</h1>
            </div>
            <span>{conversations.length}</span>
          </div>
          <p className="messages-inbox-note">
            {isSeller ? "Chats about your products" : "Talk directly with product sellers"}
          </p>
          {loading && <p className="messages-empty">Loading conversations…</p>}
          {!loading && conversations.length === 0 && (
            <div className="messages-empty">
              <MessageCircle size={21} />
              <strong>No conversations yet</strong>
              <span>Open a live product and choose “Message seller” to start a chat.</span>
              <Link to="/shop" search={{ filter: "All" }}>
                Browse products
              </Link>
            </div>
          )}
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className={`conversation-item ${conversation.id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(conversation.id)}
              >
                <span className="conversation-avatar">{conversation.peerName.charAt(0)}</span>
                <span className="conversation-copy">
                  <strong>{conversation.peerName}</strong>
                  <small>{conversation.productName}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className="messages-conversation" aria-label="Conversation">
          {activeConversation ? (
            <>
              <header className="conversation-header">
                <span className="conversation-avatar">{activeConversation.peerName.charAt(0)}</span>
                <div>
                  <strong>{activeConversation.peerName}</strong>
                  <span>About {activeConversation.productName}</span>
                </div>
              </header>
              <div className="message-list" aria-live="polite">
                {messages.length === 0 && (
                  <div className="messages-empty">
                    <MessageCircle size={22} />
                    <strong>Start the conversation</strong>
                    <span>Ask a question or send a voice note about this product.</span>
                  </div>
                )}
                {messages.map((message) => {
                  const own = message.sender_id === user?.id;
                  return (
                    <article
                      key={message.id}
                      className={`chat-message ${own ? "own-message" : "received-message"}`}
                    >
                      {message.body && <p>{message.body}</p>}
                      {message.audio_url && (
                        <audio controls preload="none" src={message.audio_url}>
                          Your browser does not support audio playback.
                        </audio>
                      )}
                      <footer>
                        <time dateTime={message.created_at}>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                        {own && (
                          <span aria-label={readIds.has(message.id) ? "Read" : "Sent"}>
                            {readIds.has(message.id) ? <CheckCheck size={14} /> : "Sent"}
                          </span>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
              {error && (
                <p className="messages-error" role="alert">
                  {error}
                </p>
              )}
              <form className="message-composer" onSubmit={(event) => void sendText(event)}>
                <label className="sr-only" htmlFor="chat-message">
                  Write a message
                </label>
                <input
                  id="chat-message"
                  name="message"
                  placeholder="Write a message…"
                  maxLength={4000}
                />
                <button
                  type="button"
                  className={`message-icon-button ${recording ? "recording" : ""}`}
                  onClick={() => void toggleRecording()}
                  aria-label={recording ? "Stop voice note recording" : "Record voice note"}
                  disabled={sending}
                >
                  {recording ? <Square size={17} /> : <Mic size={18} />}
                </button>
                <button type="submit" className="message-send-button" disabled={sending}>
                  <Send size={17} />
                  <span className="sr-only">Send message</span>
                </button>
              </form>
              <p className="voice-note-hint">
                {recording
                  ? "Recording… press stop when finished. Maximum upload size: 25 MB."
                  : "Voice notes have no time limit and a 25 MB upload cap."}
              </p>
            </>
          ) : (
            <div className="messages-placeholder">
              <MessageCircle size={32} />
              <h2>Select a conversation</h2>
              <p>Your product conversations appear here.</p>
            </div>
          )}
        </section>
      </div>
      <p className="messages-privacy-note">
        Messages and voice notes are visible only to the buyer and seller in the conversation.
      </p>
      <input className="sr-only" type="file" aria-hidden="true" tabIndex={-1} />
    </main>
  );
}
