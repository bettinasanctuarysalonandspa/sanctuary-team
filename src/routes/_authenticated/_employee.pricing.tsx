import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { lanzaRetailFromWholesale } from '@/lib/consultation-math';

export const Route = createFileRoute('/_authenticated/_employee/pricing')({
  beforeLoad: ({ context }) => { if (!context.access.admin) throw redirect({ to: '/access-pending' }); },
  head: () => appHead('Consultation pricing', 'Owner-only editing of approved Sanctuary consultation prices.'),
  component: Pricing,
});

const LEVELS = ['New Artist', 'Designer 1', 'Designer 2', 'Advanced 1', 'Advanced 2', 'Master 1', 'Master 2', 'Legacy'] as const;
const TABS = ['Stylists', 'Services', 'Products', 'Extensions'] as const;
const input = 'h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>) { const r = await p; if (r.error) throw new Error('Could not save. Owner access is required.'); return r.data; }

function useSave() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  async function run(fn: () => Promise<unknown>, ok = 'Saved.') {
    setMsg('');
    try { await fn(); setMsg(ok); await qc.invalidateQueries({ queryKey: ['private', 'pricing'] }); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save.'); }
  }
  return { msg, run };
}

function Pricing() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Stylists');
  return <>
    <Link to="/admin" className="back-link"><ArrowLeft size={15}/>Admin</Link>
    <div className="page-heading"><p className="eyebrow">OWNER ADMINISTRATION</p><h1>Consultation pricing</h1><p>Changes apply to new quotes right away. Wholesale costs are visible only to you.</p></div>
    <div className="mb-6 flex flex-wrap gap-2" role="tablist">{TABS.map(t => <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? 'default' : 'glass'} size="sm" onClick={() => setTab(t)}>{t}</Button>)}</div>
    {tab === 'Stylists' && <Stylists/>}{tab === 'Services' && <Services/>}{tab === 'Products' && <Products/>}{tab === 'Extensions' && <Extensions/>}
  </>;
}

function Stylists() {
  const q = useQuery({ queryKey: ['private', 'pricing', 'stylists'], queryFn: () => must(supabase.from('calc_stylists').select('id,name,level,active').order('name')) });
  const { msg, run } = useSave();
  const [name, setName] = useState(''); const [level, setLevel] = useState<string>('New Artist');
  return <section>
    <ul className="divide-y divide-input">{q.data?.map(s => <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
      <span className="min-w-40 flex-1 font-medium">{s.name}</span>
      <select className={input} defaultValue={s.level} aria-label={`${s.name} level`} onChange={e => void run(() => must(supabase.from('calc_stylists').update({ level: e.target.value, updated_at: new Date().toISOString() }).eq('id', s.id)))}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked={s.active} onChange={e => void run(() => must(supabase.from('calc_stylists').update({ active: e.target.checked }).eq('id', s.id)))}/>Active</label>
    </li>)}</ul>
    <form className="mt-6 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); if (!name.trim()) return; void run(() => must(supabase.from('calc_stylists').insert({ name: name.trim(), level })), 'Stylist added.').then(() => setName('')); }}>
      <input className={`${input} flex-1`} placeholder="New stylist name" value={name} onChange={e => setName(e.target.value)} aria-label="New stylist name"/>
      <select className={input} value={level} onChange={e => setLevel(e.target.value)} aria-label="New stylist level">{LEVELS.map(l => <option key={l}>{l}</option>)}</select>
      <Button type="submit"><Plus size={16}/>Add stylist</Button>
    </form>
    {msg && <p className="form-message mt-4" role="status">{msg}</p>}
  </section>;
}

function Services() {
  const q = useQuery({ queryKey: ['private', 'pricing', 'services'], queryFn: async () => ({
    services: await must(supabase.from('calc_services').select('id,name,kind,flat_price,unit,active').order('kind').order('name')),
    levels: await must(supabase.from('calc_service_level_prices').select('service_id,level,price')),
  }) });
  const { msg, run } = useSave();
  const [filter, setFilter] = useState('');
  const rows = (q.data?.services ?? []).filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));
  return <section>
    <input className={`${input} mb-4 w-full`} placeholder="Search services" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Search services"/>
    <ul className="divide-y divide-input">{rows.map(s => <li key={s.id} className="py-3">
      <div className="flex flex-wrap items-center gap-3"><span className="flex-1 font-medium">{s.name}</span>
        {s.kind === 'flat' && <PriceField value={s.flat_price} label={`${s.name} price`} onSave={v => run(() => must(supabase.from('calc_services').update({ flat_price: v, updated_at: new Date().toISOString() }).eq('id', s.id)))}/>}
        {s.unit && <span className="text-xs text-muted-foreground">{s.unit}</span>}
      </div>
      {s.kind === 'level' && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{LEVELS.map(l => { const p = (q.data?.levels ?? []).find(x => x.service_id === s.id && x.level === l); return <label key={l} className="flex flex-col gap-1 text-xs text-muted-foreground">{l}
        <PriceField value={p?.price ?? null} label={`${s.name} ${l}`} onSave={v => run(() => must(supabase.from('calc_service_level_prices').upsert({ service_id: s.id, level: l, price: v ?? 0, effective_date: new Date().toISOString().slice(0, 10) })))}/></label>; })}</div>}
    </li>)}</ul>
    {msg && <p className="form-message sticky bottom-4 mt-4" role="status">{msg}</p>}
  </section>;
}

