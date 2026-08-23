/**
 * Thin re-export so route handlers have one obvious place to import audit
 * logging from. The actual write happens inside
 * lib/data-providers/ownerAccess.ts, which is the only code path allowed
 * to touch OwnerRecord — see that file for why this isn't a general-purpose
 * audit logger.
 */
export { resolveOwnerRecord } from "@/lib/data-providers/ownerAccess";
