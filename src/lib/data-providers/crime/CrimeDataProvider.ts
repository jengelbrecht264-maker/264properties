export type CrimeTierResult = {
  tier: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  source: string;
  note: string | null;
  setAt: Date | null;
};

/**
 * Spec Section 2 rates suburb-level crime data RED — no official,
 * structured, publicly available dataset exists in Namibia today (NamPol
 * publishes only national aggregates; Numbeo is Windhoek-only crowdsourced
 * perception data). There is no "real" implementation of this interface to
 * write yet. ManualOverrideCrimeProvider is the honest MVP stand-in: it
 * returns UNKNOWN unless a human has explicitly entered a sourced,
 * dated tier for that suburb via the admin CrimeTierOverride table.
 *
 * Do not fabricate a score to fill the gap — an invented number that turns
 * out wrong is worse for trust than an honest "not available."
 */
export interface CrimeDataProvider {
  getTierForSuburb(town: string, suburb: string): Promise<CrimeTierResult>;
}
