import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 requires this file (package.json's old "prisma" block is gone).
// See README.md's "Database setup" section for the full first-run sequence
// — generate, migrate, seed are all separate explicit steps in v7, unlike
// v6 where migrate would trigger the others automatically.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
