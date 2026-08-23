import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";

const signSchema = z.object({
  typedName: z.string().min(1),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "Consent checkbox must be checked to sign." }),
  }),
});

/**
 * Records a "basic" electronic signature per spec Section 4.3: typed name +
 * IP + user agent + timestamp + explicit consent, all stored as an audit
 * trail on LeaseSignature. This is NOT an "advanced electronic signature"
 * with certified identity verification — confirm with counsel before
 * relying on this for high-value or dispute-prone leases (see SECURITY.md).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireRole("LANDLORD", "TENANT", "ADMIN");
    const { id: leaseId } = await params;
    const body = signSchema.parse(await req.json());

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenancy: { include: { unit: { include: { property: true } }, tenant: true } } },
    });
    if (!lease) throw new Error("Lease not found");

    const isTenant = lease.tenancy.tenantId === profile.id;
    const isLandlord = lease.tenancy.unit.property.landlordId === profile.id;
    if (!isTenant && !isLandlord && profile.role !== "ADMIN") {
      throw new Error("You are not a party to this lease.");
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    const signature = await prisma.leaseSignature.create({
      data: {
        leaseId,
        signerId: profile.id,
        typedName: body.typedName,
        ipAddress: ip,
        userAgent,
        consentGiven: body.consentGiven,
      },
    });

    // Both parties signed -> mark the lease SIGNED and lock it (fields
    // become immutable going forward; edits after this point should create
    // a new lease version, not mutate a signed one).
    const allSignatures = await prisma.leaseSignature.findMany({ where: { leaseId } });
    const signerIds = new Set(allSignatures.map((s) => s.signerId));
    const bothPartiesSigned =
      signerIds.has(lease.tenancy.tenantId) &&
      (lease.tenancy.unit.property.landlordId
        ? signerIds.has(lease.tenancy.unit.property.landlordId)
        : false);

    if (bothPartiesSigned) {
      await prisma.lease.update({ where: { id: leaseId }, data: { status: "SIGNED" } });
    } else {
      await prisma.lease.update({ where: { id: leaseId }, data: { status: "SENT_FOR_SIGNATURE" } });
    }

    return NextResponse.json({ signature }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
