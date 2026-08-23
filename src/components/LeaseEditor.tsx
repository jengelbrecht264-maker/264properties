"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeaseFields } from "@/lib/pdf/leaseTemplate";

/**
 * Form for the spec's 14-clause lease field set (Section 4.1). Submits a
 * DRAFT lease snapshot — nothing here generates lease text with an LLM,
 * per Section 4.2; this only collects the structured fields that get
 * rendered into the fixed PDF template in lib/pdf/leaseTemplate.ts.
 */
export function LeaseEditor({
  tenancyId,
  initial,
}: {
  tenancyId: string;
  initial: Partial<LeaseFields>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const f = new FormData(e.currentTarget);

    const fields: LeaseFields = {
      landlordName: String(f.get("landlordName")),
      landlordAddress: String(f.get("landlordAddress")),
      tenantName: String(f.get("tenantName")),
      tenantAddress: String(f.get("tenantAddress")),
      propertyDescription: String(f.get("propertyDescription")),
      rentAmount: Number(f.get("rentAmount")),
      rentEscalationPct: f.get("rentEscalationPct") ? Number(f.get("rentEscalationPct")) : null,
      additionalCosts: String(f.get("additionalCosts") ?? ""),
      paymentFrequency: String(f.get("paymentFrequency")),
      depositAmount: Number(f.get("depositAmount")),
      leaseStartDate: String(f.get("leaseStartDate")),
      leaseEndDate: String(f.get("leaseEndDate")),
      conditionNotes: String(f.get("conditionNotes") ?? ""),
      maintenanceSplit: String(f.get("maintenanceSplit") ?? ""),
      restorationObligations: String(f.get("restorationObligations") ?? ""),
      terminationNoticeDays: Number(f.get("terminationNoticeDays") || 90),
      usageRules: String(f.get("usageRules") ?? ""),
      sublettingAllowed: f.get("sublettingAllowed") as LeaseFields["sublettingAllowed"],
      furnitureAddendum: (f.get("furnitureAddendum") as string) || null,
    };

    const res = await fetch("/api/leases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenancyId, fields }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to save lease");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
      <div className="flag amber">
        Deposit cap and notice-period defaults below are unverified — see SECURITY.md before
        using this for a real lease.
      </div>

      <label>1. Landlord name</label>
      <input name="landlordName" defaultValue={initial.landlordName} required />
      <label>Landlord address</label>
      <input name="landlordAddress" defaultValue={initial.landlordAddress} required />
      <label>Tenant name</label>
      <input name="tenantName" defaultValue={initial.tenantName} required />
      <label>Tenant address</label>
      <input name="tenantAddress" defaultValue={initial.tenantAddress} required />

      <label>2. Property description</label>
      <textarea name="propertyDescription" defaultValue={initial.propertyDescription} required />

      <label>3. Rent (N$/month) &amp; escalation %</label>
      <input name="rentAmount" type="number" defaultValue={initial.rentAmount} required />
      <input name="rentEscalationPct" type="number" step="0.1" placeholder="Escalation % (optional)" />

      <label>4. Additional tenant-responsible costs</label>
      <textarea name="additionalCosts" placeholder="Utilities, levies, etc." />

      <label>5. Payment frequency</label>
      <input name="paymentFrequency" defaultValue="monthly" required />

      <label>6. Deposit amount (N$)</label>
      <input name="depositAmount" type="number" defaultValue={initial.depositAmount} required />

      <label>7. Lease start / end date</label>
      <input name="leaseStartDate" type="date" required />
      <input name="leaseEndDate" type="date" required />

      <label>8. Property condition at move-in</label>
      <textarea name="conditionNotes" />

      <label>9. Maintenance responsibility split</label>
      <textarea name="maintenanceSplit" />

      <label>10. Restoration obligations at lease end</label>
      <textarea name="restorationObligations" />

      <label>11. Termination notice (days)</label>
      <input name="terminationNoticeDays" type="number" defaultValue={90} />

      <label>12. Premises usage rules</label>
      <textarea name="usageRules" />

      <label>13. Subletting &amp; cession</label>
      <select name="sublettingAllowed" defaultValue="landlord_consent_required">
        <option value="allowed">Allowed</option>
        <option value="not_allowed">Not allowed</option>
        <option value="landlord_consent_required">Requires landlord consent</option>
      </select>

      <label>14. Furniture addendum (optional)</label>
      <textarea name="furnitureAddendum" />

      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save draft"}
      </button>
    </form>
  );
}
