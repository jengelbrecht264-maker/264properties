import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <h1>264 Properties</h1>
      <p className="muted">
        MVP scaffold — Tenant/Landlord management + Buy/Sell property intelligence for Windhoek,
        Swakopmund &amp; Walvis Bay. See <code>SECURITY.md</code> before putting real data in this.
      </p>

      <div className="grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h3>Landlords &amp; tenants</h3>
          <p className="muted">Listings, lease generation, maintenance requests, messaging.</p>
          <Link className="btn" href="/dashboard">Go to dashboard</Link>
        </div>
        <div className="card">
          <h3>Buy / Sell</h3>
          <p className="muted">Browse listings, see sold history &amp; estimated value.</p>
          <Link className="btn" href="/listings">Browse listings</Link>
        </div>
        <div className="card">
          <h3>Price estimator</h3>
          <p className="muted">Comparable-sales based estimate (mock data — see flag on page).</p>
          <Link className="btn" href="/estimator">Try estimator</Link>
        </div>
      </div>
    </div>
  );
}
