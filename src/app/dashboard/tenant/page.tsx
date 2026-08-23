"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Tenancy {
  id: string;
  unit: { unitLabel: string; property: { addressLine: string } };
}

export default function NewMaintenanceRequestPage() {
  const router = useRouter();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tenancies")
      .then((r) => r.json())
      .then((d) => setTenancies(d.tenancies ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenancyId: form.get("tenancyId"),
        category: form.get("category"),
        description: form.get("description"),
        urgency: form.get("urgency"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to submit request");
      return;
    }
    router.push("/dashboard/tenant");
  }

  return (
    <div>
      <h1>Report an issue</h1>
      <form onSubmit={handleSubmit}>
        <label>Property / unit</label>
        <select name="tenancyId" required>
          {tenancies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.unit.property.addressLine} ({t.unit.unitLabel})
            </option>
          ))}
        </select>
        <label>Category</label>
        <input name="category" placeholder="Plumbing, electrical, appliance..." required />
        <label>Urgency</label>
        <select name="urgency" defaultValue="MEDIUM">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="EMERGENCY">Emergency</option>
        </select>
        <label>Description</label>
        <textarea name="description" required />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </div>
  );
}
