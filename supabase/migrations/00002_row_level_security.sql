-- Row Level Security policies — spec Section 5's "role-restricted internal
-- access only" requirement for the owner PII table, plus baseline policies
-- for everything else.
--
-- ****************************************************************************
-- READ THIS FIRST: what these policies actually protect in this codebase.
-- ****************************************************************************
-- This project's API routes (src/app/api/**) talk to Postgres through
-- Prisma via a direct connection string (DATABASE_URL/DIRECT_URL — see
-- src/lib/prisma.ts), not through Supabase's PostgREST data API. A direct
-- Postgres connection authenticates as a database role, not as a
-- Supabase-authenticated end user, so RLS policies keyed on `auth.uid()`
-- do NOT apply to queries Prisma makes — access control for those routes
-- is enforced entirely by requireRole() in src/lib/auth.ts, and the
-- deliberately-not-a-relation pattern on Property.ownerRefId.
--
-- These policies matter for anything that queries Supabase directly with
-- the anon/authenticated key instead of through this app's API — e.g. if
-- you later add Supabase Realtime for live messaging, or a mobile client
-- that talks to Supabase directly. Keep them in place as defense in depth
-- and because that's likely where this architecture goes next, but do not
-- treat them as the reason the owner-PII table is safe today — the
-- application-layer check in resolveOwnerRecord() is doing that job.
-- A security reviewer should confirm this split is acceptable before
-- launch (see SECURITY.md).
-- ****************************************************************************

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.tenancies enable row level security;
alter table public.leases enable row level security;
alter table public.lease_signatures enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_notes enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.owner_records enable row level security;
alter table public.owner_access_audit_log enable row level security;
alter table public.comparable_sales enable row level security;
alter table public.schools enable row level security;
alter table public.crime_tier_overrides enable row level security;

-- profiles: a user can read/update their own row; admins read all.
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles: admin read all" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

-- properties: public listings are readable by anyone; only the owning
-- landlord (or admin) can write. Note this table has no PII columns by
-- design (see schema.prisma) — that's what makes a public read policy safe.
create policy "properties: public read" on public.properties
  for select using (true);
create policy "properties: landlord write own" on public.properties
  for all using (auth.uid() = landlord_id) with check (auth.uid() = landlord_id);
create policy "properties: admin write all" on public.properties
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

-- units/tenancies/leases/maintenance/messages: visible only to the
-- landlord who owns the property or the tenant on that tenancy.
create policy "units: landlord manage own" on public.units
  for all using (
    exists (
      select 1 from public.properties pr
      where pr.id = units.property_id and pr.landlord_id = auth.uid()
    )
  );

create policy "tenancies: tenant read own" on public.tenancies
  for select using (auth.uid() = tenant_id);
create policy "tenancies: landlord manage own" on public.tenancies
  for all using (
    exists (
      select 1 from public.units u
      join public.properties pr on pr.id = u.property_id
      where u.id = tenancies.unit_id and pr.landlord_id = auth.uid()
    )
  );

create policy "leases: party read own" on public.leases
  for select using (
    exists (
      select 1 from public.tenancies t
      join public.units u on u.id = t.unit_id
      join public.properties pr on pr.id = u.property_id
      where t.id = leases.tenancy_id
        and (t.tenant_id = auth.uid() or pr.landlord_id = auth.uid())
    )
  );

create policy "maintenance: party access" on public.maintenance_requests
  for all using (
    exists (
      select 1 from public.tenancies t
      join public.units u on u.id = t.unit_id
      join public.properties pr on pr.id = u.property_id
      where t.id = maintenance_requests.tenancy_id
        and (t.tenant_id = auth.uid() or pr.landlord_id = auth.uid())
    )
  );

create policy "messages: party access" on public.messages
  for all using (
    exists (
      select 1 from public.tenancies t
      join public.units u on u.id = t.unit_id
      join public.properties pr on pr.id = u.property_id
      where t.id = messages.tenancy_id
        and (t.tenant_id = auth.uid() or pr.landlord_id = auth.uid())
    )
  );

create policy "notifications: read own" on public.notifications
  for select using (auth.uid() = user_id);

-- owner_records / owner_access_audit_log: the actual sensitive tables.
-- Only verified_professional / admin roles, full stop. No policy grants
-- landlord or tenant roles anything here, intentionally.
create policy "owner_records: verified professionals only" on public.owner_records
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('VERIFIED_PROFESSIONAL', 'ADMIN')
    )
  );

create policy "owner_access_audit_log: admin read" on public.owner_access_audit_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );
create policy "owner_access_audit_log: self insert" on public.owner_access_audit_log
  for insert with check (auth.uid() = requested_by_id);

-- Reference data tables (comparable sales, schools, crime overrides): public
-- read since they back public-facing estimator/profile features; writes
-- restricted to admin.
create policy "comparable_sales: public read" on public.comparable_sales
  for select using (true);
create policy "schools: public read" on public.schools
  for select using (true);
create policy "crime_tier_overrides: public read" on public.crime_tier_overrides
  for select using (true);
create policy "crime_tier_overrides: admin write" on public.crime_tier_overrides
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );
