import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { ArrowLeft, ChevronDown, Printer, Save } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { getBootcamp, saveBootcampProgress, saveLessonEdit, addBootcampPractice, addReflection, replyReflection } from '@/lib/bootcamp.functions';
import { LESSONS, SKILLS, STATUSES, RESPONSIBILITIES, TBD, TO_COMPLETE, mergeLesson, type Lesson } from '@/lib/bootcamp/lessons';
import { HOMEWORK, HOMEWORK_GROUPS } from '@/lib/bootcamp/homework';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const Route = createFileRoute('/_authenticated/_employee/bootcamp')({
  validateSearch: z.object({ costylist: z.string().uuid().optional() }),
  loaderDeps: ({ search }) => ({ costylist: search.costylist ?? null }),
  loader: ({ deps }) => getBootcamp({ data: { costylist: deps.costylist } }),
  head: () => appHead('Shampoo, Blowout & Color-Assistance Bootcamp', 'Associate Program foundational training: lessons, cue cards, practice and approvals.'),
  component: Bootcamp,
});

type Data = Awaited<ReturnType<typeof getBootcamp>>;
type Progress = Data['progress'][number];
const statusLabel = (k?: string) => STATUSES.find(s => s.key === k)?.label ?? 'Not started';

function useLessons(data: Data) {
  return LESSONS.map(l => mergeLesson(l, data.edits.find(e => e.lesson_id === l.id)?.content as Partial<Lesson> | undefined));
}

