import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { getClientJourneyAdmin, saveFollowup, markResultsSeen, savePassPercent, assignEducator, changeLevel } from '@/lib/client-journey.functions';
import { nextLevel } from '@/lib/client-journey/questions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const Route = createFileRoute('/_authenticated/_employee/client-journey-admin')({
  loader: () => getClientJourneyAdmin(),
  head: () => appHead('Client Journey results', 'Client Journey results, follow-up and advancement checks.'),
  component: Admin,
});

type D = Awaited<ReturnType<typeof getClientJourneyAdmin>>;
type Attempt = D['attempts'][number];
type MissedRow = { n: number; area: string; question: string; chosen: string; correct: string };
const LEVELS = ['New Stylist', 'Designer 1', 'Designer 2', 'Advanced 1', 'Advanced 2', 'Master 1', 'Master 2', 'Legacy'] as const;
const sel = 'rounded-md border border-input bg-card px-3 py-2 text-sm';
const areas = (a: Attempt) => [...new Set((a.missed as MissedRow[]).map(m => m.area))];

function useAct() {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  async function act(fn: () => Promise<unknown>, ok = 'Saved.') { setMsg(''); try { await fn(); setMsg(ok); await router.invalidate(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save.'); } }
  return { msg, act };
}

function Admin() {
  const d = Route.useLoaderData();
  const { msg, act } = useAct();
  const name = (id: string | null) => d.roster.find(r => r.user_id === id)?.display_name ?? '—';
  const unseen = d.attempts.filter(a => !a.owner_seen_at).length;
  const [pass, setPass] = useState(d.passPercent);
  useEffect(() => { if (d.owner && unseen) void markResultsSeen(); }, [d.owner, unseen]);
  const educators = d.roster.filter(r => r.educator);
  const associates = d.roster.filter(r => !d.stylists.some(s => s.user_id === r.user_id) && !r.educator);

  return <>
    <Link to={d.owner ? '/admin' : '/bootcamp'} className="back-link"><ArrowLeft size={15}/>{d.owner ? 'Admin' : 'Bootcamp'}</Link>
    <div className="page-heading"><p className="eyebrow">{d.owner ? 'OWNER ADMINISTRATION' : 'EDUCATOR'}</p><h1>Client Journey results</h1><p>Every attempt is saved. A fresh passing test is needed for each level move, and only Bettina promotes.</p></div>
    {msg && <p className="form-message mb-4" role="status">{msg}</p>}

    {d.owner && <section className="glass-panel mb-6 grid gap-3 p-5">
      <h2 className="eyebrow">Passing score</h2>
      <div className="flex flex-wrap items-center gap-2"><input type="number" min={1} max={100} value={pass} onChange={e => setPass(Number(e.target.value))} className={`${sel} w-24`} aria-label="Passing percent"/>%
        <Button size="sm" onClick={() => void act(() => savePassPercent({ data: { pass } }))}>Save</Button><span className="text-sm text-muted-foreground">90% = 27 of 30</span></div>
    </section>}

    {d.owner && <section className="glass-panel mb-6 grid gap-3 p-5">
      <h2 className="eyebrow">Advancement check</h2>
      <p className="text-sm text-muted-foreground">Promote only unlocks after a fresh passing test for that exact move. All other requirements (KPIs, approvals) still apply — you decide. Use “Correct level” only to fix a level that was entered wrong.</p>
      {[...associates.map(r => ({ key: r.user_id, name: r.display_name || 'Unnamed', user: r.user_id, level: 'Associate', id: null as number | null })),
        ...d.stylists.map(s => ({ key: String(s.id), name: s.name, user: s.user_id, level: s.level, id: s.id }))].map(p => {
        const nxt = nextLevel(p.level);
        const latest = d.attempts.find(a => a.user_id === p.user && a.purpose === 'advancement' && a.current_level === p.level && a.proposed_level === nxt);
        const ready = d.attempts.some(a => a.user_id === p.user && a.purpose === 'advancement' && a.current_level === p.level && a.proposed_level === nxt && a.passed && !a.used_for_promotion_at);
        return <div key={p.key} className="grid gap-2 border-b border-input/60 pb-3 text-sm last:border-0">
          <p className="font-medium">{p.name} · {p.level}{nxt ? ` → ${nxt}` : ' (highest level)'}</p>
          {nxt && <p>Test: {ready ? <strong className="text-primary">Fresh pass recorded</strong> : latest ? (latest.passed ? 'Pass already used' : 'Not passed — retake needed') : 'No attempt yet'}{latest && ` · latest ${latest.score}/${latest.total} on ${new Date(latest.created_at).toLocaleDateString()}`}</p>}
          {latest && areas(latest).length > 0 && <p className="text-muted-foreground">Reinforce: {areas(latest).join(' · ')}</p>}
          <div className="flex flex-wrap gap-2">
            {nxt && <Button size="sm" disabled={!ready || !p.user} onClick={() => { if (confirm(`Promote ${p.name} to ${nxt}?`)) void act(() => changeLevel({ data: p.id ? { kind: 'promote', stylist: p.id } : { kind: 'associate', user: p.user!, name: p.name } }), `${p.name} is now ${nxt}.`); }}>Promote to {nxt}</Button>}
            {p.id && <select className={sel} value="" aria-label={`Correct ${p.name} level`} onChange={e => { const level = e.target.value as (typeof LEVELS)[number]; if (level && confirm(`Correct ${p.name}'s level to ${level}? This is a fix, not a promotion.`)) void act(() => changeLevel({ data: { kind: 'correct', stylist: p.id!, level } }), 'Level corrected.'); }}>
              <option value="">Correct level…</option>{LEVELS.filter(l => l !== p.level).map(l => <option key={l}>{l}</option>)}</select>}
          </div>
        </div>;
      })}
    </section>}

    {d.owner && <section className="glass-panel mb-6 grid gap-2 p-5">
      <h2 className="eyebrow">Assigned educator</h2>
      <p className="text-sm text-muted-foreground">The assigned educator sees each result to follow up on.</p>
      {d.roster.filter(r => !r.educator).map(r => <label key={r.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">{r.display_name || 'Unnamed'}
        <select className={sel} value={d.assignments.find(a => a.user_id === r.user_id)?.educator_id ?? ''} onChange={e => void act(() => assignEducator({ data: { user: r.user_id, educator: e.target.value || null } }))}>
          <option value="">None</option>{educators.map(e => <option key={e.user_id} value={e.user_id}>{e.display_name}</option>)}</select></label>)}
    </section>}

    <section className="grid gap-3">
      <h2 className="eyebrow">Results {d.owner && unseen > 0 ? `· ${unseen} new` : ''}</h2>
      {d.attempts.length === 0 && <p className="text-sm text-muted-foreground">No attempts yet.</p>}
      {d.attempts.map(a => <Row key={a.id} a={a} mine={a.educator_id === d.me} educator={name(a.educator_id)} isNew={d.owner && !a.owner_seen_at}/>)}
    </section>
  </>;
}

function Row({ a, mine, educator, isNew }: { a: Attempt; mine: boolean; educator: string; isNew: boolean }) {
  const { msg, act } = useAct();
  const [note, setNote] = useState(a.educator_followup ?? '');
  const missed = a.missed as MissedRow[];
  return <details className="glass-panel p-4 text-sm" open={isNew || (mine && !a.followup_at)}>
    <summary className="cursor-pointer"><strong>{a.stylist_name}</strong> · {a.purpose === 'bootcamp' ? 'After Bootcamp' : `${a.current_level} → ${a.proposed_level}`} · {a.score}/{a.total} ({a.percent}%, needed {a.pass_percent}%) · {a.passed ? 'Passed' : 'Retake needed'} · {new Date(a.created_at).toLocaleDateString()}{isNew ? ' · NEW' : ''}{mine && !a.followup_at ? ' · needs your follow-up' : ''}</summary>
    <div className="mt-3 grid gap-2">
      <p className="text-muted-foreground">{a.version} · Educator: {educator}{a.used_for_promotion_at ? ' · Used for promotion' : ''}</p>
      {missed.length ? <>
        <p><strong>Areas needing education:</strong> {[...new Set(missed.map(m => m.area))].join(' · ')}</p>
        {missed.map(m => <p key={m.n}>{m.n}. {m.question}<br/><span className="text-muted-foreground">Chose {m.chosen}</span> · Correct {m.correct}</p>)}
      </> : <p>No missed questions.</p>}
      <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Educator follow-up: review assigned, role-play, retake date…" aria-label="Educator follow-up"/>
      <Button size="sm" variant="glass" onClick={() => void act(() => saveFollowup({ data: { id: a.id, note } }))}>Save follow-up</Button>
      {a.followup_at && <p className="text-xs text-muted-foreground">Follow-up saved {new Date(a.followup_at).toLocaleDateString()}</p>}
      {msg && <p className="form-message" role="status">{msg}</p>}
    </div>
  </details>;
}
