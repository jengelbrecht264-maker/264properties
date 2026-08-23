import { prisma } from "@/lib/prisma";
import type { CrimeDataProvider, CrimeTierResult } from "./CrimeDataProvider";
import type { Town } from "@/generated/prisma/client";

export class ManualOverrideCrimeProvider implements CrimeDataProvider {
  async getTierForSuburb(town: string, suburb: string): Promise<CrimeTierResult> {
    const override = await prisma.crimeTierOverride.findUnique({
      where: { town_suburb: { town: town as Town, suburb } },
    });

    if (!override) {
      return { tier: "UNKNOWN", source: "no data entered", note: null, setAt: null };
    }

    return {
      tier: override.tier,
      source: override.source,
      note: override.note,
      setAt: override.setAt,
    };
  }
}

export const crimeDataProvider: CrimeDataProvider = new ManualOverrideCrimeProvider();