function Bootcamp() {
  const data = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const lessons = useLessons(data);
  const tabs = ['Co-stylist', ...(data.educator ? ['Educator'] : []), 'Color Foundations', 'Practice log'] as const;
  const [tab, setTab] = useState<string>('Co-stylist');
  const viewing = data.roster.find(r => r.user_id === data.target)?.display_name;
  return <>
    <div className="no-print">
      <Link to="/growth" className="back-link"><ArrowLeft size={15}/>Sanctuary Growth</Link>
      <div className="page-heading"><p className="eyebrow">ASSOCIATE PROGRAM · FOUNDATIONAL TRAINING</p><h1>Shampoo, Blowout & Color-Assistance Bootcamp</h1><p>Day 1: client journey, shampoo foundations, standard and natural curly blowouts. Day 2: toner, root tap, treatments and finishing practice.</p></div>
      {data.educator && <div className="glass-panel mb-4 flex flex-wrap items-center gap-3 p-4">
        <label className="text-sm font-medium" htmlFor="cs">Co-stylist</label>
        <select id="cs" className="rounded-md border border-input bg-card px-3 py-2 text-sm" value={data.target} onChange={e => void navigate({ search: { costylist: e.target.value === data.me ? undefined : e.target.value } })}>
          {data.roster.map(r => <option key={r.user_id} value={r.user_id}>{r.user_id === data.me ? 'Me' : (r.display_name || 'Unnamed')}</option>)}
        </select>
        {viewing && data.target !== data.me && <span className="text-sm text-muted-foreground">Recording for {viewing}</span>}
      </div>}
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm ${tab === t ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card/60'}`}>{t}</button>)}</div>
    </div>
    {tab === 'Co-stylist' && <CoStylist lessons={lessons} data={data}/>}
    {tab === 'Educator' && data.educator && <Educator lessons={lessons} data={data}/>}
    {tab === 'Color Foundations' && <Homework data={data}/>}
    {tab === 'Practice log' && <PracticeLog data={data}/>}
  </>;
}

function Timing({ l }: { l: Lesson }) {
  const v = (x: string) => x || TBD;
  return <div className="grid gap-1 rounded-lg border border-input/60 bg-card/50 p-3 text-sm">
    <p className="eyebrow">Sanctuary timing target</p>
    <p><strong>Hands-on:</strong> {v(l.timing.handsOn)}</p>
    <p><strong>Processing:</strong> {v(l.timing.processing)}</p>
    <p><strong>Total finishing:</strong> {v(l.timing.total)}</p>
  </div>;
}

function Missing({ l }: { l: Lesson }) {
  if (!l.missing?.length) return null;
  return <div className="rounded-lg border border-input/60 p-3 text-sm"><p className="eyebrow">Protocol details</p>{l.missing.map(m => <p key={m}><strong>{m}:</strong> {l.fields?.[m]?.trim() || <em className="text-muted-foreground">{TO_COMPLETE}</em>}</p>)}{l.missing.some(m => !l.fields?.[m]?.trim()) && <p className="mt-1 text-xs text-muted-foreground">Not a fully specified protocol yet. Follow the educator’s demonstration.</p>}</div>;
}

function CoStylist({ lessons, data }: { lessons: Lesson[]; data: Data }) {
  return <div className="grid gap-4">
    <section className="glass-panel grid gap-2 p-5"><h2 className="eyebrow">Who does what</h2>{RESPONSIBILITIES.map(r => <details key={r.role}><summary className="cursor-pointer font-medium">{r.role}</summary><ul className="ml-5 list-disc text-sm">{r.items.map(i => <li key={i}>{i}</li>)}</ul></details>)}<p className="text-xs text-muted-foreground">The stylist directs toner timing for each client. Completing a lesson or attending bootcamp does not automatically approve independent service performance.</p></section>
    <section className="glass-panel grid gap-2 p-5"><h2 className="eyebrow">My approvals</h2>{SKILLS.map(s => { const p = data.progress.find(x => x.skill === s.key); return <div key={s.key} className="flex justify-between gap-2 border-b border-input/60 pb-1 text-sm last:border-0"><span>{s.label}</span><span className={p?.status === 'approved' ? 'font-medium text-primary' : 'text-muted-foreground'}>{statusLabel(p?.status)}</span></div>; })}</section>
    {[1, 2].map(day => <section key={day} className="grid gap-3"><h2 className="eyebrow">Day {day}</h2>{lessons.filter(l => l.day === day).map(l => { const p = data.progress.find(x => x.skill === l.skill); return <details key={l.id} className="glass-panel p-4">
      <summary className="flex cursor-pointer items-center justify-between gap-2"><span className="font-medium">Lesson {l.n} · {l.title}</span><span className="flex items-center gap-2 text-xs text-muted-foreground">{l.skill ? statusLabel(p?.status) : ''}<ChevronDown size={15}/></span></summary>
      <div className="mt-3 grid gap-3">
        {l.sections.map(s => <div key={s.heading}><p className="font-medium">{s.heading}</p><ol className="ml-5 list-decimal text-sm">{s.items.map((i, k) => <li key={k}>{i}</li>)}</ol></div>)}
        <Timing l={l}/><Missing l={l}/>
        <p className="text-sm"><strong>Practice assignment:</strong> {p?.practice_assignment || l.practice}</p>
        {p?.notes && <p className="text-sm"><strong>Educator feedback:</strong> {p.notes}</p>}
      </div>
    </details>; })}</section>)}
  </div>;
}

function Educator({ lessons, data }: { lessons: Lesson[]; data: Data }) {
  const [editing, setEditing] = useState<string | null>(null);
  return <div className="grid gap-4">
    <div className="no-print flex justify-end"><Button variant="glass" onClick={() => window.print()}><Printer size={15}/>Print cue cards</Button></div>
    {lessons.map(l => <article key={l.id} className="glass-panel cue-card grid gap-2 p-5">
      <h2 className="font-medium">Day {l.day} · Lesson {l.n} — {l.title}</h2>
      <Cue label="Teaching goal">{l.goal}</Cue>
      <Cue label="Prepare"><List items={l.prepare}/>{l.missing?.filter(m => !l.fields?.[m]?.trim()).map(m => <p key={m} className="text-xs">⚑ {m}: {TO_COMPLETE}</p>)}</Cue>
      <Cue label="Say">{l.say}</Cue>
      <Cue label="Show"><ol className="ml-5 list-decimal">{l.sections.flatMap(s => s.items).map((i, k) => <li key={k}>{i}</li>)}</ol>{l.demo.length > 0 && <><p className="mt-1 font-medium">Demonstrate</p><List items={l.demo}/></>}</Cue>
      <Cue label="Watch for"><List items={l.watch}/></Cue>
      <Cue label="Ask"><List items={l.ask}/></Cue>
      <Cue label="Practice">{l.practice}</Cue>
      <Cue label="Timing"><p>Hands-on: {l.timing.handsOn || TBD}</p><p>Processing: {l.timing.processing || TBD}</p><p>Total finishing: {l.timing.total || TBD}</p></Cue>
      <Missing l={l}/>
      <Cue label="Check off"><List items={l.checkoff}/></Cue>
      <Cue label="Notes / next step"><div className="print-lines"/></Cue>
      <div className="no-print grid gap-3">
        {l.skill && <CheckOff key={`${data.target}-${l.skill}`} skill={l.skill} data={data}/>}
        {editing === l.id ? <LessonEditor l={l} onDone={() => setEditing(null)}/> : <Button variant="glass" size="sm" className="justify-self-start" onClick={() => setEditing(l.id)}>Edit lesson & timing</Button>}
      </div>
    </article>)}
  </div>;
}
const Cue = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="text-sm"><p className="eyebrow">{label}</p><div>{children}</div></div>;
const List = ({ items }: { items: string[] }) => <ul className="ml-5 list-disc">{items.map(i => <li key={i}>{i}</li>)}</ul>;

function CheckOff({ skill, data }: { skill: string; data: Data }) {
  const router = useRouter(); const save = useServerFn(saveBootcampProgress);
  const p: Partial<Progress> = data.progress.find(x => x.skill === skill) ?? {};
  const label = SKILLS.find(s => s.key === skill)?.label ?? skill;
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const s = (k: string) => String(f.get(k) ?? '').trim() || null;
    try { await save({ data: { costylist: data.target, skill, status: String(f.get('status')) as Progress['status'] & 'approved', assessment_date: s('date'), notes: s('notes'), timing_observed: s('timing'), practice_assignment: s('assign') } }); setMsg('Saved.'); await router.invalidate(); } catch (err) { setMsg(err instanceof Error ? err.message : 'Could not save.'); }
  }
  return <form onSubmit={submit} className="grid gap-2 rounded-lg border border-input/60 p-3 text-sm">
    <p className="font-medium">Approval: {label}</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <select name="status" defaultValue={p.status ?? 'not_started'} className="rounded-md border border-input bg-card px-3 py-2">{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
      <Input name="date" type="date" defaultValue={p.assessment_date ?? ''} aria-label="Assessment date"/>
      <Input name="timing" placeholder="Timing observed" defaultValue={p.timing_observed ?? ''}/>
      <Input name="assign" placeholder="Practice assignment" defaultValue={p.practice_assignment ?? ''}/>
    </div>
    <Textarea name="notes" placeholder="Notes and feedback" defaultValue={p.notes ?? ''} rows={2}/>
    <div className="flex items-center gap-3"><Button size="sm" variant="sanctuary" type="submit"><Save size={14}/>Save</Button>{p.signed_off_at && <span className="text-xs text-muted-foreground">Signed off {new Date(p.signed_off_at).toLocaleDateString()}</span>}{msg && <span className="text-xs">{msg}</span>}</div>
  </form>;
}

function LessonEditor({ l, onDone }: { l: Lesson; onDone: () => void }) {
  const router = useRouter(); const save = useServerFn(saveLessonEdit); const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? '');
    const sections = l.sections.map((s, i) => ({ heading: s.heading, items: g(`s${i}`).split('\n').map(x => x.trim()).filter(Boolean) }));
    const fields = Object.fromEntries((l.missing ?? []).map(m => [m, g(`f-${m}`).trim()]));
    try { await save({ data: { lesson_id: l.id, content: { sections, timing: { handsOn: g('h').trim(), processing: g('p').trim(), total: g('t').trim() }, fields } } }); await router.invalidate(); onDone(); } catch (err) { setMsg(err instanceof Error ? err.message : 'Could not save.'); }
  }
  return <form onSubmit={submit} className="grid gap-2 rounded-lg border border-input/60 p-3 text-sm">
    {l.sections.map((s, i) => <label key={s.heading} className="grid gap-1"><span className="font-medium">{s.heading} (one step per line)</span><Textarea name={`s${i}`} defaultValue={s.items.join('\n')} rows={Math.min(12, s.items.length + 1)}/></label>)}
    <label className="grid gap-1"><span className="font-medium">Hands-on target</span><Input name="h" defaultValue={l.timing.handsOn}/></label>
    <label className="grid gap-1"><span className="font-medium">Processing</span><Input name="p" defaultValue={l.timing.processing}/></label>
    <label className="grid gap-1"><span className="font-medium">Total finishing</span><Input name="t" defaultValue={l.timing.total}/></label>
    {l.missing?.map(m => <label key={m} className="grid gap-1"><span className="font-medium">{m}</span><Input name={`f-${m}`} defaultValue={l.fields?.[m] ?? ''} placeholder={TO_COMPLETE}/></label>)}
    <p className="text-xs text-muted-foreground">Leave a timing box empty to show “{TBD}”</p>
    <div className="flex gap-2"><Button size="sm" variant="sanctuary" type="submit">Save lesson</Button><Button size="sm" variant="glass" type="button" onClick={onDone}>Cancel</Button>{msg && <span className="text-xs">{msg}</span>}</div>
  </form>;
}

