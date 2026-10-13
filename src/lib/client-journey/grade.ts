import { CJ_QUESTIONS, LETTERS } from './questions';

// Answer key from Bettina's educator copy. Imported only by server code.
const KEY = 'ABCDABCDABCDABCDABCDABCDABCDAB';

export type Missed = { n: number; area: string; question: string; chosen: string; correct: string };

export function gradeClientJourney(answers: number[], passPercent: number) {
  if (answers.length !== CJ_QUESTIONS.length || answers.some(a => !Number.isInteger(a) || a < 0 || a > 3)) throw new Error('Answer every question.');
  const missed: Missed[] = [];
  const L = (k: number) => LETTERS[k] ?? "?";
  CJ_QUESTIONS.forEach((q, i) => {
    const right = LETTERS.indexOf(KEY[i] as (typeof LETTERS)[number]);
    if (answers[i] !== right) missed.push({ n: q.n, area: q.area, question: q.question, chosen: `${L(answers[i]!)}. ${q.choices[answers[i]!]}`, correct: `${L(right)}. ${q.choices[right]}` });
  });
  const total = CJ_QUESTIONS.length;
  const score = total - missed.length;
  const percent = Math.floor((score * 100) / total);
  return { score, total, percent, passed: score * 100 >= passPercent * total, missed, areas: [...new Set(missed.map(m => m.area))] };
}
