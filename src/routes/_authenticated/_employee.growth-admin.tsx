import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { getGrowthAdmin, saveGrowthKnowledge, saveGrowthTarget, resumeGrowth } from '@/lib/growth.functions';
import { GROWTH_METRICS, formatMetric } from '@/lib/growth/metrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export const Route = createFileRoute('/_authenticated/_employee/growth-admin')({ beforeLoad: ({ context }) => { if (!context.access.admin) throw redirect({ to: '/access-pending' }); }, loader: () => getGrowthAdmin(), head: () => appHead('Sanctuary Growth administration', 'Team progress, level targets and approved coaching information.'), component: GrowthAdmin });

const LEVELS = ['Associate', 'New Artist', 'Designer 1', 'Designer 2', 'Advanced 1', 'Advanced 2', 'Master 1', 'Master 2', 'Legacy'];
function GrowthAdmin() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const saveK = useServerFn(saveGrowthKnowledge);
  const saveT = useServerFn(saveGrowthTarget);
  const resume = useServerFn(resumeGrowth);
  const blank = { id: null as string | null, title: '', content: '', source: '', source_date: new Date().toISOString().slice(0, 10), approved: false };
  const [form, setForm] = useState(blank);
  const [level, setLevel] = useState('New Artist');
  const [msg, setMsg] = useState('');
  const t = (m: string) => data.targets.find(x => x.level === level && x.metric === m);
  async function saveTarget(metric: string, el: HTMLFormElement) {
    const f = new FormData(el); const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v === '' ? null : Number(v); };
    try { await saveT({ data: { level, metric, green_min: num('green'), yellow_min: num('yellow'), next_level_requirement: String(f.get('req') ?? '').trim() || null } }); setMsg('Target saved.'); await router.invalidate(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save.'); }
  }
  return <>
    <Link to="/admin" className="back-link"><ArrowLeft size={15}/>Owner administration</Link>
    <div className="page-heading"><p className="eyebrow">OWNER ADMINISTRATION</p><h1>Sanctuary Growth</h1></div>
    {data.state?.paused && <div className="form-message"><p>{data.state.reason}</p><Button variant="glass" onClick={() => void resume().then(() => router.invalidate())}>Resume after access is restored</Button></div>}
    {msg && <p role="status" className="form-message">{msg}</p>}

    <section className="glass-panel mb-6 grid gap-3 p-5">
      <h2 className="eyebrow">Team progress</h2>
      {data.people.map(p => { const latest = p.growth.checkins[0]; const reds = p.growth.zones.filter(z => z.zone === 'red').length; const open = p.growth.items.filter(i => !i.done && i.kind !== 'note').length; return <details key={p.user_id} className="border-b border-input/60 pb-2 last:border-0">
        <summary className="flex cursor-pointer flex-wrap justify-between gap-2"><span className="font-medium">{p.display_name}</span><span className="text-sm text-muted-foreground">{p.level ?? 'No level'}{p.growth.profile?.training_week ? ` · Week ${p.growth.profile.training_week}` : ''} · {latest ? `last check-in ${latest.week_start}` : 'no check-ins yet'}{reds ? ` · ${reds} in red` : ''} · {open} open</span></summary>
        <div className="mt-2 grid gap-1 text-sm">{p.growth.zones.filter(z => z.value != null).map(z => <p key={z.key}>{z.label}: {formatMetric(z.key, z.value)} <span className={`zone-pill zone-${z.zone}`}>{z.zone === 'unset' ? 'no target' : z.zone}</span></p>)}
          {p.growth.items.filter(i => !i.done && i.kind !== 'note').map(i => <p key={i.id} className="text-muted-foreground">• {i.kind}: {i.content}</p>)}</div>
      </details>; })}
    </section>

    <section className="glass-panel mb-6 grid gap-3 p-5">
      <h2 className="eyebrow">Level targets (red / yellow / green)</h2>
      <p className="text-sm text-muted-foreground">At or above Green = green. At or above Yellow = yellow. Below = red. Leave blank if not set.</p>
      <select aria-label="Level" value={level} onChange={e => setLevel(e.target.value)} className="h-10 rounded-md border border-input bg-card px-3">{LEVELS.map(l => <option key={l}>{l}</option>)}</select>
      {GROWTH_METRICS.map(m => <form key={level + m.key} onSubmit={e => { e.preventDefault(); void saveTarget(m.key, e.currentTarget); }} className="grid items-end gap-2 sm:grid-cols-[1.2fr_.6fr_.6fr_2fr_auto]">
        <span className="text-sm font-medium">{m.label}</span>
        <Input name="green" type="number" step="any" placeholder="Green ≥" defaultValue={t(m.key)?.green_min ?? ''} aria-label={`${m.label} green minimum`}/>
        <Input name="yellow" type="number" step="any" placeholder="Yellow ≥" defaultValue={t(m.key)?.yellow_min ?? ''} aria-label={`${m.label} yellow minimum`}/>
        <Input name="req" placeholder="Next-level requirement" defaultValue={t(m.key)?.next_level_requirement ?? ''} aria-label={`${m.label} next level requirement`}/>
        <Button type="submit" variant="glass" size="sm"><Save size={14}/>Save</Button>
      </form>)}
    </section>

    <section className="glass-panel grid gap-4 p-5">
      <h2 className="eyebrow">Approved coaching information</h2>
      <div className="divide-y divide-input">{data.knowledge.map(r => <Button key={r.id} variant="ghost" className="h-auto w-full justify-between whitespace-normal py-3 text-left" onClick={() => setForm({ id: r.id, title: r.title, content: r.content, source: r.source, source_date: r.source_date, approved: r.approved })}><span>{r.title}</span><span className="text-xs text-muted-foreground">{r.approved ? 'Approved' : 'Draft'} · {r.source_date}</span></Button>)}</div>
      <Button variant="glass" className="w-fit" onClick={() => setForm(blank)}><Plus size={16}/>Add information</Button>
      <form onSubmit={e => { e.preventDefault(); void saveK({ data: form }).then(() => { setMsg('Information saved.'); return router.invalidate(); }).catch(err => setMsg(err instanceof Error ? err.message : 'Could not save.')); }} className="grid gap-3">
        <Input required placeholder="Title" aria-label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/>
        <div className="grid gap-3 sm:grid-cols-2"><Input required placeholder="Source" aria-label="Source" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}/><Input required type="date" aria-label="Source date" value={form.source_date} onChange={e => setForm({ ...form, source_date: e.target.value })}/></div>
        <Textarea required rows={14} aria-label="Information" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}/>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.approved} onCheckedChange={v => setForm({ ...form, approved: v === true })}/>Approved for Sanctuary Growth</label>
        <Button type="submit" className="w-fit"><Save size={16}/>Save information</Button>
      </form>
    </section>
  </>;
}
