import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "264 Properties — Namibia Property Platform (MVP scaffold)",
  description: "Tenant/landlord management + buy/sell property intelligence for Namibia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">264 Properties</Link>
          <div>
            <Link href="/listings">Buy/Sell</Link>
            <Link href="/estimator">Estimator</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/login">Log in</Link>
          </div>
        </nav>
        <main className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
