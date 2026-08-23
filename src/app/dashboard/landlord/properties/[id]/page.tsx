import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddUnitForm } from "@/components/AddUnitForm";
import { InviteTenantForm } from "@/components/InviteTenantForm";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("LANDLORD", "ADMIN");

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      units: {
        include: {
          tenancies: { include: { tenant: true, lease: true }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!property || (profile.role !== "ADMIN" && property.landlordId !== profile.id)) {
    return <p className="error">Property not found.</p>;
  }

  return (
    <div>
      <h1>{property.addressLine}</h1>
      <p className="muted">{property.suburb}, {property.town} — {property.listingType}</p>

      <h3>Units</h3>
      {property.units.map((unit) => {
        const activeTenancy = unit.tenancies.find((t) => t.status !== "ENDED");
        return (
          <div className="card" key={unit.id}>
            <strong>{unit.unitLabel}</strong> — N${unit.rentAmount.toLocaleString()}/month
            {activeTenancy ? (
              <div style={{ marginTop: 8 }}>
                <p className="muted">
                  Tenant: {activeTenancy.tenant.fullName} ({activeTenancy.status})
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link className="btn secondary" href={`/dashboard/landlord/leases/${activeTenancy.id}`}>
                    {activeTenancy.lease ? "Manage lease" : "Generate lease"}
                  </Link>
                  <Link className="btn secondary" href={`/dashboard/messages/${activeTenancy.id}`}>
                    Messages
                  </Link>
                </div>
              </div>
            ) : (
              <InviteTenantForm unitId={unit.id} defaultRent={unit.rentAmount} />
            )}
          </div>
        );
      })}

      <AddUnitForm propertyId={property.id} />
    </div>
  );
}
