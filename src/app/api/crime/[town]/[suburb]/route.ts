import { NextRequest, NextResponse } from "next/server";
import { crimeDataProvider } from "@/lib/data-providers/crime/ManualOverrideCrimeProvider";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ town: string; suburb: string }> }
) {
  const { town, suburb } = await params;
  const result = await crimeDataProvider.getTierForSuburb(town, decodeURIComponent(suburb));
  return NextResponse.json({ crimeTier: result });
}
