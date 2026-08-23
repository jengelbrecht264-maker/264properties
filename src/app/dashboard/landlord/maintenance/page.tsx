import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MaintenanceStatusControl } from "@/components/MaintenanceStatusControl";

export default async function MaintenanceQueuePage() {
  const profile = await requireRole("LANDLORD", "ADMIN");

  const requests = await prisma.maintenanceRequest.findMany({
    where: profile.role === "ADMIN" ? {} : { unit: { property: { landlordId: profile.id } } },
    include: {
      notes: true,
      tenancy: { include: { tenant: true } },
      unit: { include: { property: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1>Maintenance queue</h1>
      {requests.length === 0 && <p className="muted">No requests yet.</p>}
      {requests.map((r) => (
        <div className="card" key={r.id}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{r.category}</strong>{" "}
              <span className={`badge ${r.urgency.toLowerCase()}`}>{r.urgency}</span>
              <p className="muted">
                {r.unit.property.addressLine} ({r.unit.unitLabel}) — reported by {r.tenancy.tenant.fullName}
              </p>
            </div>
            <span className="muted">{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          <p>{r.description}</p>
          <MaintenanceStatusControl requestId={r.id} currentStatus={r.status} />
        </div>
      ))}
    </div>
  );
}
