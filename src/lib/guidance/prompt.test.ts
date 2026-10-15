import { describe, expect, it } from 'vitest';
import { guidancePrompt } from './prompt';
describe('Sanctuary Handbook and Guidance approved knowledge', () => {
  it('includes supplied records and prioritizes the handbook', () => {
    const p = guidancePrompt([{ title: 'Handbook', source: 'Owner upload', source_date: '2026-10-08', content: 'RULE TEXT' }]);
    expect(p).toContain('RULE TEXT'); expect(p).toContain('1) the official Sanctuary Employee Handbook');
    expect(p).toContain('Never invent policy'); expect(p).toContain('recommend asking leadership');
  });
  it('follows the approved review and email response structure', () => {
    const p = guidancePrompt([]);
    expect(p).toContain('ACKNOWLEDGE'); expect(p).toContain('PERSONALIZE'); expect(p).toContain('ELEVATE'); expect(p).toContain('GUIDE');
    expect(p).toContain('original stylist first'); expect(p).toContain('Never lead with refunds');
    expect(p).toContain('safe, heard and cared for'); expect(p).toContain('Thank you for sharing this with us');
  });
});
