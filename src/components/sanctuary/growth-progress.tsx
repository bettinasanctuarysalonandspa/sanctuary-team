import { CheckCircle2, Circle } from 'lucide-react';
import { GROWTH_METRICS, formatMetric, type Metrics, type Target, type Zone } from '@/lib/growth/metrics';

type Growth = {
  level: string | null;
  profile: { training_week: number | null } | null;
  checkins: { week_start: string; metrics: Metrics; source: string }[];
  items: { id: number; kind: string; content: string; done: boolean; created_at: string }[];
  zones: { key: string; label: string; value?: number; zone: Zone; target: Target | null }[];
};

const zoneClass: Record<Zone, string> = { green: 'zone-green', yellow: 'zone-yellow', red: 'zone-red', unset: 'zone-unset' };
const zoneLabel: Record<Zone, string> = { green: 'Green', yellow: 'Yellow', red: 'Red', unset: 'No target yet' };

export function ZoneList({ growth }: { growth: Growth }) {
  const any = growth.zones.some(z => z.zone !== 'unset');
  return <section className="glass-panel grid gap-3 p-5">
    {!any && <p className="text-sm text-muted-foreground">Level targets for {growth.level ?? 'your level'} haven’t been added yet. Your numbers are still saved, and zones will appear once leadership sets them.</p>}
    {growth.zones.filter(z => z.value != null || z.target).map(z => <div key={z.key} className="flex items-center justify-between gap-3 border-b border-input/60 pb-2 last:border-0">
      <div><p className="font-medium">{z.label}</p>{z.target?.next_level_requirement && <p className="text-xs text-muted-foreground">Next level: {z.target.next_level_requirement}</p>}</div>
      <div className="text-right"><p>{formatMetric(z.key, z.value)}</p><span className={`zone-pill ${zoneClass[z.zone]}`}>{zoneLabel[z.zone]}</span></div>
    </div>)}
    {growth.zones.every(z => z.value == null && !z.target) && <p className="text-sm text-muted-foreground">No numbers saved yet — share your week with the Coach to start.</p>}
  </section>;
}

export function GrowthProgress({ growth }: { growth: Growth }) {
  const open = growth.items.filter(i => !i.done && i.kind !== 'note');
  const done = growth.items.filter(i => i.done);
  const used = GROWTH_METRICS.filter(m => growth.checkins.some(c => c.metrics[m.key] != null));
  return <div className="grid gap-4">
    <section className="glass-panel p-5">
      <h2 className="eyebrow mb-3">Goals & assignments</h2>
      {open.length === 0 && done.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet. Your coach will save goals and weekly assignments here.</p>}
      <ul className="grid gap-2">{open.map(i => <li key={i.id} className="flex gap-2"><Circle size={16} className="mt-0.5 shrink-0 text-muted-foreground"/><span><span className="text-xs uppercase tracking-wider text-muted-foreground">{i.kind}</span><br/>{i.content}</span></li>)}
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
