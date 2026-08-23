"use client";

import { useState } from "react";

interface EstimateResult {
  estimatedValue: number;
  confidenceLow: number;
  confidenceHigh: number;
  comparablesUsed: { addressLabel: string; price: number; saleDate: string; distanceKm: number }[];
  basis: string;
  isMockData: boolean;
}

export default function EstimatorPage() {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/estimator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        town: form.get("town"),
        suburb: form.get("suburb"),
        propertyType: form.get("propertyType"),
        bedrooms: form.get("bedrooms") ? Number(form.get("bedrooms")) : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Could not produce an estimate");
      return;
    }
    const body = await res.json();
    setResult(body.estimate);
  }

  return (
    <div>
      <h1>Price estimator</h1>
      <div className="flag red">
        Spec Section 7 rates this "High" complexity and explicitly warns against trusting an
        estimator built on too few real data points. Every result below is built on seed/mock
        comparable sales, not real Namibian transaction history — see
        lib/data-providers/comparables/SeedComparableSalesProvider.ts.
      </div>

      <form onSubmit={handleSubmit}>
        <label>Town</label>
        <select name="town" defaultValue="WINDHOEK">
          <option value="WINDHOEK">Windhoek</option>
          <option value="SWAKOPMUND">Swakopmund</option>
          <option value="WALVIS_BAY">Walvis Bay</option>
        </select>
        <label>Suburb</label>
        <input name="suburb" required />
        <label>Property type</label>
        <input name="propertyType" placeholder="house / apartment" required />
        <label>Bedrooms</label>
        <input name="bedrooms" type="number" min={0} />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Estimating..." : "Get estimate"}
        </button>
      </form>

      {result && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>N${result.estimatedValue.toLocaleString()}</h3>
          <p className="muted">
            Range: N${result.confidenceLow.toLocaleString()} – N${result.confidenceHigh.toLocaleString()}
          </p>
          <p>{result.basis}</p>
          <h4>Comparables used</h4>
          {result.comparablesUsed.map((c, i) => (
            <p key={i} className="muted">
              {c.addressLabel} — N${c.price.toLocaleString()} ({new Date(c.saleDate).toLocaleDateString()},
              {" "}{c.distanceKm}km away)
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
