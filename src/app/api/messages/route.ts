import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toErrorResponse } from "@/lib/apiError";

async function assertPartyToTenancy(tenancyId: string, profileId: string, role: string) {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: { unit: { include: { property: true } } },
  });
  if (!tenancy) throw new Error("Tenancy not found");
  const isTenant = tenancy.tenantId === profileId;
  const isLandlord = tenancy.unit.property.landlordId === profileId;
  if (!isTenant && !isLandlord && role !== "ADMIN") {
    throw new Error("You are not part of this conversation.");
  }
  return tenancy;
}

export async function GET(req: NextRequest) {
  try {
    const profile = await requireRole("LANDLORD", "TENANT", "ADMIN");
    const tenancyId = req.nextUrl.searchParams.get("tenancyId");
    if (!tenancyId) throw new Error("tenancyId query param required");

    await assertPartyToTenancy(tenancyId, profile.id, profile.role);

    const messages = await prisma.message.findMany({
      where: { tenancyId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { fullName: true, role: true } } },
    });
    return NextResponse.json({ messages });
  } catch (err) {
    return toErrorResponse(err);
  }
}

const sendSchema = z.object({ tenancyId: z.string().uuid(), body: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const profile = await requireRole("LANDLORD", "TENANT", "ADMIN");
    const input = sendSchema.parse(await req.json());
    const tenancy = await assertPartyToTenancy(input.tenancyId, profile.id, profile.role);

    const message = await prisma.message.create({
      data: { tenancyId: input.tenancyId, senderId: profile.id, body: input.body },
    });

    const recipientId =
      profile.id === tenancy.tenantId ? tenancy.unit.property.landlordId : tenancy.tenantId;
    if (recipientId) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: "NEW_MESSAGE",
          payload: { tenancyId: input.tenancyId, messageId: message.id },
        },
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
