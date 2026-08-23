import { NextRequest, NextResponse } from "next/server";
import { schoolsProvider } from "@/lib/data-providers/schools/SeedSchoolsProvider";

export async function GET(req: NextRequest) {
  const town = req.nextUrl.searchParams.get("town");
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (!town || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "town, lat, lng query params required" }, { status: 400 });
  }

  const schools = await schoolsProvider.findNearby({ town, lat, lng });
  return NextResponse.json({ schools });
}
