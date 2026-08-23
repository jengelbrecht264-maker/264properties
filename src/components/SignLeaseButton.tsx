"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignLeaseButton({ leaseId }: { leaseId: string }) {
  const router = useRouter();
  const [typedName, setTypedName] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSign() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leases/${leaseId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typedName, consentGiven: consent }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to sign");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card">
      <p className="muted">
        Basic electronic signature — records your typed name, IP address, and timestamp
        (spec Section 4.3). Not an identity-verified "advanced" e-signature.
      </p>
      <label>Type your full legal name to sign</label>
      <input value={typedName} onChange={(e) => setTypedName(e.target.value)} />
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I agree this constitutes my legal signature on this lease.
      </label>
      {error && <p className="error">{error}</p>}
      <button
        className="btn"
        disabled={loading || !typedName || !consent}
        onClick={handleSign}
        style={{ marginTop: 8 }}
      >
        {loading ? "Signing..." : "Sign lease"}
      </button>
    </div>
  );
}
