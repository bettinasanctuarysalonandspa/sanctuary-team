// Owner-approved checkout math. All values are integer cents; rounding is half-up.
export const AMENITY_RATE_BPS = 300; // 3% on services + retail, never taxed
export const RETAIL_TAX_RATE_BPS = 825; // 8.25% on retail (incl. extension hair) only

export function toCents(dollars: number | string): number {
  return Math.round(Number(dollars) * 100);
}

export function percentHalfUp(cents: number, bps: number): number {
  return Math.floor((cents * bps + 5000) / 10000);
}

export function checkoutTotals(serviceCents: number, retailCents: number, extensionHairCents = 0) {
  const taxableRetail = retailCents + extensionHairCents;
  const amenity = percentHalfUp(serviceCents + taxableRetail, AMENITY_RATE_BPS);
  const tax = percentHalfUp(taxableRetail, RETAIL_TAX_RATE_BPS);
  return { services: serviceCents, retail: retailCents, extensionHair: extensionHairCents, amenity, tax, total: serviceCents + taxableRetail + amenity + tax };
}

export function lanzaRetailFromWholesale(wholesale: number): number {
  return Math.ceil(Math.round(wholesale * 200) / 100 - 1e-9);
}

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
