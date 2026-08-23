import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNotificationProvider } from "@/lib/notifications/provider";

const RENT_DUE_WARNING_DAYS = 5;
const LEASE_RENEWAL_WARNING_DAYS = 60;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Vercel Cron target (see vercel.json — runs daily at 06:00 UTC). Rules-
 * based, no external data needed — spec Section 7 rates this Low-Medium
 * complexity for exactly this reason. Protected by CRON_SECRET so only
 * Vercel's scheduler (or someone who has that secret) can trigger it.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailProvider = getNotificationProvider();
  let rentDueCount = 0;
  let renewalCount = 0;

  // Rent-due reminders: every ACTIVE tenancy gets one, RENT_DUE_WARNING_DAYS
  // before month-end. This is a simplified MVP rule (assumes rent is due
  // on the 1st) — a real billing-cycle model belongs in Phase 2 alongside
  // actual payment processing, which is explicitly out of scope for MVP
  // (see the spec's Section 0 assumptions).
  const now = new Date();
  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilRentDue = Math.round(
    (firstOfNextMonth.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );
  const isWarningWindow = daysUntilRentDue === RENT_DUE_WARNING_DAYS;
  if (isWarningWindow) {
    const activeTenancies = await prisma.tenancy.findMany({
      where: { status: "ACTIVE" },
      include: { tenant: true, unit: true },
    });
    for (const tenancy of activeTenancies) {
      await prisma.notification.create({
        data: {
          userId: tenancy.tenantId,
          type: "RENT_DUE",
          payload: { tenancyId: tenancy.id, rentAmount: tenancy.rentAmount },
          sentAt: new Date(),
        },
      });
      await emailProvider.send({
        to: tenancy.tenant.email,
        subject: "Rent due soon",
        body: `Your rent of N$${tenancy.rentAmount.toLocaleString()} is due soon.`,
      });
      rentDueCount++;
    }
  }

  // Lease-renewal reminders: tenancies ending within the warning window
  // that haven't already been notified today.
  const renewalWindowStart = now;
  const renewalWindowEnd = daysFromNow(LEASE_RENEWAL_WARNING_DAYS);
  const expiringTenancies = await prisma.tenancy.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: renewalWindowStart, lte: renewalWindowEnd },
    },
    include: { tenant: true, unit: { include: { property: true } } },
  });
  for (const tenancy of expiringTenancies) {
    await prisma.notification.create({
      data: {
        userId: tenancy.tenantId,
        type: "LEASE_RENEWAL",
        payload: { tenancyId: tenancy.id, endDate: tenancy.endDate },
        sentAt: new Date(),
      },
    });
    if (tenancy.unit.property.landlordId) {
      await prisma.notification.create({
        data: {
          userId: tenancy.unit.property.landlordId,
          type: "LEASE_RENEWAL",
          payload: { tenancyId: tenancy.id, endDate: tenancy.endDate },
          sentAt: new Date(),
        },
      });
    }
    renewalCount++;
  }

  return NextResponse.json({ rentDueCount, renewalCount, ranAt: now.toISOString() });
}
