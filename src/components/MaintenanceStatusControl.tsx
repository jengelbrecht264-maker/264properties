"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MaintenanceStatusControl({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleUpdate() {
    setSaving(true);
    await fetch(`/api/maintenance/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: note || undefined }),
    });
    setSaving(false);
    setNote("");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="NEW">New</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="RESOLVED">Resolved</option>
      </select>
      <input
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ flex: 1 }}
      />
      <button className="btn secondary" onClick={handleUpdate} disabled={saving}>
        {saving ? "Saving..." : "Update"}
      </button>
    </div>
  );
}
