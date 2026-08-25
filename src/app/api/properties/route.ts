import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";

const createPropertySchema = z.object({
  listingType: z.enum(["FOR_SALE", "FOR_RENT", "MANAGED_RENTAL"]),
  town: z.enum(["WINDHOEK", "SWAKOPMUND", "WALVIS_BAY"]),
  suburb: z.string().min(1),
  addressLine: z.string().min(1),
  description: z.string().min(1),
  propertyType: z.string().min(1),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().int().nonnegative().nullable().optional(),
  sizeSqm: z.number().int().positive().nullable().optional(),
  askingPrice: z.number().int().positive().nullable().optional(),
  images: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    const profile = await requireRole("LANDLORD", "ADMIN");
    const properties = await prisma.property.findMany({
      where: profile.role === "ADMIN" ? {} : { landlordId: profile.id },
      include: { units: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ properties });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await requireRole("LANDLORD", "ADMIN");
    const body = createPropertySchema.parse(await req.json());

    const property = await prisma.property.create({
      data: { ...body, landlordId: profile.id },
    });
    return NextResponse.json({ property }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
