import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";

const updateSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]).optional(),
  note: z.string().min(1).optional(),
});

/** Landlord updates ticket status and/or adds an internal note. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireRole("LANDLORD", "ADMIN");
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { unit: { include: { property: true } } },
    });
    if (!existing) throw new Error("Maintenance request not found");
    if (profile.role !== "ADMIN" && existing.unit.property.landlordId !== profile.id) {
      throw new Error("You do not manage this property");
    }

    if (body.status) {
      await prisma.maintenanceRequest.update({ where: { id }, data: { status: body.status } });

      const tenancy = await prisma.tenancy.findUnique({ where: { id: existing.tenancyId } });
      if (tenancy) {
        await prisma.notification.create({
          data: {
            userId: tenancy.tenantId,
            type: "MAINTENANCE_UPDATE",
            payload: { maintenanceRequestId: id, status: body.status },
          },
        });
      }
    }

    if (body.note) {
      await prisma.maintenanceNote.create({
        data: { maintenanceRequestId: id, authorId: profile.id, body: body.note },
      });
    }

    const updated = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { notes: true },
    });
    return NextResponse.json({ request: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}
