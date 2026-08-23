import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client, scoped to the requesting user's session via
 * their auth cookies. Use this in Server Components, Route Handlers, and
 * Server Actions — never expose the service-role client (below) to
 * anything that runs per-request on behalf of a specific user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no response to write to —
            // safe to ignore as long as middleware refreshes the session.
          }
        },
      },
    }
  );
}

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 * Server-only. Use ONLY for trusted background jobs (the notifications
 * cron) or admin-only routes that have already independently checked the
 * caller's role. Never import this into anything reachable by a normal
 * user request without an explicit role check first.
 */
export function createServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceRoleClient must never run in the browser.");
  }
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
