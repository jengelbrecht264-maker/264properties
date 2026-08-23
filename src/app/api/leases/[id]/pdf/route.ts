import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";
import { generateLeasePdf, type LeaseFields } from "@/lib/pdf/leaseTemplate";

/**
 * Generates (or re-generates) the lease PDF from its current field
 * snapshot and streams it back. In production, swap the direct byte
 * response for uploading to Supabase Storage and updating `lease.pdfPath`,
 * then redirect to a signed URL — kept simple here so the scaffold has no
 * Storage-bucket setup dependency to run this one route.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("LANDLORD", "TENANT", "ADMIN");

    const lease = await prisma.lease.findUnique({
      where: { id: (await params).id },
      include: { tenancy: { include: { unit: { include: { property: true } } } } },
    });
    if (!lease) throw new Error("Lease not found");

    const pdfBytes = await generateLeasePdf(lease.fields as unknown as LeaseFields);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="lease-${lease.id}.pdf"`,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
