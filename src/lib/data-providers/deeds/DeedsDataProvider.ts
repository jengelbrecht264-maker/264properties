/**
 * Interface for the last-sold-price/date data source (spec Section 2.1,
 * rated AMBER — a lead exists at ~N$7/transaction but the terms are
 * unverified). Build a real implementation of this interface once that's
 * confirmed; until then MockDeedsProvider keeps the rest of the app
 * working against realistic-shaped fake data.
 */
export interface DeedTransaction {
  addressLine: string;
  town: string;
  price: number;
  saleDate: Date;
  /** True for every record from MockDeedsProvider. A real provider must
   * never set this true. */
  isMockData: boolean;
}

export interface DeedsDataProvider {
  /** Looks up known transfer history for a property, most recent first. */
  getTransactionHistory(addressLine: string, town: string): Promise<DeedTransaction[]>;
}
