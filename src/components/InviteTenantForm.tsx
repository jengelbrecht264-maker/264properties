"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteTenantForm({ unitId, defaultRent }: { unitId: string; defaultRent: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/tenancies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId,
        tenantEmail: form.get("tenantEmail"),
        startDate: new Date(form.get("startDate") as string).toISOString(),
        endDate: new Date(form.get("endDate") as string).toISOString(),
        rentAmount: Number(form.get("rentAmount")),
        depositAmount: Number(form.get("depositAmount")),
      }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to link tenant");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return <button className="btn secondary" onClick={() => setOpen(true)}>Link a tenant</button>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      <label>Tenant email (they must have registered already)</label>
      <input name="tenantEmail" type="email" required />
      <label>Start date</label>
      <input name="startDate" type="date" required />
      <label>End date</label>
      <input name="endDate" type="date" required />
      <label>Rent (N$/month)</label>
      <input name="rentAmount" type="number" min={1} defaultValue={defaultRent} required />
      <label>Deposit (N$)</label>
      <input name="depositAmount" type="number" min={0} defaultValue={defaultRent} required />
      {error && <p className="error">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="submit">Link tenant</button>
        <button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
