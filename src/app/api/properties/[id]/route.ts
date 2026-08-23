import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";

const updatePropertySchema = z.object({
  description: z.string().min(1).optional(),
  askingPrice: z.number().int().positive().nullable().optional(),
  images: z.array(z.string()).optional(),
});

async function assertOwnsProperty(propertyId: string, landlordId: string, isAdmin: boolean) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new Error("Property not found");
  if (!isAdmin && property.landlordId !== landlordId) {
    throw new Error("You do not own this property");
  }
  return property;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await requireRole("LANDLORD", "ADMIN");
    const property = await assertOwnsProperty(id, profile.id, profile.role === "ADMIN");
    const units = await prisma.unit.findMany({ where: { propertyId: id } });
    return NextResponse.json({ property, units });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await requireRole("LANDLORD", "ADMIN");
    await assertOwnsProperty(id, profile.id, profile.role === "ADMIN");
    const body = updatePropertySchema.parse(await req.json());

    const property = await prisma.property.update({ where: { id }, data: body });
    return NextResponse.json({ property });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await requireRole("LANDLORD", "ADMIN");
    await assertOwnsProperty(id, profile.id, profile.role === "ADMIN");
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