function Homework({ data }: { data: Data }) {
  const router = useRouter(); const save = useServerFn(saveBootcampProgress); const add = useServerFn(addReflection); const reply = useServerFn(replyReflection);
  const [msg, setMsg] = useState('');
  const done = (k: string) => data.progress.find(p => p.skill === k)?.status === 'approved';
  async function toggle(k: string, on: boolean) { try { await save({ data: { costylist: data.target, skill: k, status: on ? 'approved' : 'not_started', assessment_date: on ? new Date().toISOString().slice(0, 10) : null, notes: null, timing_observed: null, practice_assignment: null } }); await router.invalidate(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save.'); } }
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); try { await add({ data: { learned: String(f.get('learned') ?? ''), question: String(f.get('question') ?? '').trim() || null } }); form.reset(); setMsg('Saved.'); await router.invalidate(); } catch (err) { setMsg(err instanceof Error ? err.message : 'Could not save.'); } }
  const mine = data.target === data.me;
  return <div className="grid gap-4">
    <p className="text-sm text-muted-foreground">Color Foundations homework for the first few weeks. Education completion is tracked separately from hands-on service approval.</p>
    {HOMEWORK_GROUPS.map(g => <section key={g.title} className="glass-panel grid gap-2 p-5"><h2 className="eyebrow">{g.title}</h2><p className="text-sm">{g.intro}</p>
      {g.items.map(i => <label key={i.key} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={done(i.key)} disabled={!data.educator} onChange={e => void toggle(i.key, e.target.checked)}/>{i.label}</label>)}
    </section>)}
    <section className="glass-panel grid gap-2 p-5"><h2 className="eyebrow">Connect homework to assisting</h2><p className="text-sm">At an appropriate moment, ask the stylist:</p><List items={HOMEWORK.askStylist}/></section>
    <section className="glass-panel grid gap-3 p-5"><h2 className="eyebrow">After the service</h2>
      {mine && <form onSubmit={submit} className="grid gap-2"><Textarea name="learned" required placeholder="One thing I learned" rows={2}/><Textarea name="question" placeholder="One question I still have" rows={2}/><Button size="sm" variant="sanctuary" type="submit" className="justify-self-start">Save</Button></form>}
      {msg && <p className="text-xs">{msg}</p>}
      {data.reflections.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
      {data.reflections.map(r => <div key={r.id} className="border-b border-input/60 pb-2 text-sm last:border-0"><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p><p><strong>Learned:</strong> {r.learned}</p>{r.question && <p><strong>Question:</strong> {r.question}</p>}{r.educator_reply ? <p><strong>Educator:</strong> {r.educator_reply}</p> : data.educator && <form className="mt-1 flex gap-2" onSubmit={async e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('reply') ?? ''); await reply({ data: { id: r.id, reply: v } }); await router.invalidate(); }}><Input name="reply" placeholder="Answer this question" required/><Button size="sm" variant="glass" type="submit">Reply</Button></form>}</div>)}
    </section>
  </div>;
}

