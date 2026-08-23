import { prisma } from "@/lib/prisma";
import type { ComparableSalesProvider, ComparableSaleResult } from "./ComparableSalesProvider";
import type { Town } from "@/generated/prisma/client";

/** Naive straight-line distance in km — fine for a same-town comparable search at MVP scale. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Reads from the `comparable_sales` table, which is seeded with clearly
 * fake data (see prisma/seed.ts). Structurally this is what a real
 * provider would look like once actual transaction history is available —
 * only the data source changes, not this query shape.
 */
export class SeedComparableSalesProvider implements ComparableSalesProvider {
  async findComparables(params: {
    town: string;
    suburb: string;
    propertyType: string;
    bedrooms: number | null;
    maxResults?: number;
  }): Promise<ComparableSaleResult[]> {
    const candidates = await prisma.comparableSale.findMany({
      where: { town: params.town as Town, propertyType: params.propertyType },
      orderBy: { saleDate: "desc" },
      take: 50,
    });

    // Anchor point: centroid of the suburb's candidate sales, or (0,0) if none.
    const anchor = candidates[0] ?? { lat: 0, lng: 0 };

    return candidates
      .map((c) => ({
        addressLabel: `${c.suburb}, ${c.town}`,
        town: c.town,
        price: c.price,
        saleDate: c.saleDate,
        bedrooms: c.bedrooms,
        distanceKm: Math.round(haversineKm(anchor.lat, anchor.lng, c.lat, c.lng) * 10) / 10,
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, params.maxResults ?? 5);
  }
}

export const comparableSalesProvider: ComparableSalesProvider = new SeedComparableSalesProvider();
