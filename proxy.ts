import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (and the
// exported function from `middleware` to `proxy`) to clarify that this
// runs as a network boundary, not general request middleware. Functionally
// identical to what this project shipped as middleware.ts under Next 15 —
// only the file name and export name changed. The `edge` runtime is not
// selectable here (proxy always runs on `nodejs`), which this project
// never opted into anyway.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
