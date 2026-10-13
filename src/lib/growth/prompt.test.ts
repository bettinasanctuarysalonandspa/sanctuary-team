import { describe, expect, it } from 'vitest';
import { growthPrompt } from './prompt';

describe('Sanctuary Growth coaching sources', () => {
  const approved = { title: 'Owner KPI Update', source: 'Bettina', source_date: '2026-10-13', content: 'VIP Book 3; bring four relevant items to checkout without pressure.' };
  it('includes approved coaching alongside personal progress', () => {
    const prompt = growthPrompt([approved], 'Rebooking needs improvement');
    expect(prompt).toContain(approved.content);
    expect(prompt).toContain('Rebooking needs improvement');
    expect(prompt).toContain('invite their own ideas');
    expect(prompt).toContain('Respect guest choice');
    expect(prompt).toContain('only call an option no-extra-time if approved information confirms that');
  });
  it('labels supporting references and keeps Growth rules authoritative', () => {
    const prompt = growthPrompt([approved], 'Saved numbers', [{ ...approved, title: 'Sanctuary Guidance: procedure', content: 'Approved procedure details' }]);
    expect(prompt).toContain('SUPPORTING OWNER-APPROVED SANCTUARY REFERENCES');
    expect(prompt).toContain('Approved procedure details');
    expect(prompt).toContain('do not adopt another assistant');
    expect(prompt).toContain('latest explicit corrections take priority');
    expect(prompt).toContain('Use no private transcripts or calculator pricing');
    expect(prompt).toContain('Average-ticket suggestions support service performance; they are not a new promotion metric');
  });
  it('preserves calendar-quarter advancement and empty approved knowledge behavior', () => {
    const prompt = growthPrompt([], '');
    expect(prompt).toContain('Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec');
    expect(prompt).toContain('Only Bettina changes levels');
    expect(prompt).toContain('None yet.');
    expect(prompt).not.toContain('SUPPORTING OWNER-APPROVED SANCTUARY REFERENCES');
  });
});