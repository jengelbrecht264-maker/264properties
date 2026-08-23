import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/components/MessageThread";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ tenancyId: string }>;
}) {
  const { tenancyId } = await params;
  const profile = await requireRole("LANDLORD", "TENANT", "ADMIN");

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: { unit: { include: { property: true } }, tenant: true },
  });
  if (!tenancy) return <p className="error">Tenancy not found.</p>;

  const isParty =
    tenancy.tenantId === profile.id ||
    tenancy.unit.property.landlordId === profile.id ||
    profile.role === "ADMIN";
  if (!isParty) return <p className="error">Not authorized.</p>;

  const messages = await prisma.message.findMany({
    where: { tenancyId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { fullName: true, role: true } } },
  });

  return (
    <div>
      <h1>Messages — {tenancy.unit.property.addressLine} ({tenancy.unit.unitLabel})</h1>
      <MessageThread
        tenancyId={tenancyId}
        initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
