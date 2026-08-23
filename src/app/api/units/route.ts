import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";

const createUnitSchema = z.object({
  propertyId: z.string().uuid(),
  unitLabel: z.string().min(1),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().int().nonnegative().nullable().optional(),
  rentAmount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const profile = await requireRole("LANDLORD", "ADMIN");
    const body = createUnitSchema.parse(await req.json());

    const property = await prisma.property.findUnique({ where: { id: body.propertyId } });
    if (!property) throw new Error("Property not found");
    if (profile.role !== "ADMIN" && property.landlordId !== profile.id) {
      throw new Error("You do not own this property");
    }

    const unit = await prisma.unit.create({ data: body });
    return NextResponse.json({ unit }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
