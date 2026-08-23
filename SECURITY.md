# Security notes — read before touching real data

This file exists because this codebase was built from an MVP spec that
flagged one feature as a genuine legal/ethical risk (owner ID and contact
data), and because a working scaffold can look more "done" than it is.
Read this before you connect real users, real money, or real Namibian
citizens' personal information to it.

## 1. The owner-PII feature is not cleared to launch

`OwnerRecord` (see `prisma/schema.prisma`) can store a property owner's
national ID number and personal contact details, encrypted at the field
level (`src/lib/encryption.ts`) and gated behind the
`VERIFIED_PROFESSIONAL`/`ADMIN` role plus an audit log
(`src/lib/data-providers/ownerAccess.ts`).

That architecture is a reasonable engineering answer to "how would you
store this safely." It is not an answer to "should you store this at
all." Per the spec (Section 2's risk note):

- Namibia has no Data Protection Act in force. There is no external
  compliance bar telling you what's required here — which cuts against
  building this, not in favor of it, since it means there's no regulator
  defining your liability if something goes wrong.
- No public source confirms that Namibian deed records legally expose a
  property owner's national ID number or personal contact details — deeds
  show legal ownership (name, erf description), not ID numbers or
  phone/email.
- The seed script (`prisma/seed.ts`) only ever inserts data marked
  `isFictitious: true`. **Do not write an import pipeline that sets real
  owner ID numbers or contact details into this table until you've gotten
  a Namibian attorney's sign-off** on one of the two mitigation paths the
  spec lays out: (1) show only the legal owner name publicly, gate full
  ID/contact behind a signed data-use agreement with verified
  professionals only, or (2) never store ID numbers/contact details at
  all, only the legal name.
- If you build an import pipeline before that legal review, at minimum
  keep `isFictitious` accurate and don't wire it into
  `/api/owner-records` for real users.

## 2. Row Level Security doesn't cover what you might assume

`supabase/migrations/00002_row_level_security.sql` defines RLS policies,
including one restricting `owner_records` to verified-professional/admin
roles. Read the comment block at the top of that file carefully: **this
app's API routes (`src/app/api/**`) connect to Postgres via Prisma using a
direct connection string, not through Supabase's PostgREST data API**.
That means those queries authenticate as a database role, not as a
Supabase-authenticated end user — RLS policies keyed on `auth.uid()`
silently don't apply to them.

The actual enforcement for this codebase's API routes is:
1. `requireRole()` in `src/lib/auth.ts`, called at the top of every
   non-public route handler.
2. `Property.ownerRefId` is deliberately not a Prisma relation, so nobody
   can `include` their way past `resolveOwnerRecord()`'s role check by
   accident.

The RLS policies are still worth keeping — they're the real security
boundary the moment anything queries Supabase directly (Realtime
subscriptions, a future mobile client using `supabase-js` against the
database instead of this app's API). But don't tell a client or an
investor "the database enforces this" without qualifying which access
path you mean. A security reviewer should confirm this split is
acceptable — that's an explicit ask from the spec (Section 5), not
optional polish.

## 3. Nothing in "Data provider" land is real data yet

Four features are built against a `DataProvider` interface with a
mock/manual implementation, because no real Namibian data source exists
yet for any of them (spec Section 2):

| Interface | Mock/current implementation | What "real" looks like |
|---|---|---|
| `DeedsDataProvider` | `MockDeedsProvider` — deterministic fake numbers from the address string | A provider backed by the ~N$7/transaction deeds source, once its terms are confirmed |
| `ComparableSalesProvider` | `SeedComparableSalesProvider` — reads the `comparable_sales` table, seeded with ~6 fake rows | Backed by real transaction history once volume exists |
| `CrimeDataProvider` | `ManualOverrideCrimeProvider` — returns `UNKNOWN` unless an admin manually entered a sourced, dated tier | No known path to a real suburb-level dataset in Namibia as of this spec |
| `SchoolsProvider` | `SeedSchoolsProvider` — ~4 illustrative sample rows | A real OpenStreetMap/HOTOSM Namibia POI import, town by town |

Every mock response carries an `isMockData`/`source` field specifically so
the frontend is forced to disclose it (see the flag boxes on
`/listings/[id]` and `/estimator`). If you build a real provider, **keep
returning that field honestly** — don't let "it works now" quietly become
"we're presenting fake data as real."

## 4. Basic e-signature, not identity-verified

`src/app/api/leases/[id]/sign/route.ts` records a typed name, IP address,
user agent, timestamp, and an explicit consent checkbox. This is the
"basic" tier under Namibia's Electronic Transactions Act 4 of 2019, not an
identity-verified "advanced" electronic signature. Confirm with counsel
before relying on this for a high-value or dispute-prone lease — see spec
Section 4.3.

## 5. The lease template itself hasn't been legally reviewed

`src/lib/pdf/leaseTemplate.ts` implements the spec's 14-clause field set,
including a visible disclaimer about the unresolved deposit-cap question
(sources disagree on whether it's one month's rent or half a month's rent
under a possibly-lapsed 1977 Ordinance). **Do not remove that disclaimer
or present a lease generated by this code as legally reviewed** until an
actual Namibian attorney has signed off on the template — spec Section
4.2 is explicit that this is a fixed one-time legal cost, separate from
the dev budget.

## 6. Secrets

- `OWNER_PII_ENCRYPTION_KEY` — losing this makes existing encrypted owner
  data permanently unrecoverable. Back it up like a database credential.
  Rotate by decrypting and re-encrypting every row under the new key
  before removing the old one.
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS entirely. Never send it to
  the browser, never log it, never put it in a client component.
- `CRON_SECRET` — protects `/api/notifications/cron` from being triggered
  by anyone who finds the URL.

## 7. What this scaffold does NOT include

Payment processing (rent collection) is explicitly out of MVP scope per
the spec's own Section 0 assumptions — notifications only. Adding it
later is a materially bigger, separate build (PCI-adjacent compliance,
reconciliation, refunds), not a small addition to this codebase.
