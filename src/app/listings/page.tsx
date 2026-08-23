import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import type { Town } from "@/generated/prisma/client";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ town?: string; propertyType?: string }>;
}) {
  const { town, propertyType } = await searchParams;

  const properties = await prisma.property.findMany({
    where: {
      listingType: { in: ["FOR_SALE", "FOR_RENT"] },
      ...(town ? { town: town as Town } : {}),
      ...(propertyType ? { propertyType } : {}),
    },
    select: {
      id: true,
      listingType: true,
      town: true,
      suburb: true,
      addressLine: true,
      propertyType: true,
      bedrooms: true,
      bathrooms: true,
      askingPrice: true,
      lastSoldPrice: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1>Buy / Sell listings</h1>
      <form style={{ flexDirection: "row", marginBottom: 20, maxWidth: "none" }}>
        <select name="town" defaultValue={town ?? ""}>
          <option value="">All towns</option>
          <option value="WINDHOEK">Windhoek</option>
          <option value="SWAKOPMUND">Swakopmund</option>
          <option value="WALVIS_BAY">Walvis Bay</option>
        </select>
        <input name="propertyType" placeholder="Property type" defaultValue={propertyType ?? ""} />
        <button className="btn secondary" type="submit">Filter</button>
      </form>

      <div className="grid">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
        {properties.length === 0 && <p className="muted">No listings match those filters.</p>}
      </div>
    </div>
  );
}
