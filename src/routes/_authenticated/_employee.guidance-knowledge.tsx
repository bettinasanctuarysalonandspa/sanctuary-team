import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, Save, Plus, Upload } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { getGuidanceKnowledge, saveGuidanceKnowledge, resumeGuidance } from '@/lib/guidance.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export const Route = createFileRoute('/_authenticated/_employee/guidance-knowledge')({ beforeLoad: ({ context }) => { if (!context.access.admin) throw redirect({ to: '/access-pending' }); }, loader: () => getGuidanceKnowledge(), head: () => appHead('Sanctuary Guidance information', 'Owner-approved handbook, Code of Honor and Sanctuary policies for Sanctuary Guidance.'), component: Knowledge });
function Knowledge() {
  const initial = Route.useLoaderData();
  const save = useServerFn(saveGuidanceKnowledge);
  const resume = useServerFn(resumeGuidance);
  const [records, setRecords] = useState(initial.records);
  const blank = { id: null as string | null, title: '', content: '', source: '', source_date: '2026-10-08', approved: false };
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(initial.state?.paused ?? false);
  async function submit() { setBusy(true); setMessage(''); try { await save({ data: form }); const latest = await getGuidanceKnowledge(); setRecords(latest.records); setMessage('Approved information saved.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Information could not be saved.'); } finally { setBusy(false); } }
  return <>
    <Link to="/admin" className="back-link"><ArrowLeft size={15}/>Owner administration</Link>
    <div className="page-heading"><p className="eyebrow">OWNER ADMINISTRATION</p><h1>Sanctuary Guidance information</h1></div>
    {paused && <div className="form-message"><p>{initial.state?.reason}</p><Button variant="glass" onClick={() => void resume().then(() => setPaused(false)).catch(() => setMessage('Sanctuary Guidance could not be resumed.'))}>Resume after access is restored</Button></div>}
    <div className="divide-y divide-input">{records.map(r => <Button key={r.id} variant="ghost" className="h-auto w-full justify-between whitespace-normal py-4 text-left" onClick={() => { setForm({ id: r.id, title: r.title, content: r.content, source: r.source, source_date: r.source_date, approved: r.approved }); setMessage(''); }}><span className="min-w-0 break-words">{r.title}</span><span className="shrink-0 text-xs text-muted-foreground">{r.approved ? 'Approved' : 'Draft'} · {r.source_date}</span></Button>)}</div>
    <Button variant="glass" className="my-5" onClick={() => { setForm(blank); setMessage(''); }}><Plus size={16}/>Add information</Button>
    <form onSubmit={e => { e.preventDefault(); void submit(); }} className="grid gap-5">
      <label className="grid gap-2 text-sm">Title<Input required aria-label="Knowledge title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">Source<Input required aria-label="Knowledge source" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}/></label><label className="grid gap-2 text-sm">Source date<Input required type="date" aria-label="Source date" value={form.source_date} onChange={e => setForm({ ...form, source_date: e.target.value })}/></label></div>
      <label className="grid gap-2 text-sm">Information<Textarea required aria-label="Knowledge text" rows={18} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}/></label>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.approved} onCheckedChange={v => setForm({ ...form, approved: v === true })}/>Approved for Sanctuary Guidance</label>
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}><Save size={16}/>{busy ? 'Saving…' : 'Save information'}</Button><Button variant="glass" asChild><label className="cursor-pointer"><Upload size={16}/>Import text<input type="file" accept=".txt,.md" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (!file) return; void file.text().then(content => setForm(prev => ({ ...prev, content, title: prev.title || file.name, source: file.name }))); }}/></label></Button></div>
      {message && <p role="status" className="form-message">{message}</p>}
    </form>
  </>;
}