import { comparableSalesProvider } from "@/lib/data-providers/comparables/SeedComparableSalesProvider";

export interface EstimateResult {
  estimatedValue: number;
  confidenceLow: number;
  confidenceHigh: number;
  comparablesUsed: {
    addressLabel: string;
    price: number;
    saleDate: Date;
    distanceKm: number;
  }[];
  basis: string;
  isMockData: boolean;
}

/**
 * Deliberately simple comparable-sales average, distance-weighted, with a
 * confidence band that widens as the number of comparables shrinks. This
 * is NOT a production AVM — spec Section 7 rates the estimator "High"
 * complexity and explicitly warns against shipping one built on too few
 * real data points. Treat this as the shape of the calculation to build on
 * top of once SeedComparableSalesProvider is backed by real sales data.
 */
export async function estimatePropertyValue(params: {
  town: string;
  suburb: string;
  propertyType: string;
  bedrooms: number | null;
}): Promise<EstimateResult> {
  const comparables = await comparableSalesProvider.findComparables({
    town: params.town,
    suburb: params.suburb,
    propertyType: params.propertyType,
    bedrooms: params.bedrooms,
    maxResults: 6,
  });

  if (comparables.length === 0) {
    throw new Error(
      "No comparable sales found for this area/property type — cannot produce an estimate. " +
        "Never fall back to a made-up number here; tell the user data is insufficient."
    );
  }

  // Inverse-distance weighting: closer comparables count more.
  const weights = comparables.map((c) => 1 / (c.distanceKm + 0.5));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const weightedAvg =
    comparables.reduce((sum, c, i) => sum + c.price * (weights[i] ?? 0), 0) / weightSum;

  // Confidence band widens with fewer comparables — 4+ comps is "tight,"
  // 1 comp is "wide." This is a heuristic, not a statistically fitted
  // model; a real AVM needs a proper regression/ML approach once there's
  // enough real transaction volume to train on.
  const spreadPct = comparables.length >= 4 ? 0.08 : comparables.length >= 2 ? 0.15 : 0.25;

  const estimatedValue = Math.round(weightedAvg);
  return {
    estimatedValue,
    confidenceLow: Math.round(estimatedValue * (1 - spreadPct)),
    confidenceHigh: Math.round(estimatedValue * (1 + spreadPct)),
    comparablesUsed: comparables.map((c) => ({
      addressLabel: c.addressLabel,
      price: c.price,
      saleDate: c.saleDate,
      distanceKm: c.distanceKm,
    })),
    basis: `Based on ${comparables.length} comparable sale${comparables.length === 1 ? "" : "s"} of similar ${params.propertyType} properties near ${params.suburb}, ${params.town}.`,
    isMockData: true, // flip to false only once comparableSalesProvider is backed by real data
  };
}
