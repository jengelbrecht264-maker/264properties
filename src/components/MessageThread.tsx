"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Msg {
  id: string;
  body: string;
  createdAt: string;
  sender: { fullName: string; role: string };
}

export function MessageThread({
  tenancyId,
  initialMessages,
}: {
  tenancyId: string;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenancyId, body }),
    });
    setSending(false);
    if (!res.ok) {
      const b = await res.json();
      setError(b.error ?? "Failed to send");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {initialMessages.length === 0 && <p className="muted">No messages yet.</p>}
        {initialMessages.map((m) => (
          <div key={m.id} className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{m.sender.fullName}</strong>
              <span className="muted">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p style={{ margin: "6px 0 0" }}>{m.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ flexDirection: "row" }}>
        <input
          style={{ flex: 1 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message..."
        />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}
