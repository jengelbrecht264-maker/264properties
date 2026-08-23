import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deedsDataProvider } from "@/lib/data-providers/deeds/MockDeedsProvider";
import { crimeDataProvider } from "@/lib/data-providers/crime/ManualOverrideCrimeProvider";
import { schoolsProvider } from "@/lib/data-providers/schools/SeedSchoolsProvider";

/**
 * Public property profile page data. Deliberately selects the same
 * PII-free field set as /api/listings, plus enrichment (deed history,
 * crime tier, nearby schools) sourced through the pluggable providers.
 * Every enrichment field carries its own "isMockData"/"source" so the
 * frontend can (and must) show the user it's not launch-grade yet — see
 * spec Section 2's per-feature feasibility ratings.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      listingType: true,
      town: true,
      suburb: true,
      addressLine: true,
      description: true,
      propertyType: true,
      bedrooms: true,
      bathrooms: true,
      sizeSqm: true,
      askingPrice: true,
      images: true,
      lastSoldPrice: true,
      lastSoldDate: true,
      createdAt: true,
    },
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const [deedHistory, crimeTier] = await Promise.all([
    deedsDataProvider.getTransactionHistory(property.addressLine, property.town),
    crimeDataProvider.getTierForSuburb(property.town, property.suburb),
  ]);

  // Schools need lat/lng — the seed data attaches an illustrative point per
  // suburb rather than a geocoded address at MVP; a real build should
  // geocode addressLine properly (Section 2 flags this as needing real
  // OSM/HOTOSM data regardless).
  const suburbAnchor = await prisma.school.findFirst({ where: { town: property.town } });
  const nearbySchools = suburbAnchor
    ? await schoolsProvider.findNearby({
        town: property.town,
        lat: suburbAnchor.lat,
        lng: suburbAnchor.lng,
      })
    : [];

  return NextResponse.json({
    property,
    deedHistory, // MockDeedsProvider — every record has isMockData: true until Section 2.1 is resolved
    crimeTier, // UNKNOWN unless an admin has entered a sourced CrimeTierOverride
    nearbySchools, // from seed sample data — replace with a real HOTOSM import before launch
  });
}
