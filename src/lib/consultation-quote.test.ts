import { describe, expect, it } from 'vitest';
import { calculateQuote } from './consultation.server';

describe('consultation quote presentation', () => {
  it('prices 24-inch Butterfly Weft at $220 per pre-cut third', () => {
    const catalog = {
      stylists: [], services: [], levelPrices: [], aliases: [], products: [],
      hair: [{ id: 3, name: 'Butterfly Weft', length_in: 24, price_per_section: 220 }],
    };
    const input = {
      stylist_name: null, services: [], products: [],
      extension_hair: [{ length_in: 24, sections: 1 }], salonscale_estimate: null,
    };
    const quote = calculateQuote(catalog, input);
    expect(quote.problems).toEqual([]);
    expect(quote.extension_hair_including_charges_and_tax).toBe('$244.75');
    expect(calculateQuote(catalog, { ...input, extension_hair: [{ length_in: 24, sections: 3 }] }).estimated_total).toBe('$734.25');
  });
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
    expect(quote.retail_products_including_charges_and_tax).toBe('$50.06');
    expect(quote.extension_hair_including_charges_and_tax).toBe('$233.63');
    expect(quote.services_including_charges).toBe('$0.00');
    expect(quote).not.toHaveProperty('amenity_charge_3pct');
    expect(quote).not.toHaveProperty('retail_and_extension_hair_tax_8_25pct');
    expect(quote.estimated_total).toBe('$283.69');
    expect(quote.lines.map(line => line.group)).toEqual(['Product (stylist prescribed)', 'Extension hair']);
  });
});