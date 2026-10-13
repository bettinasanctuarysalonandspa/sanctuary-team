import { CheckCircle2, Circle } from 'lucide-react';
import { GROWTH_METRICS, formatMetric, type Metrics, type Target, type Zone } from '@/lib/growth/metrics';

type Growth = {
  level: string | null;
  profile: { training_week: number | null } | null;
  checkins: { week_start: string; metrics: Metrics; source: string }[];
  items: { id: number; kind: string; content: string; done: boolean; created_at: string; follow_up_date?: string | null }[];
  zones: { key: string; label: string; value?: number | undefined; zone: Zone; target: Target | null }[];
};

const zoneClass: Record<Zone, string> = { green: 'zone-green', yellow: 'zone-yellow', red: 'zone-red', unset: 'zone-unset' };
const zoneLabel: Record<Zone, string> = { green: 'Green', yellow: 'Yellow', red: 'Red', unset: 'No target yet' };

type Month = { month: string; partial: boolean; updated: string | null; kpis: { key: string; label: string; value?: number | undefined; zone: Zone; target: Target | null }[] };
const monthName = (m: string) => new Date(m + '-15T12:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

type Quarter = { months: string[]; complete: boolean; allGreen: boolean; kpis: { key: string; label: string; value?: number | undefined; monthsCounted: number; zone: Zone; target: Target | null }[] } | null;
export function ZoneList({ growth }: { growth: Growth & { monthly: Month[]; quarter?: Quarter } }) {
  const q = growth.quarter;
  const [now, ...prev] = growth.monthly;
  if (!now) return <section className="glass-panel p-5"><p className="text-sm text-muted-foreground">No numbers saved yet — send a screenshot of your numbers to the Coach to start.</p></section>;
  return <div className="grid gap-4">
    <section className="glass-panel grid gap-3 p-5">
      <div><h2 className="eyebrow">{monthName(now.month)} · {now.partial ? 'Month-to-date' : 'Completed month'}</h2>
        <p className="text-xs text-muted-foreground">Level: {growth.level ?? 'not set'}{now.updated ? ` · Last updated ${now.updated.slice(0, 10)}` : ''}</p></div>
      {now.kpis.map(k => { const hasTarget = k.target?.green_min != null; return <div key={k.key} className="flex items-center justify-between gap-3 border-b border-input/60 pb-2 last:border-0">
        <div><p className="font-medium">{k.label}</p>
          <p className="text-xs text-muted-foreground">Target: {hasTarget ? formatMetric(k.key, Number(k.target!.green_min)) : 'Target needs to be set.'}</p>
          {k.key === 'service_revenue' && now.partial && hasTarget && <p className="text-xs text-muted-foreground">Month-to-date — compared against the full-month target.</p>}
          {k.target?.next_level_requirement && <p className="text-xs text-muted-foreground">Next level: {k.target.next_level_requirement}</p>}</div>
        <div className="text-right"><p>{formatMetric(k.key, k.value)}</p>{hasTarget && k.value != null && <span className={`zone-pill ${zoneClass[k.zone]}`}>{zoneLabel[k.zone]}</span>}</div>
      </div>; })}
    </section>
    <section className="glass-panel grid gap-3 p-5">
      <div><h2 className="eyebrow">3-month growth cycle · average</h2>
        <p className="text-xs text-muted-foreground">To advance, your average must stay green for at least three full months.</p></div>
      {!q ? <p className="text-sm text-muted-foreground">Starts after your first full month.</p> : <>
        <p className="text-xs text-muted-foreground">{q.months.map(monthName).join(' · ')}{q.complete ? '' : ` — ${q.months.length} of 3 months so far`}</p>
        {q.kpis.map(k => <div key={k.key} className="flex items-center justify-between gap-3 border-b border-input/60 pb-2 last:border-0">
          <p className="font-medium">{k.label}</p>
          <div className="text-right"><p>{formatMetric(k.key, k.value)}</p>{k.target?.green_min != null && k.value != null && <span className={`zone-pill ${zoneClass[k.zone]}`}>{zoneLabel[k.zone]}</span>}</div>
        </div>)}
        <p className="text-sm font-medium">{q.allGreen ? '🎉 You held green for 3 months! Let Bettina know you\'re ready so she can review you for advancing.' : q.complete ? 'Not holding green on every number yet — keep going.' : 'Keep going — three full months are needed.'}</p>
      </>}
    </section>
    {prev.length > 0 && <section className="glass-panel overflow-x-auto p-5">
      <h2 className="eyebrow mb-3">Previous months</h2>
      <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="pr-3 font-normal">Month</th>{now.kpis.map(k => <th key={k.key} className="pr-3 font-normal">{k.label}</th>)}</tr></thead>
        <tbody>{prev.map(m => <tr key={m.month} className="border-t border-input/60"><td className="py-1.5 pr-3">{monthName(m.month)}</td>{m.kpis.map(k => <td key={k.key} className="pr-3">{formatMetric(k.key, k.value)} {k.target?.green_min != null && k.value != null && <span className={`zone-pill ${zoneClass[k.zone]}`}>{zoneLabel[k.zone]}</span>}</td>)}</tr>)}</tbody></table>
    </section>}
  </div>;
}

export function GrowthProgress({ growth }: { growth: Growth }) {
  const open = growth.items.filter(i => !i.done && i.kind !== 'note');
  const done = growth.items.filter(i => i.done);
  const used = GROWTH_METRICS.filter(m => growth.checkins.some(c => c.metrics[m.key] != null));
  return <div className="grid gap-4">
    <section className="glass-panel p-5">
      <h2 className="eyebrow mb-3">Goals & assignments</h2>
      {open.length === 0 && done.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet. Your coach will save goals and weekly assignments here.</p>}
      <ul className="grid gap-2">{open.map(i => <li key={i.id} className="flex gap-2"><Circle size={16} className="mt-0.5 shrink-0 text-muted-foreground"/><span><span className="text-xs uppercase tracking-wider text-muted-foreground">{i.kind}</span><br/>{i.content}{i.follow_up_date && <><br/><span className="text-xs text-muted-foreground">Follow up {i.follow_up_date}</span></>}</span></li>)}
        {done.slice(0, 8).map(i => <li key={i.id} className="flex gap-2 text-muted-foreground"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary"/><span className="line-through">{i.content}</span></li>)}</ul>
    </section>
    <section className="glass-panel overflow-x-auto p-5">
      <h2 className="eyebrow mb-3">Weekly numbers</h2>
      {growth.checkins.length === 0 ? <p className="text-sm text-muted-foreground">No weeks saved yet.</p> :
        <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="pr-3">Week of</th>{used.map(m => <th key={m.key} className="pr-3 font-normal">{m.label}</th>)}</tr></thead>
          <tbody>{growth.checkins.map(c => <tr key={c.week_start} className="border-t border-input/60"><td className="py-1.5 pr-3">{c.week_start}{c.source === 'photo' ? ' 📷' : ''}</td>{used.map(m => <td key={m.key} className="pr-3">{formatMetric(m.key, c.metrics[m.key])}</td>)}</tr>)}</tbody></table>}
    </section>
  </div>;
}
