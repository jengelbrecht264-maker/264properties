import Link from "next/link";

export interface PropertyCardData {
  id: string;
  listingType: string;
  town: string;
  suburb: string;
  addressLine: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  askingPrice: number | null;
  lastSoldPrice: number | null;
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  return (
    <Link href={`/listings/${property.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <strong>{property.addressLine}</strong>
      <p className="muted">{property.suburb}, {property.town.replace("_", " ")}</p>
      <p>
        {property.propertyType} · {property.bedrooms ?? "–"} bed · {property.bathrooms ?? "–"} bath
      </p>
      <p>
        {property.askingPrice ? (
          <strong>N${property.askingPrice.toLocaleString()}</strong>
        ) : (
          <span className="muted">Price on request</span>
        )}
      </p>
      {property.lastSoldPrice && (
        <p className="muted">Last sold: N${property.lastSoldPrice.toLocaleString()}</p>
      )}
    </Link>
  );
}
