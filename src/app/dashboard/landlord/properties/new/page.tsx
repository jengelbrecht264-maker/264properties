"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPropertyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingType: form.get("listingType"),
        town: form.get("town"),
        suburb: form.get("suburb"),
        addressLine: form.get("addressLine"),
        description: form.get("description"),
        propertyType: form.get("propertyType"),
        bedrooms: form.get("bedrooms") ? Number(form.get("bedrooms")) : null,
        bathrooms: form.get("bathrooms") ? Number(form.get("bathrooms")) : null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to create property");
      return;
    }
    const { property } = await res.json();
    router.push(`/dashboard/landlord/properties/${property.id}`);
  }

  return (
    <div>
      <h1>Add a property</h1>
      <form onSubmit={handleSubmit}>
        <label>Listing type</label>
        <select name="listingType" defaultValue="MANAGED_RENTAL">
          <option value="MANAGED_RENTAL">Managed rental (not publicly listed)</option>
          <option value="FOR_RENT">For rent (public listing)</option>
          <option value="FOR_SALE">For sale (public listing)</option>
        </select>

        <label>Town</label>
        <select name="town" defaultValue="WINDHOEK">
          <option value="WINDHOEK">Windhoek</option>
          <option value="SWAKOPMUND">Swakopmund</option>
          <option value="WALVIS_BAY">Walvis Bay</option>
        </select>

        <label>Suburb</label>
        <input name="suburb" required />

        <label>Address</label>
        <input name="addressLine" required />

        <label>Property type</label>
        <input name="propertyType" placeholder="house / apartment / land" required />

        <label>Bedrooms</label>
        <input name="bedrooms" type="number" min={0} />

        <label>Bathrooms</label>
        <input name="bathrooms" type="number" min={0} />

        <label>Description</label>
        <textarea name="description" required />

        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save property"}
        </button>
      </form>
    </div>
  );
}
