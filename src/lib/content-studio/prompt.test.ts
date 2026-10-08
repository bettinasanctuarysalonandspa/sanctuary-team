import { describe, expect, it } from 'vitest';
import { studioPrompt } from './prompt';
describe('Content Studio approved knowledge', () => {
  it('includes the complete supplied record and source date', () => {
    const content = 'PART 1 instructions\nPART 2 search\nPART 3 consistency\nPART 4 facts\nPART 5 maintenance';
    const prompt = studioPrompt([{ title: 'Approved source', source: 'Owner upload', source_date: '2026-10-08', content }]);
    expect(prompt).toContain(content); expect(prompt).toContain('2026-10-08');
  });
  it('prioritizes corrections and prohibits fabricated prices or medical claims', () => {
    const prompt = studioPrompt([]);
    expect(prompt).toContain("Bettina's latest explicit corrections");
    expect(prompt).toContain('Never invent prices');
    expect(prompt).toContain('No medical cures');
    expect(prompt).toContain('never exceed 60 seconds');
    expect(prompt).toContain('Only deliver a specific output when requested');
    expect(prompt).toContain('Do not use Consultation Calculator data');
  });
});