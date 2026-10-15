import { describe, expect, it } from 'vitest';
import { supportPrompt } from './prompt';
describe('Sanctuary Emergency Support', () => {
  it('puts safety first and never invents contacts', () => {
    const p = supportPrompt([{ title: 'Ops', source: 'Owner', source_date: '2026-10-08', content: 'WATER STEPS' }]);
    expect(p).toContain('WATER STEPS'); expect(p).toContain('call 911'); expect(p).toContain('Never invent locations');
  });
});
