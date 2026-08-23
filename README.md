# [PLATFORM NAME] — MVP scaffold

A working code scaffold for the Namibia-focused tenant/landlord + buy/sell
property intelligence platform spec (`2026-08-23-namibia-property-platform-mvp-spec.docx`).
Next.js 16 (App Router, TypeScript) + Supabase (Postgres/Auth) + Prisma 7 +
Vercel.

**Read `SECURITY.md` before connecting real data.** It covers one real
legal blocker (owner ID/contact storage), a nuance about what Row Level
Security actually protects in this architecture, and which "data
provider" features are running on mock data.

## What's implemented

- **Tenant/Landlord module**: property/unit listings, tenant linking,
  template-based lease generator with PDF export and basic e-signature,
  maintenance request queue, in-app messaging, and a rules-based
  rent-due/lease-renewal notification cron.
- **Buy/Sell module**: public listings search, property profile pages
  (sold price/date, comparable-sales estimator, crime tier, nearby
  schools — all sourced through pluggable provider interfaces currently
  running on mock/seed data, see `SECURITY.md` §3), and a gated,
  audit-logged path to owner records for verified-professional accounts
  only.
- Full Prisma schema modeling both modules, with the owner-PII table kept
  structurally separate from public listing data (spec Section 5).
- Supabase RLS policies and an auth-trigger migration.

## What's NOT implemented / needs your input before it's launch-ready

- Real data behind the deeds/comparable-sales/crime/schools providers —
  see `SECURITY.md` §3 and the spec's Section 2.
- Legal sign-off on the owner-PII feature and the lease template —
  `SECURITY.md` §1 and §5.
- Payment processing (out of scope by design — spec Section 0).
- File/photo upload wiring (Supabase Storage) — the schema has
  `images`/`photoUrls` array fields ready for it, but no upload UI is
  built yet.
- Polished styling — this uses plain CSS (`src/app/globals.css`), not a
  component library. Functional, not pretty.
- Automated tests. None are included — add them before this handles real
  users.

## Tech stack & why

- **Next.js 16 App Router** — one codebase for frontend + API routes,
  deploys cheaply on Vercel.
- **Supabase** — Postgres + Auth in one place; RLS gives you a second
  enforcement layer for anything that queries it directly later (see
  `SECURITY.md` §2 for the important caveat about what it does and
  doesn't cover in this codebase's current architecture).
- **Prisma 7** — the "Rust-free" client (`engineType = "client"` in
  `prisma/schema.prisma`), which uses a WASM query planner and
  `@prisma/adapter-pg` instead of a native binary engine. This also
  avoids the old Prisma/Vercel serverless cold-start problem of
  downloading a 20MB+ engine binary per invocation.

## First-time setup

1. **Create a Supabase project** at supabase.com. Grab the project URL,
   anon key, and service role key from Project Settings → API, and both
   the pooled and direct Postgres connection strings from Project
   Settings → Database.

2. **Copy `.env.example` to `.env`** and fill in those values, plus:
   - `OWNER_PII_ENCRYPTION_KEY` — generate with `openssl rand -hex 32`.
   - `CRON_SECRET` — any random string.

3. **Install dependencies and set up the database:**
   ```bash
   npm install
   npm run db:generate   # generates the Prisma client — see note below
   npm run db:migrate    # creates tables from prisma/schema.prisma
   ```

4. **Run the Supabase-specific SQL** (the auth trigger and RLS policies
   Prisma migrate doesn't know about, since they touch `auth.users` and
   use `auth.uid()`):
   ```bash
   npx supabase db push  # if you have the Supabase CLI + project linked
   ```
   Or simpler: paste the contents of `supabase/migrations/00001_profiles_trigger.sql`
   and `00002_row_level_security.sql` into the Supabase dashboard's SQL
   editor and run them, in that order.

5. **Seed reference data** (comparable sales + sample schools — no
   account needed):
   ```bash
   npm run db:seed
   ```
   For a full demo with an actual property/tenancy you can log into,
   register a landlord and a tenant account through `/register` first,
   then re-run seeding with `SEED_LANDLORD_ID` / `SEED_TENANT_ID` set to
   those two accounts' Supabase user IDs (Authentication → Users in the
   Supabase dashboard).

6. **Run it:**
   ```bash
   npm run dev
   ```

## A note on `npm run db:generate` / `next build` in *this* delivery

This scaffold was built inside a sandboxed environment whose network
policy blocks `binaries.prisma.sh` (Prisma's engine CDN) — `prisma
generate` needs to reach that host even in "Rust-free" mode, to parse and
validate the schema. That meant I could not run `prisma generate` or a
full `next build` inside the sandbox that produced this code.

What I *did* verify before delivery:
- `npx tsc --noEmit` passes clean across the whole codebase, checked
  against a temporary hand-written stub matching every Prisma model/enum
  in the schema (removed before packaging — it's not part of what you
  received).
- Every `prisma.<model>.<method>()` call in the codebase was grep-audited
  against `prisma/schema.prisma` to confirm model and field names match.

What you should do on first run: `npm run db:generate` (step 3 above)
requires normal internet access to Prisma's CDN, which your machine and
Vercel's build environment both have — this is a sandbox artifact, not a
real limitation of the setup. If it fails for you too, check
`https://www.prisma-status.com` and your own network/proxy settings
before assuming the code is at fault.

## Deploying (Vercel)

1. Push this repo to GitHub (see below).
2. Import it into Vercel, add the same environment variables from
   `.env.example` (with real values) in Vercel's project settings.
3. Vercel's build runs `npm run build`, which needs `prisma generate` to
   have produced `src/generated/prisma` first — either add
   `"postinstall": "prisma generate"` to `package.json`'s scripts (common
   pattern, not included by default here so you notice this step), or add
   `npm run db:generate` as a Vercel build command override.
4. `vercel.json` already configures the daily notifications cron
   (`/api/notifications/cron`) — Vercel wires this up automatically on
   deploy, no extra setup needed beyond `CRON_SECRET` being set.

## Pushing this to your own GitHub

This project is already a local git repo with an initial commit. To push
it to a new GitHub repository:

```bash
# Create an empty repo on github.com first (no README/license — this
# project already has one), then:
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git branch -M main
git push -u origin main
```

## Project structure

```
prisma/schema.prisma          Full data model — read this first
prisma.config.ts               Prisma 7 config (datasource, migrations, seed)
supabase/migrations/           Auth trigger + RLS policies (run manually — see step 4)
src/lib/                       Business logic: auth, encryption, PDF generation,
                                notification provider, pluggable data-source providers
src/app/api/                   REST API routes
src/app/(pages)                UI: landing, auth, dashboard (landlord/tenant), public listings
src/components/                Shared client components (forms, message thread, etc.)
SECURITY.md                    Read before connecting real data
```
