export interface ComparableSaleResult {
  addressLabel: string; // suburb-level, not exact address — avoids re-identifying a specific sale
  town: string;
  price: number;
  saleDate: Date;
  bedrooms: number | null;
  distanceKm: number;
}

/**
 * Comparable-sales lookup for the price estimator (spec Section 2, "Amber
 * — depends on the deeds question"). SeedComparableSalesProvider below
 * reads from the ComparableSale table, which prisma/seed.ts fills with
 * mock data — swap for a provider backed by real transaction history once
 * that pipeline exists.
 */
export interface ComparableSalesProvider {
  findComparables(params: {
    town: string;
    suburb: string;
    propertyType: string;
    bedrooms: number | null;
    maxResults?: number;
  }): Promise<ComparableSaleResult[]>;
}
