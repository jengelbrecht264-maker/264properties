"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"LANDLORD" | "TENANT">("TENANT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // The profiles row is created automatically by the
    // supabase/migrations/00001_profiles_trigger.sql trigger, reading
    // role/full_name from this metadata payload.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1>Create an account</h1>
      <form onSubmit={handleSubmit}>
        <label>I am a...</label>
        <select value={role} onChange={(e) => setRole(e.target.value as "LANDLORD" | "TENANT")}>
          <option value="TENANT">Tenant</option>
          <option value="LANDLORD">Landlord</option>
        </select>
        <label>Full name</label>
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>
        Note: "Verified professional" accounts (agents/attorneys with access to owner records —
        see SECURITY.md) are not self-service. An admin promotes a Profile's role directly.
      </p>
    </div>
  );
}
