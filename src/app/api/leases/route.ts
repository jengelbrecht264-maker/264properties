import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";
import type { Prisma } from "@/generated/prisma/client";

const leaseFieldsSchema = z.object({
  landlordName: z.string().min(1),
  landlordAddress: z.string().min(1),
  tenantName: z.string().min(1),
  tenantAddress: z.string().min(1),
  propertyDescription: z.string().min(1),
  rentAmount: z.number().int().positive(),
  rentEscalationPct: z.number().nonnegative().nullable(),
  additionalCosts: z.string(),
  paymentFrequency: z.string().min(1),
  depositAmount: z.number().int().nonnegative(),
  leaseStartDate: z.string().min(1),
  leaseEndDate: z.string().min(1),
  conditionNotes: z.string(),
  maintenanceSplit: z.string(),
  restorationObligations: z.string(),
  terminationNoticeDays: z.number().int().positive().default(90),
  usageRules: z.string(),
  sublettingAllowed: z.enum(["allowed", "not_allowed", "landlord_consent_required"]),
  furnitureAddendum: z.string().nullable(),
});

const createLeaseSchema = z.object({
  tenancyId: z.string().uuid(),
  fields: leaseFieldsSchema,
});

/**
 * Creates a DRAFT lease from a template-field snapshot — spec Section 4.2:
 * template-based only, never free-text generation. Generating the actual
 * PDF happens on GET /api/leases/[id]/pdf, and signing on
 * POST /api/leases/[id]/sign.
 */
export async function POST(req: NextRequest) {
  try {
    const profile = await requireRole("LANDLORD", "ADMIN");
    const body = createLeaseSchema.parse(await req.json());

    const tenancy = await prisma.tenancy.findUnique({
      where: { id: body.tenancyId },
      include: { unit: { include: { property: true } } },
    });
    if (!tenancy) throw new Error("Tenancy not found");
    if (profile.role !== "ADMIN" && tenancy.unit.property.landlordId !== profile.id) {
      throw new Error("You do not manage this tenancy");
    }

    // Prisma's generated types for a `Json` column require an index
    // signature, which the LeaseFields interface doesn't have even though
    // its shape is fully compatible at runtime. This cast is safe --
    // leaseFieldsSchema.parse() above already validated the actual shape.
    const fields = body.fields as unknown as Prisma.InputJsonValue;

    const lease = await prisma.lease.upsert({
      where: { tenancyId: body.tenancyId },
      update: { fields, status: "DRAFT", version: { increment: 1 } },
      create: { tenancyId: body.tenancyId, fields, status: "DRAFT" },
    });

    return NextResponse.json({ lease }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
