import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Rust-free Prisma 7 client: talks to Postgres directly via the node-postgres
// driver adapter instead of a bundled engine binary — see the generator
// block comment in prisma/schema.prisma for why.
//
// Standard Next.js dev-mode singleton so hot-reload doesn't exhaust
// Supabase's connection pool with a fresh PrismaClient (and a fresh `pg`
// pool) on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
