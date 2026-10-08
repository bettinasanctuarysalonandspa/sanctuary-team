import { describe, expect, it } from 'vitest';
import { checkoutTotals, lanzaRetailFromWholesale, money } from './consultation-math';

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
  it('applies the L\'ANZA wholesale x2 round-up rule', () => {
    expect(lanzaRetailFromWholesale(22.25)).toBe(45);
    expect(lanzaRetailFromWholesale(17.5)).toBe(35);
    expect(lanzaRetailFromWholesale(6.63)).toBe(14);
  });
});
