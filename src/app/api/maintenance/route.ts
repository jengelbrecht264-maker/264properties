import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";

const createRequestSchema = z.object({
  tenancyId: z.string().uuid(),
  category: z.string().min(1),
  description: z.string().min(1),
  photoUrls: z.array(z.string()).default([]),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).default("MEDIUM"),
});

/** Tenant submits a maintenance request against their own active tenancy. */
export async function POST(req: NextRequest) {
  try {
    const profile = await requireRole("TENANT");
    const body = createRequestSchema.parse(await req.json());

    const tenancy = await prisma.tenancy.findUnique({
      where: { id: body.tenancyId },
      include: { unit: { include: { property: true } } },
    });
    if (!tenancy || tenancy.tenantId !== profile.id) {
      throw new Error("You do not have an active tenancy matching this request.");
    }

    const request = await prisma.maintenanceRequest.create({
      data: { ...body, unitId: tenancy.unitId },
    });

    const landlordId = tenancy.unit.property.landlordId;
    if (landlordId) {
      await prisma.notification.create({
        data: {
          userId: landlordId,
          type: "MAINTENANCE_UPDATE",
          payload: { maintenanceRequestId: request.id, status: "NEW" },
        },
      });
    }

    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** Landlord sees requests across their properties; tenant sees their own. */
export async function GET() {
  try {
    const profile = await requireRole("LANDLORD", "TENANT", "ADMIN");

    const requests =
      profile.role === "TENANT"
        ? await prisma.maintenanceRequest.findMany({
            where: { tenancy: { tenantId: profile.id } },
            include: { notes: true },
            orderBy: { createdAt: "desc" },
          })
        : await prisma.maintenanceRequest.findMany({
            where:
              profile.role === "ADMIN"
                ? {}
                : { unit: { property: { landlordId: profile.id } } },
            include: { notes: true, tenancy: { include: { tenant: true } } },
            orderBy: { createdAt: "desc" },
          });

    return NextResponse.json({ requests });
  } catch (err) {
    return toErrorResponse(err);
  }
}
