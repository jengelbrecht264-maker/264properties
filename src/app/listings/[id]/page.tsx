import { prisma } from "@/lib/prisma";
import { deedsDataProvider } from "@/lib/data-providers/deeds/MockDeedsProvider";
import { crimeDataProvider } from "@/lib/data-providers/crime/ManualOverrideCrimeProvider";
import { schoolsProvider } from "@/lib/data-providers/schools/SeedSchoolsProvider";

export default async function PropertyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      listingType: true,
      town: true,
      suburb: true,
      addressLine: true,
      description: true,
      propertyType: true,
      bedrooms: true,
      bathrooms: true,
      sizeSqm: true,
      askingPrice: true,
      lastSoldPrice: true,
      lastSoldDate: true,
    },
  });
  if (!property) return <p className="error">Property not found.</p>;

  const [deedHistory, crimeTier] = await Promise.all([
    deedsDataProvider.getTransactionHistory(property.addressLine, property.town),
    crimeDataProvider.getTierForSuburb(property.town, property.suburb),
  ]);

  const suburbAnchor = await prisma.school.findFirst({ where: { town: property.town } });
  const nearbySchools = suburbAnchor
    ? await schoolsProvider.findNearby({ town: property.town, lat: suburbAnchor.lat, lng: suburbAnchor.lng })
    : [];

  return (
    <div>
      <h1>{property.addressLine}</h1>
      <p className="muted">{property.suburb}, {property.town.replace("_", " ")}</p>
      <p>{property.description}</p>
      <p>
        {property.propertyType} · {property.bedrooms ?? "–"} bed · {property.bathrooms ?? "–"} bath
        {property.sizeSqm ? ` · ${property.sizeSqm} m²` : ""}
      </p>
      <p>
        {property.askingPrice ? (
          <strong style={{ fontSize: 20 }}>N${property.askingPrice.toLocaleString()}</strong>
        ) : (
          <span className="muted">Price on request</span>
        )}
      </p>

      <div className="card">
        <h3>Sale history</h3>
        <div className="flag amber">
          Mock data — spec Section 2.1 rates real deed-price sourcing "Amber" (a lead exists but
          is unverified). Do not treat these figures as real until MockDeedsProvider is swapped
          for a real DeedsDataProvider implementation.
        </div>
        {deedHistory.map((t, i) => (
          <p key={i}>
            N${t.price.toLocaleString()} — {t.saleDate.toLocaleDateString()}
          </p>
        ))}
      </div>

      <div className="card">
        <h3>Area crime tier</h3>
        <span className={`badge ${crimeTier.tier.toLowerCase()}`}>{crimeTier.tier}</span>
        <p className="muted">
          Source: {crimeTier.source}
          {crimeTier.setAt ? ` — set ${crimeTier.setAt.toLocaleDateString()}` : ""}
        </p>
        {crimeTier.tier === "UNKNOWN" && (
          <div className="flag red">
            No suburb-level crime data source exists in Namibia yet (spec Section 2 rates this
            RED). This is intentionally showing "unknown" rather than a fabricated score.
          </div>
        )}
      </div>

      <div className="card">
        <h3>Nearby schools</h3>
        <div className="flag amber">
          Illustrative sample data — replace with a real OpenStreetMap/HOTOSM import before launch
          (spec Section 2 rates this "Amber").
        </div>
        {nearbySchools.length === 0 && <p className="muted">None found within 5km in seed data.</p>}
        {nearbySchools.map((s, i) => (
          <p key={i}>{s.name} ({s.level}) — {s.distanceKm} km</p>
        ))}
      </div>

      <div className="flag red">
        Owner information is not shown on this public page — see spec Section 2's risk note and
        SECURITY.md. It is only reachable via the verified-professional-gated
        /api/owner-records endpoint, which requires a stated reason and is audit-logged.
      </div>
    </div>
  );
}
