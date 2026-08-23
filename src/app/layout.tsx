import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const base = profile.role === "TENANT" ? "/dashboard/tenant" : "/dashboard/landlord";

  return (
    <div>
      <div className="flag">
        Signed in as <strong>{profile.fullName}</strong> ({profile.role})
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        <aside style={{ width: 160, flexShrink: 0 }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href={base}>Overview</Link>
            {profile.role === "LANDLORD" && (
              <>
                <Link href="/dashboard/landlord/properties/new">Add property</Link>
                <Link href="/dashboard/landlord/maintenance">Maintenance</Link>
              </>
            )}
            {profile.role === "TENANT" && (
              <Link href="/dashboard/tenant/maintenance/new">Report an issue</Link>
            )}
          </nav>
        </aside>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
