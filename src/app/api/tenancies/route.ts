import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";

const createTenancySchema = z.object({
  unitId: z.string().uuid(),
  tenantEmail: z.string().email(), // tenant must already have a Profile (see /api/auth/register)
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  rentAmount: z.number().int().positive(),
  depositAmount: z.number().int().nonnegative(),
});

/** Landlord creates a tenancy, linking an existing tenant account to a unit. */
export async function POST(req: NextRequest) {
  try {
    const profile = await requireRole("LANDLORD", "ADMIN");
    const body = createTenancySchema.parse(await req.json());

    const unit = await prisma.unit.findUnique({
      where: { id: body.unitId },
      include: { property: true },
    });
    if (!unit) throw new Error("Unit not found");
    if (profile.role !== "ADMIN" && unit.property.landlordId !== profile.id) {
      throw new Error("You do not manage this unit");
    }

    const tenant = await prisma.profile.findUnique({ where: { email: body.tenantEmail } });
    if (!tenant || tenant.role !== "TENANT") {
      throw new Error(
        "No tenant account found with that email — the tenant needs to sign up first, " +
          "then you can link them to this unit."
      );
    }

    const tenancy = await prisma.tenancy.create({
      data: {
        unitId: body.unitId,
        tenantId: tenant.id,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        rentAmount: body.rentAmount,
        depositAmount: body.depositAmount,
        status: "PENDING",
      },
    });
    return NextResponse.json({ tenancy }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET() {
  try {
    const profile = await requireRole("LANDLORD", "TENANT", "ADMIN");

    const tenancies =
      profile.role === "TENANT"
        ? await prisma.tenancy.findMany({
            where: { tenantId: profile.id },
            include: { unit: { include: { property: true } }, lease: true },
          })
        : await prisma.tenancy.findMany({
            where:
              profile.role === "ADMIN"
                ? {}
                : { unit: { property: { landlordId: profile.id } } },
            include: { unit: { include: { property: true } }, lease: true, tenant: true },
          });

    return NextResponse.json({ tenancies });
  } catch (err) {
    return toErrorResponse(err);
  }
}
