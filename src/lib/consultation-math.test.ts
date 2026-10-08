import { describe, expect, it } from 'vitest';
import { checkoutTotals, inclusiveCategoryTotals, lanzaRetailFromWholesale, money } from './consultation-math';

describe('consultation checkout math', () => {
  it('matches the owner example S=$200 R=$100', () => {
    const t = checkoutTotals(20000, 10000);
    expect([t.amenity, t.tax, t.total].map(money)).toEqual(['$9.00', '$8.25', '$317.25']);
  });
  it('matches the 14-inch butterfly weft example', () => {
    const t = checkoutTotals(13300, 21000);
    expect([t.amenity, t.tax, t.total].map(money)).toEqual(['$10.29', '$17.33', '$370.62']);
  });
  it('does not tax services', () => {
    expect(checkoutTotals(10000, 0).tax).toBe(0);
  });
  it('separates extension hair and products without changing checkout charges', () => {
    const combined = checkoutTotals(36200, 25500);
    const separate = checkoutTotals(36200, 4500, 21000);
    expect(separate.retail).toBe(4500);
    expect(separate.extensionHair).toBe(21000);
    expect([separate.amenity, separate.tax, separate.total]).toEqual([combined.amenity, combined.tax, combined.total]);
    expect([separate.amenity, separate.tax, separate.total].map(money)).toEqual(['$18.51', '$21.04', '$656.55']);
  });
  it('still taxes extension hair when there are no retail products', () => {
    expect(checkoutTotals(0, 0, 21000).tax).toBe(1733);
  });
  it('includes charges in separate category totals and reconciles to checkout', () => {
    const t = inclusiveCategoryTotals(36200, 4500, 21000);
    expect([t.services, t.retail, t.extensionHair, t.total].map(money)).toEqual(['$372.86', '$50.06', '$233.63', '$656.55']);
    expect(t.services + t.retail + t.extensionHair).toBe(t.total);
  });
  it('reconciles inclusive totals even when charges round at fractional cents', () => {
    for (const [s, r, h] of [[1, 1, 1], [17, 19, 21], [10000, 0, 0], [0, 0, 21000], [0, 0, 0]]) {
      const t = inclusiveCategoryTotals(s ?? 0, r ?? 0, h ?? 0);
      expect(t.services + t.retail + t.extensionHair).toBe(t.total);
      expect(t.total).toBe(checkoutTotals(s ?? 0, r ?? 0, h ?? 0).total);
    }
  });
  it('applies the L\'ANZA wholesale x2 round-up rule', () => {
    expect(lanzaRetailFromWholesale(22.25)).toBe(45);
    expect(lanzaRetailFromWholesale(17.5)).toBe(35);
    expect(lanzaRetailFromWholesale(6.63)).toBe(14);
  });
});
