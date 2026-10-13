import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { getMyClientJourney, submitClientJourney } from '@/lib/client-journey.functions';
import { CJ_QUESTIONS, LETTERS } from '@/lib/client-journey/questions';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/_employee/client-journey')({
  loader: () => getMyClientJourney(),
  head: () => appHead('Client Journey test', 'Sanctuary Client Journey knowledge assessment.'),
  component: ClientJourney,
});

type Result = Awaited<ReturnType<typeof submitClientJourney>>;
type MissedRow = { n: number; area: string; question: string; chosen: string; correct: string };

function Missed({ missed }: { missed: MissedRow[] }) {
  if (!missed.length) return <p className="text-sm">Every question correct.</p>;
  return <div className="grid gap-2">
    <p className="eyebrow">Areas needing education</p>
    <p className="text-sm">{[...new Set(missed.map(m => m.area))].join(' · ')}</p>
    {missed.map(m => <div key={m.n} className="rounded-lg border border-input/60 p-3 text-sm"><p className="font-medium">{m.n}. {m.question}</p><p className="text-muted-foreground">Your answer: {m.chosen}</p><p>Correct: {m.correct}</p></div>)}
  </div>;
}

function ClientJourney() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [purpose, setPurpose] = useState<'bootcamp' | 'advancement'>(data.attempts.some(a => a.purpose === 'bootcamp') || data.level !== 'Associate' ? 'advancement' : 'bootcamp');
  const [answers, setAnswers] = useState<(number | null)[]>(() => CJ_QUESTIONS.map(() => null));
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const left = answers.filter(a => a === null).length;

  async function submit() {
    if (left) { setErr(`Answer all questions first (${left} left).`); return; }
    setBusy(true); setErr('');
    try { const r = await submitClientJourney({ data: { purpose, answers: answers as number[] } }); setResult(r); window.scrollTo({ top: 0 }); await router.invalidate(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not submit.'); }
    finally { setBusy(false); }
  }

  return <>
    <Link to="/bootcamp" className="back-link"><ArrowLeft size={15}/>Bootcamp</Link>
    <div className="page-heading"><p className="eyebrow">ONGOING SANCTUARY STANDARD</p><h1>Client Journey test</h1><p>30 questions on the client experience, communication and who does what. Passing score: {data.passPercent}%. Passing meets the test requirement only — Bettina makes every promotion decision.</p></div>

    {result ? <section className="glass-panel mb-6 grid gap-3 p-5">
      <h2 className="text-xl font-medium">{result.passed ? 'Passed' : 'Not passed yet'} — {result.score} of {result.total} ({result.percent}%)</h2>
      <p className="text-sm text-muted-foreground">{result.passed ? 'Nice work. Review anything you missed below.' : `You need ${result.passPercent}%. Review the areas below with your educator, then retake the full test.`} Bettina and your educator can see this result.</p>
      <Missed missed={result.missed}/>
      <Button variant="glass" onClick={() => { setResult(null); setAnswers(CJ_QUESTIONS.map(() => null)); }}>Take it again</Button>
    </section> : <section className="grid gap-4">
      <div className="glass-panel grid gap-2 p-4 text-sm">
        <p className="eyebrow">This attempt is for</p>
        <label className="flex gap-2"><input type="radio" checked={purpose === 'bootcamp'} onChange={() => setPurpose('bootcamp')}/>After Bootcamp (first assessment)</label>
        {data.next ? <label className="flex gap-2"><input type="radio" checked={purpose === 'advancement'} onChange={() => setPurpose('advancement')}/>Level advancement: {data.level} → {data.next}</label> : <p className="text-muted-foreground">You're at Legacy — no advancement test needed.</p>}
      </div>
      {CJ_QUESTIONS.map((q, i) => <fieldset key={q.n} className="glass-panel grid gap-2 p-4">
        {(i === 0 || CJ_QUESTIONS[i - 1]?.part !== q.part) && <p className="eyebrow">Part {q.part} · {q.area}</p>}
        <legend className="sr-only">Question {q.n}</legend>
        <p className="font-medium">{q.n}. {q.question}</p>
        {q.choices.map((c, ci) => <label key={ci} className={`flex cursor-pointer gap-2 rounded-lg border p-2 text-sm ${answers[i] === ci ? 'border-primary bg-primary/10' : 'border-input/60'}`}>
          <input type="radio" name={`q${q.n}`} checked={answers[i] === ci} onChange={() => setAnswers(a => a.map((x, xi) => (xi === i ? ci : x)))}/>{LETTERS[ci]}. {c}
        </label>)}
      </fieldset>)}
      {err && <p className="form-message" role="alert">{err}</p>}
      <Button onClick={() => void submit()} disabled={busy || (purpose === 'advancement' && !data.next)}>{busy ? 'Grading…' : `Submit test${left ? ` (${left} left)` : ''}`}</Button>
    </section>}

    {data.attempts.length > 0 && <section className="mt-8 grid gap-2"><h2 className="eyebrow">My attempts</h2>
      {data.attempts.map(a => <details key={a.id} className="glass-panel p-4 text-sm"><summary className="cursor-pointer">{new Date(a.created_at).toLocaleDateString()} · {a.purpose === 'bootcamp' ? 'After Bootcamp' : `${a.current_level} → ${a.proposed_level}`} · {a.score}/{a.total} · {a.passed ? 'Passed' : 'Retake needed'}</summary>
        <div className="mt-3 grid gap-2"><Missed missed={a.missed as MissedRow[]}/>{a.educator_followup && <p><strong>Educator follow-up:</strong> {a.educator_followup}</p>}</div></details>)}
    </section>}
  </>;
}
