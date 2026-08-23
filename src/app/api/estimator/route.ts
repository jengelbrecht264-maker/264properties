import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { estimatePropertyValue } from "@/lib/estimator/estimate";
import { toErrorResponse } from "@/lib/apiError";

const estimateSchema = z.object({
  town: z.enum(["WINDHOEK", "SWAKOPMUND", "WALVIS_BAY"]),
  suburb: z.string().min(1),
  propertyType: z.string().min(1),
  bedrooms: z.number().int().nonnegative().nullable(),
});

/**
 * Public estimator endpoint. Spec Section 6 (Phase 2b): don't treat this
 * as launch-ready until SeedComparableSalesProvider is backed by real
 * transaction data — every response is flagged isMockData: true until
 * that provider is swapped. See lib/estimator/estimate.ts for the method.
 */
export async function POST(req: NextRequest) {
  try {
    const input = estimateSchema.parse(await req.json());
    const result = await estimatePropertyValue(input);
    return NextResponse.json({ estimate: result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
