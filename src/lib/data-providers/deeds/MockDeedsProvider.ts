import type { DeedsDataProvider, DeedTransaction } from "./DeedsDataProvider";

/**
 * Deterministic fake data so the UI has something to render in dev/demo.
 * NEVER point this at production without swapping in a real
 * DeedsDataProvider implementation once Section 2.1's data-source question
 * is resolved — ship this as-is and every "last sold price" on the site is
 * fabricated.
 */
export class MockDeedsProvider implements DeedsDataProvider {
  async getTransactionHistory(addressLine: string, town: string): Promise<DeedTransaction[]> {
    // Simple deterministic "randomness" from the address string so the
    // same property always returns the same mock figures in a demo.
    const seed = [...addressLine].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const basePrice = 800_000 + (seed % 20) * 75_000;
    const yearsAgo = 1 + (seed % 5);

    return [
      {
        addressLine,
        town,
        price: basePrice,
        saleDate: new Date(Date.now() - yearsAgo * 365 * 24 * 60 * 60 * 1000),
        isMockData: true,
      },
    ];
  }
}

export const deedsDataProvider: DeedsDataProvider = new MockDeedsProvider();
