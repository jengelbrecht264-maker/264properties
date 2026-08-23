import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/encryption";
import { requireRole } from "@/lib/auth";
import type { Profile } from "@/generated/prisma/client";

/**
 * The ONLY sanctioned path from a public Property to its OwnerRecord.
 * Deliberately not a Prisma relation (see schema.prisma header) so nobody
 * can `include: { owner: true }` their way past the access control by
 * accident. Every call:
 *
 *   1. Requires VERIFIED_PROFESSIONAL or ADMIN — never LANDLORD/TENANT,
 *      never an unauthenticated public request (spec Section 2 risk note,
 *      mitigation path 1).
 *   2. Writes an OwnerAccessAuditLog row before returning anything.
 *   3. Decrypts the PII fields only in-memory, only for this response —
 *      never logs the decrypted values.
 *
 * `reason` is required and stored in the audit log — callers must state
 * why they're looking (e.g. "drafting an offer to purchase"), which alone
 * won't stop misuse but makes it reviewable after the fact.
 */
export async function resolveOwnerRecord(propertyId: string, reason: string) {
  const requester: Profile = await requireRole("VERIFIED_PROFESSIONAL", "ADMIN");

  if (!reason || reason.trim().length < 5) {
    throw new Error("A specific reason is required to access owner records.");
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, ownerRefId: true },
  });
  if (!property?.ownerRefId) {
    return null; // no owner record on file for this property
  }

  const owner = await prisma.ownerRecord.findUnique({
    where: { refId: property.ownerRefId },
  });
  if (!owner) return null;

  await prisma.ownerAccessAuditLog.create({
    data: {
      requestedById: requester.id,
      ownerRefId: owner.refId,
      propertyId: property.id,
      reason: reason.trim(),
    },
  });

  return {
    ownerName: owner.ownerName,
    idNumber: owner.idNumberEnc ? decryptField(owner.idNumberEnc) : null,
    phone: owner.phoneEnc ? decryptField(owner.phoneEnc) : null,
    email: owner.emailEnc ? decryptField(owner.emailEnc) : null,
    isFictitious: owner.isFictitious,
  };
}
