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

// Allocate already-rounded checkout charges by largest remainder so category
// totals reconcile exactly, without changing the approved checkout rounding.
function allocateCharge(charge: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const allocations = weights.map(weight => Math.floor(charge * weight / sum));
  const order = weights.map((weight, index) => ({ index, remainder: (charge * weight) % sum }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const remaining = charge - allocations.reduce((a, b) => a + b, 0);
  for (const entry of order.slice(0, remaining)) allocations[entry.index] = (allocations[entry.index] ?? 0) + 1;
  return allocations;
}

export function inclusiveCategoryTotals(serviceCents: number, retailCents: number, extensionHairCents: number) {
  const checkout = checkoutTotals(serviceCents, retailCents, extensionHairCents);
  const amenity = allocateCharge(checkout.amenity, [serviceCents, retailCents, extensionHairCents]);
  const tax = allocateCharge(checkout.tax, [retailCents, extensionHairCents]);
  return {
    services: serviceCents + (amenity[0] ?? 0),
    retail: retailCents + (amenity[1] ?? 0) + (tax[0] ?? 0),
    extensionHair: extensionHairCents + (amenity[2] ?? 0) + (tax[1] ?? 0),
    total: checkout.total,
  };
}

export function lanzaRetailFromWholesale(wholesale: number): number {
  return Math.ceil(Math.round(wholesale * 200) / 100 - 1e-9);
}

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
