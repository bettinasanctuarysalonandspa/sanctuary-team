import { describe, expect, it } from 'vitest';
import { calculateQuote } from './consultation.server';

describe('consultation quote presentation', () => {
  it('returns separate extension hair and retail product subtotals', () => {
    const quote = calculateQuote({
      stylists: [], services: [], levelPrices: [], aliases: [],
      products: [{ id: 1, brand: 'Test', line: '', name: 'Product', size: null, retail_price: 45, status: 'approved', notes: null }],
      hair: [{ id: 1, name: 'Test hair', length_in: 14, price_per_section: 105 }],
    }, {
      stylist_name: null, services: [],
      products: [{ product_id: 1, quantity: 1, source: 'stylist' }],
      extension_hair: [{ length_in: 14, sections: 2 }], salonscale_estimate: null,
    });
    expect(quote.product_subtotal).toBe('$45.00');
    expect(quote.extension_hair_subtotal).toBe('$210.00');
    expect(quote.retail_and_extension_hair_tax_8_25pct).toBe('$21.04');
    expect(quote.amenity_charge_3pct).toBe('$7.65');
    expect(quote.estimated_total).toBe('$283.69');
    expect(quote.lines.map(line => line.group)).toEqual(['Product (stylist prescribed)', 'Extension hair']);
  });
});