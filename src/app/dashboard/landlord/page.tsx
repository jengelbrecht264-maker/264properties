import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaseEditor } from "@/components/LeaseEditor";
import { SignLeaseButton } from "@/components/SignLeaseButton";
import type { LeaseFields } from "@/lib/pdf/leaseTemplate";

export default async function LeasePage({
  params,
}: {
  params: Promise<{ tenancyId: string }>;
}) {
  const { tenancyId } = await params;
  const profile = await requireRole("LANDLORD", "TENANT", "ADMIN");

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      tenant: true,
      unit: { include: { property: { include: { landlord: true } } } },
      lease: { include: { signatures: { include: { signer: true } } } },
    },
  });

  if (!tenancy) return <p className="error">Tenancy not found.</p>;

  const isLandlord = tenancy.unit.property.landlordId === profile.id;
  const isTenant = tenancy.tenantId === profile.id;
  if (!isLandlord && !isTenant && profile.role !== "ADMIN") {
    return <p className="error">Not authorized.</p>;
  }

  const lease = tenancy.lease;
  const hasSigned = (userId: string) => lease?.signatures.some((s) => s.signerId === userId);

  return (
    <div>
      <h1>Lease — {tenancy.unit.property.addressLine} ({tenancy.unit.unitLabel})</h1>
      <p className="muted">Status: {lease?.status ?? "Not yet generated"}</p>

      {!lease && isLandlord && (
        <LeaseEditor
          tenancyId={tenancy.id}
          initial={{
            landlordName: tenancy.unit.property.landlord?.fullName,
            tenantName: tenancy.tenant.fullName,
            propertyDescription: `${tenancy.unit.unitLabel}, ${tenancy.unit.property.addressLine}, ${tenancy.unit.property.suburb}, ${tenancy.unit.property.town}`,
            rentAmount: tenancy.rentAmount,
            depositAmount: tenancy.depositAmount,
          } as Partial<LeaseFields>}
        />
      )}

      {lease && (
        <div className="card">
          <p>
            <a className="btn secondary" href={`/api/leases/${lease.id}/pdf`} target="_blank" rel="noreferrer">
              View / download PDF
            </a>
          </p>
          <h3>Signatures</h3>
          <ul>
            <li>
              Landlord: {hasSigned(tenancy.unit.property.landlordId ?? "") ? "Signed" : "Not yet signed"}
            </li>
            <li>Tenant: {hasSigned(tenancy.tenantId) ? "Signed" : "Not yet signed"}</li>
          </ul>

          {lease.status !== "SIGNED" && !hasSigned(profile.id) && (
            <SignLeaseButton leaseId={lease.id} />
          )}
        </div>
      )}

      {lease && isLandlord && lease.status === "DRAFT" && (
        <details style={{ marginTop: 16 }}>
          <summary>Edit draft</summary>
          <LeaseEditor tenancyId={tenancy.id} initial={lease.fields as unknown as LeaseFields} />
        </details>
      )}
    </div>
  );
}
