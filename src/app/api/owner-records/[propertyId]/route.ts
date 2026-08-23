import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveOwnerRecord } from "@/lib/data-providers/ownerAccess";
import { toErrorResponse } from "@/lib/apiError";

const reasonSchema = z.object({ reason: z.string().min(5) });

/**
 * The gated path to owner PII — spec Section 2 risk note, mitigation
 * path 1. VERIFIED_PROFESSIONAL / ADMIN only (enforced inside
 * resolveOwnerRecord, not here — don't duplicate the check and risk it
 * drifting out of sync). Every call is audit-logged with the caller's
 * stated reason.
 *
 * There is currently no UI path that calls this for an ordinary buyer —
 * intentionally. Do not wire this into the public property page.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ propertyId: string }> }) {
  try {
    const { propertyId } = await params;
    const { reason } = reasonSchema.parse(await req.json());
    const owner = await resolveOwnerRecord(propertyId, reason);

    if (!owner) {
      return NextResponse.json({ owner: null, message: "No owner record on file." });
    }
    return NextResponse.json({ owner });
  } catch (err) {
    return toErrorResponse(err);
  }
}