function PracticeLog({ data }: { data: Data }) {
  const router = useRouter(); const add = useServerFn(addBootcampPractice); const [msg, setMsg] = useState('');
  const fields = [['stylist_instructions', 'Stylist instructions'], ['application_time', 'Application time'], ['processing_time', 'Processing time'], ['finishing_time', 'Finishing time'], ['result', 'Result'], ['feedback', 'Educator feedback'], ['next_assignment', 'Next practice assignment']] as const;
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const s = (k: string) => String(f.get(k) ?? '').trim() || null;
    try { await add({ data: { costylist: data.target, assigned_service: String(f.get('assigned_service') ?? ''), stylist_instructions: s('stylist_instructions'), application_time: s('application_time'), processing_time: s('processing_time'), finishing_time: s('finishing_time'), result: s('result'), feedback: s('feedback'), next_assignment: s('next_assignment') } }); form.reset(); setMsg('Saved.'); await router.invalidate(); } catch (err) { setMsg(err instanceof Error ? err.message : 'Could not save.'); } }
  return <div className="grid gap-4">
    {data.educator && <form onSubmit={submit} className="glass-panel grid gap-2 p-5 text-sm"><h2 className="eyebrow">Record integrated practice</h2><Input name="assigned_service" required placeholder="Assigned service (e.g. All-over toner followed by a standard blowout)"/>{fields.map(([k, label]) => <Input key={k} name={k} placeholder={label}/>)}<Button size="sm" variant="sanctuary" type="submit" className="justify-self-start">Save practice</Button>{msg && <p className="text-xs">{msg}</p>}</form>}
    {data.practice.length === 0 && <p className="text-sm text-muted-foreground">No practice recorded yet.</p>}
    {data.practice.map(p => <section key={p.id} className="glass-panel grid gap-1 p-4 text-sm"><p className="font-medium">{p.assigned_service}</p><p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>{fields.map(([k, label]) => p[k] ? <p key={k}><strong>{label}:</strong> {p[k]}</p> : null)}</section>)}
  </div>;
}
