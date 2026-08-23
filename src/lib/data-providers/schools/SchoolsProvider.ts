export interface NearbySchool {
  name: string;
  level: string;
  distanceKm: number;
}

/**
 * Spec Section 2 rates this AMBER: no official MoEAC open dataset, but
 * OpenStreetMap's Namibia POI export (via Humanitarian Data Exchange /
 * HOTOSM) is a real, usable, free workaround. SeedSchoolsProvider below
 * queries the `schools` table, which ships with a handful of
 * illustrative sample rows (prisma/seed.ts) — replace those with an actual
 * OSM/HOTOSM import for each target town before trusting this in
 * production. The query logic itself doesn't need to change.
 */
export interface SchoolsProvider {
  findNearby(params: { town: string; lat: number; lng: number; radiusKm?: number }): Promise<NearbySchool[]>;
}
