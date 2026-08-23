/**
 * Seed data for local development/demo ONLY.
 *
 * IMPORTANT: every OwnerRecord this script creates has isFictitious: true
 * and uses obviously-fake names/numbers. NEVER point this script (or a
 * copy of it) at real Namibian citizens' ID numbers or contact details —
 * see SECURITY.md. Sourcing real owner PII requires resolving the spec's
 * Section 2 legal question first.
 *
 * This script creates Prisma rows only — it does NOT create the
 * corresponding Supabase Auth users, since Prisma has no access to
 * auth.users (that's Supabase's domain, not this app's Postgres schema in
 * the way this app touches it). To exercise the full login flow locally,
 * register real test accounts through /register in the browser, then
 * re-run with SEED_LANDLORD_ID / SEED_TENANT_ID env vars set to those
 * accounts' Supabase user ids so seeded properties/tenancies attach to
 * accounts you can actually log into.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptField } from "../src/lib/encryption";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const landlordId = process.env.SEED_LANDLORD_ID;
  const tenantId = process.env.SEED_TENANT_ID;

  if (!landlordId || !tenantId) {
    console.log(
      "SEED_LANDLORD_ID / SEED_TENANT_ID not set — seeding only the data that doesn't " +
        "need a real account (comparable sales, schools). Register test accounts via " +
        "/register first, then re-run with those two env vars set to seed a full demo."
    );
  }

  // ---- Reference data (no account required) --------------------------
  await prisma.comparableSale.createMany({
    data: [
      { town: "WINDHOEK", suburb: "Klein Windhoek", propertyType: "house", bedrooms: 3, price: 1_850_000, saleDate: new Date("2025-11-02"), lat: -22.5658, lng: 17.1052 },
      { town: "WINDHOEK", suburb: "Klein Windhoek", propertyType: "house", bedrooms: 3, price: 1_920_000, saleDate: new Date("2026-01-14"), lat: -22.5661, lng: 17.1049 },
      { town: "WINDHOEK", suburb: "Klein Windhoek", propertyType: "house", bedrooms: 4, price: 2_400_000, saleDate: new Date("2025-08-22"), lat: -22.5650, lng: 17.1061 },
      { town: "WINDHOEK", suburb: "Olympia", propertyType: "apartment", bedrooms: 2, price: 980_000, saleDate: new Date("2026-02-10"), lat: -22.5789, lng: 17.0954 },
      { town: "SWAKOPMUND", suburb: "Vineta", propertyType: "house", bedrooms: 3, price: 2_100_000, saleDate: new Date("2025-12-05"), lat: -22.6742, lng: 14.5165 },
      { town: "WALVIS_BAY", suburb: "Meersig", propertyType: "house", bedrooms: 3, price: 1_650_000, saleDate: new Date("2026-01-28"), lat: -22.9576, lng: 14.5053 },
    ],
    skipDuplicates: true,
  });

  await prisma.school.createMany({
    data: [
      { name: "Windhoek Gymnasium (sample)", town: "WINDHOEK", suburb: "Klein Windhoek", level: "combined", lat: -22.5670, lng: 17.1040 },
      { name: "Delta Primary School (sample)", town: "WINDHOEK", suburb: "Olympia", level: "primary", lat: -22.5795, lng: 17.0960 },
      { name: "Swakopmund Primary School (sample)", town: "SWAKOPMUND", suburb: "Vineta", level: "primary", lat: -22.6750, lng: 14.5170 },
      { name: "Walvis Bay Private High School (sample)", town: "WALVIS_BAY", suburb: "Meersig", level: "secondary", lat: -22.9580, lng: 14.5060 },
    ],
    skipDuplicates: true,
  });

  if (!landlordId || !tenantId) {
    console.log("Reference data seeded. Skipping account-linked demo data.");
    return;
  }

  // ---- Demo property + unit + tenancy (requires real account ids) ----
  const property = await prisma.property.create({
    data: {
      listingType: "MANAGED_RENTAL",
      town: "WINDHOEK",
      suburb: "Klein Windhoek",
      addressLine: "12 Sample Street",
      description: "3-bedroom family home, demo listing.",
      propertyType: "house",
      bedrooms: 3,
      bathrooms: 2,
      landlordId,
    },
  });

  const unit = await prisma.unit.create({
    data: { propertyId: property.id, unitLabel: "Main house", bedrooms: 3, bathrooms: 2, rentAmount: 14_500 },
  });

  await prisma.tenancy.create({
    data: {
      unitId: unit.id,
      tenantId,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      rentAmount: 14_500,
      depositAmount: 14_500,
      status: "ACTIVE",
    },
  });

  // ---- Demo public buy/sell listing with FICTITIOUS owner record -----
  const forSaleProperty = await prisma.property.create({
    data: {
      listingType: "FOR_SALE",
      town: "WINDHOEK",
      suburb: "Klein Windhoek",
      addressLine: "44 Demo Avenue",
      description: "4-bedroom house, demo buy/sell listing with fictitious sale history.",
      propertyType: "house",
      bedrooms: 4,
      bathrooms: 3,
      askingPrice: 2_650_000,
      lastSoldPrice: 2_400_000,
      lastSoldDate: new Date("2023-06-15"),
    },
  });

  const ownerRecord = await prisma.ownerRecord.create({
    data: {
      ownerName: "Jane Fictitious Sample", // clearly not a real person
      idNumberEnc: encryptField("00000000 0000 0 FAKE"),
      phoneEnc: encryptField("+264 00 000 0000"),
      emailEnc: encryptField("fictitious-owner@example.invalid"),
      isFictitious: true,
    },
  });

  await prisma.property.update({
    where: { id: forSaleProperty.id },
    data: { ownerRefId: ownerRecord.refId },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
