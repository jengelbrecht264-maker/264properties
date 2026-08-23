"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddUnitForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        unitLabel: form.get("unitLabel"),
        bedrooms: form.get("bedrooms") ? Number(form.get("bedrooms")) : null,
        bathrooms: form.get("bathrooms") ? Number(form.get("bathrooms")) : null,
        rentAmount: Number(form.get("rentAmount")),
      }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to add unit");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return <button className="btn secondary" onClick={() => setOpen(true)}>+ Add unit</button>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      <label>Unit label</label>
      <input name="unitLabel" placeholder="Main house / Unit 3B" required />
      <label>Rent (N$/month)</label>
      <input name="rentAmount" type="number" min={1} required />
      <label>Bedrooms</label>
      <input name="bedrooms" type="number" min={0} />
      <label>Bathrooms</label>
      <input name="bathrooms" type="number" min={0} />
      {error && <p className="error">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit">Save</button>
        <button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
