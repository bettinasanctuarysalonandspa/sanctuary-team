import { describe, expect, it } from 'vitest';
import { gradeClientJourney } from './grade';

const perfect = 'ABCDABCDABCDABCDABCDABCDABCDAB'.split('').map(c => 'ABCD'.indexOf(c));
describe('Client Journey grading', () => {
  it('passes a perfect test', () => { const r = gradeClientJourney(perfect, 90); expect(r.score).toBe(30); expect(r.passed).toBe(true); });
  it('27/30 passes at 90%, 26/30 does not', () => {
    const three = perfect.map((a, i) => (i < 3 ? (a + 1) % 4 : a));
    const four = perfect.map((a, i) => (i < 4 ? (a + 1) % 4 : a));
    expect(gradeClientJourney(three, 90).passed).toBe(true);
    const r = gradeClientJourney(four, 90);
    expect(r.passed).toBe(false); expect(r.missed).toHaveLength(4); expect(r.areas).toContain('Discovery and stylist matching');
  });
  it('shows misses even when passing', () => { expect(gradeClientJourney(perfect.map((a, i) => (i === 29 ? 0 : a)), 90).missed[0]?.n).toBe(30); });
  it('requires every answer', () => { expect(() => gradeClientJourney(perfect.slice(1), 90)).toThrow(); });
});
