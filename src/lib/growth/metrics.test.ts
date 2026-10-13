import { describe, expect, it } from 'vitest';
import { weekStart, zoneFor } from './metrics';
describe('growth zones', () => {
  it('uses owner cutoffs only', () => {
    expect(zoneFor(70, { green_min: 70, yellow_min: 55 })).toBe('green');
    expect(zoneFor(60, { green_min: 70, yellow_min: 55 })).toBe('yellow');
    expect(zoneFor(40, { green_min: 70, yellow_min: 55 })).toBe('red');
    expect(zoneFor(40, undefined)).toBe('unset');
    expect(zoneFor(undefined, { green_min: 70, yellow_min: 55 })).toBe('unset');
  });
  it('finds monday', () => { expect(weekStart(new Date(2026, 9, 15))).toBe('2026-10-12'); });
});
