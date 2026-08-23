import { prisma } from "@/lib/prisma";
import type { SchoolsProvider, NearbySchool } from "./SchoolsProvider";
import type { Town } from "@/generated/prisma/client";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class SeedSchoolsProvider implements SchoolsProvider {
  async findNearby(params: {
    town: string;
    lat: number;
    lng: number;
    radiusKm?: number;
  }): Promise<NearbySchool[]> {
    const radius = params.radiusKm ?? 5;
    const candidates = await prisma.school.findMany({ where: { town: params.town as Town } });

    return candidates
      .map((s) => ({
        name: s.name,
        level: s.level,
        distanceKm: Math.round(haversineKm(params.lat, params.lng, s.lat, s.lng) * 10) / 10,
      }))
      .filter((s) => s.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

export const schoolsProvider: SchoolsProvider = new SeedSchoolsProvider();