function Products() {
  const q = useQuery({ queryKey: ['private', 'pricing', 'products'], queryFn: async () => ({
    products: await must(supabase.from('calc_products').select('id,brand,line,name,size,retail_price,status,notes').order('brand').order('line').order('name')),
    costs: await must(supabase.from('calc_product_costs').select('product_id,wholesale_cost')),
  }) });
  const { msg, run } = useSave();
  const [filter, setFilter] = useState('');
  const costs = useMemo(() => new Map((q.data?.costs ?? []).map(c => [c.product_id, c.wholesale_cost])), [q.data]);
  const rows = (q.data?.products ?? []).filter(p => [p.brand, p.line, p.name, p.size].join(' ').toLowerCase().includes(filter.toLowerCase()));
  return <section>
    <p className="mb-3 text-sm text-muted-foreground">L'ANZA retail is set automatically to wholesale × 2, rounded up to the next dollar. Checkout charges are never included here.</p>
    <input className={`${input} mb-4 w-full`} placeholder="Search products" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Search products"/>
    <ul className="divide-y divide-input">{rows.map(p => { const lanza = p.brand === "L'ANZA"; const w = costs.get(p.id); return <li key={p.id} className="flex flex-wrap items-end gap-3 py-3">
      <div className="min-w-48 flex-1"><p className="font-medium">{[p.line, p.name].filter(Boolean).join(' — ')}{p.size ? ` (${p.size})` : ''}</p><p className="text-xs text-muted-foreground">{p.brand}{p.status !== 'approved' ? ' · Needs review' : ''}</p></div>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">Wholesale<PriceField value={w ?? null} label={`${p.name} wholesale`} onSave={v => run(() => v == null ? must(supabase.from('calc_product_costs').delete().eq('product_id', p.id)) : must(supabase.from('calc_product_costs').upsert({ product_id: p.id, wholesale_cost: v })), lanza && v != null ? `Saved. Retail is now $${lanzaRetailFromWholesale(v)}.00.` : 'Saved.')}/></label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">Retail<PriceField value={p.retail_price} label={`${p.name} retail`} onSave={v => run(() => must(supabase.from('calc_products').update({ retail_price: v, status: v == null ? 'needs_review' : 'approved', updated_at: new Date().toISOString() }).eq('id', p.id)))}/></label>
    </li>; })}</ul>
    {msg && <p className="form-message sticky bottom-4 mt-4" role="status">{msg}</p>}
  </section>;
}

function Extensions() {
  const q = useQuery({ queryKey: ['private', 'pricing', 'hair'], queryFn: () => must(supabase.from('calc_extension_hair').select('id,name,length_in,price_per_section').order('length_in')) });
  const { msg, run } = useSave();
  const [len, setLen] = useState(''); const [price, setPrice] = useState('');
  return <section>
    <p className="mb-3 text-sm text-muted-foreground">Client price per 1/3 Butterfly Weft section. Installation prices are under Services.</p>
    <ul className="divide-y divide-input">{q.data?.map(h => <li key={h.id} className="flex items-center gap-3 py-3"><span className="flex-1 font-medium">{h.name} {h.length_in}"</span>
      <PriceField value={h.price_per_section} label={`${h.length_in} inch price`} onSave={v => run(() => must(supabase.from('calc_extension_hair').update({ price_per_section: v ?? 0 }).eq('id', h.id)))}/></li>)}</ul>
    <form className="mt-6 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); const l = parseInt(len, 10), p = Number(price); if (!l || !(p >= 0)) return; void run(() => must(supabase.from('calc_extension_hair').insert({ name: 'Butterfly Weft', length_in: l, price_per_section: p })), 'Length added.').then(() => { setLen(''); setPrice(''); }); }}>
      <input className={input} inputMode="numeric" placeholder='Length (inches)' value={len} onChange={e => setLen(e.target.value)} aria-label="Length in inches"/>
      <input className={input} inputMode="decimal" placeholder="Price per section" value={price} onChange={e => setPrice(e.target.value)} aria-label="Price per section"/>
      <Button type="submit"><Plus size={16}/>Add length</Button>
    </form>
    {msg && <p className="form-message mt-4" role="status">{msg}</p>}
  </section>;
}

function PriceField({ value, label, onSave }: { value: number | null; label: string; onSave: (v: number | null) => Promise<unknown> }) {
  const [v, setV] = useState(value == null ? '' : Number(value).toFixed(2));
  const original = value == null ? '' : Number(value).toFixed(2);
  return <span className="flex items-center gap-1"><span className="text-sm">$</span>
    <input className={`${input} w-24`} inputMode="decimal" value={v} aria-label={label} onChange={e => setV(e.target.value)}
      onBlur={() => { if (v === original) return; if (v.trim() === '') { void onSave(null); return; } const n = Number(v); if (!(n >= 0)) { setV(original); return; } setV(n.toFixed(2)); void onSave(Math.round(n * 100) / 100); }}/></span>;
}
