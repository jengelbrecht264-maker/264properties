import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Profile, UserRole } from "@/generated/prisma/client";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not signed in.");
  }
}

export class ForbiddenError extends Error {
  constructor(requiredRoles: UserRole[]) {
    super(`Requires one of: ${requiredRoles.join(", ")}`);
  }
}

/** Returns the signed-in user's Profile row, or null if not authenticated. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.profile.findUnique({ where: { id: user.id } });
}

/**
 * Throws UnauthenticatedError / ForbiddenError if the current user isn't
 * signed in or doesn't hold one of the allowed roles. Use at the top of
 * every API route and Server Action that isn't fully public — this is the
 * application-layer check that backs up (never replaces) the database's
 * Row Level Security policies in supabase/migrations.
 */
export async function requireRole(...allowed: UserRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw new UnauthenticatedError();
  if (!allowed.includes(profile.role)) throw new ForbiddenError(allowed);
  return profile;
}
