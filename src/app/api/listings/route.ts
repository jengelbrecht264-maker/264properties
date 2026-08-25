import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Town } from "@/generated/prisma/client";

/**
 * Public buy/sell search — no auth required. Returns ONLY public listing
 * fields. Never add owner PII to this query — that's the entire point of
 * the OwnerRecord separation in schema.prisma. See /api/owner-records for
 * the gated path.
 */
export async function GET(req: NextRequest) {
  const town = req.nextUrl.searchParams.get("town") as Town | null;
  const minPrice = req.nextUrl.searchParams.get("minPrice");
  const maxPrice = req.nextUrl.searchParams.get("maxPrice");
  const propertyType = req.nextUrl.searchParams.get("propertyType");
  const bedrooms = req.nextUrl.searchParams.get("bedrooms");

  const properties = await prisma.property.findMany({
    where: {
      listingType: { in: ["FOR_SALE", "FOR_RENT"] },
      ...(town ? { town } : {}),
      ...(propertyType ? { propertyType } : {}),
      ...(bedrooms ? { bedrooms: Number(bedrooms) } : {}),
      ...(minPrice || maxPrice
        ? {
            askingPrice: {
              ...(minPrice ? { gte: Number(minPrice) } : {}),
              ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      listingType: true,
      town: true,
      suburb: true,
      addressLine: true,
      propertyType: true,
      bedrooms: true,
      bathrooms: true,
      sizeSqm: true,
      askingPrice: true,
      images: true,
      lastSoldPrice: true,
      lastSoldDate: true,
      createdAt: true,
      // ownerRefId intentionally excluded — public route.
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ properties });
}
