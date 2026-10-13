/** Stylist-reported numbers match what stylists can see on their own Phorest "My Numbers" screen. Utilization and tips are not tracked here: utilization is owner-only outside this app, and tips is informational for stylists to read on their own screen. */
export const GROWTH_METRICS = [
  { key: 'clients_served', label: 'Client visits', unit: 'count' },
  { key: 'new_clients', label: 'New clients', unit: 'count' },
  { key: 'service_revenue', label: 'Service sales', unit: 'dollars' },
  { key: 'retail_sales', label: 'Retail sales', unit: 'dollars' },
  { key: 'rebooking_pct', label: 'Rebooking', unit: 'percent' },
  { key: 'rts_pct', label: 'Retail-to-service', unit: 'percent' },
  { key: 'avg_bill', label: 'Average total bill', unit: 'dollars' },
  { key: 'social_posts', label: 'Social posts', unit: 'count' },
  { key: 'models', label: 'Models / Opportunity Day guests', unit: 'count' },
  { key: 'mannequin_reps', label: 'Mannequin reps', unit: 'count' },
] as const;

/** RTS = retail sales ÷ service sales, as a percent rounded to one decimal. Never asked of stylists. */
export function rtsPct(retail: number | undefined, service: number | undefined) {
  if (retail == null || !service) return undefined;
  return Math.round((Number(retail) / Number(service)) * 1000) / 10;
}
export type MetricKey = (typeof GROWTH_METRICS)[number]['key'];
export type Metrics = Partial<Record<MetricKey, number>>;
export type Zone = 'green' | 'yellow' | 'red' | 'unset';
export type Target = { level: string; metric: string; green_min: number | null; yellow_min: number | null; next_level_requirement: string | null };

/** Zone is computed in code from owner-supplied cutoffs; never guessed. */
export function zoneFor(value: number | undefined, t: Pick<Target, 'green_min' | 'yellow_min'> | undefined): Zone {
  if (value == null || !t || t.green_min == null) return 'unset';
  if (value >= Number(t.green_min)) return 'green';
  if (t.yellow_min != null && value >= Number(t.yellow_min)) return 'yellow';
  return 'red';
}

export function formatMetric(key: string, v: number | undefined) {
  if (v == null) return '—';
  const m = GROWTH_METRICS.find(x => x.key === key);
  if (m?.unit === 'dollars') return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (m?.unit === 'percent') return `${v}%`;
  return String(v);
}

/** Monday of the week containing the date, as YYYY-MM-DD. */
export function weekStart(d = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day);
  return x.toISOString().slice(0, 10);
}

/** Monthly promotion KPIs. Average ticket rolls up like rebooking: weeks combined, weighted by client visits. */
export const MONTHLY_KPIS = ['rebooking_pct', 'rts_pct', 'service_revenue', 'avg_bill'] as const;

/** Rolls weekly saves up into calendar months. Rebooking = latest reported value in the month; service sales = month total; RTS = month retail ÷ month service. */
export function monthlyKpis(checkins: { week_start: string; updated_at: string | null; metrics: Metrics }[], targets: Target[], today = new Date()) {
  const current = today.toISOString().slice(0, 7);
  const byMonth = new Map<string, typeof checkins>();
  for (const c of checkins) { const m = String(c.week_start).slice(0, 7); byMonth.set(m, [...(byMonth.get(m) ?? []), c]); }
  return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([month, rows]) => {
    const sorted = [...rows].sort((a, b) => b.week_start.localeCompare(a.week_start));
    const updated = rows.map(r => r.updated_at ?? '').sort().at(-1) || null;
    const total = (k: MetricKey) => { const vals = rows.map(r => r.metrics[k]).filter(v => v != null) as number[]; return vals.length ? vals.reduce((s, v) => s + Number(v), 0) : undefined; };
    const kpis = MONTHLY_KPIS.map(key => {
      const label = GROWTH_METRICS.find(m => m.key === key)!.label + (key === 'service_revenue' ? ' (monthly)' : '');
      let value: number | undefined;
      if (key === 'service_revenue') value = total('service_revenue');
      else if (key === 'rts_pct') { const both = rows.filter(r => r.metrics.retail_sales != null && r.metrics.service_revenue); value = both.length ? rtsPct(both.reduce((s, r) => s + Number(r.metrics.retail_sales), 0), both.reduce((s, r) => s + Number(r.metrics.service_revenue), 0)) : sorted.find(r => r.metrics.rts_pct != null)?.metrics.rts_pct; }
      else {
        // Rebooking: combine the month's weeks, weighted by client visits when known.
        const wk = rows.filter(r => r.metrics[key] != null);
        const w = (r: (typeof rows)[number]) => Number(r.metrics.clients_served) || 0;
        const tw = wk.reduce((s, r) => s + w(r), 0);
        value = !wk.length ? undefined : tw && wk.every(r => w(r) > 0)
          ? Math.round(wk.reduce((s, r) => s + Number(r.metrics[key]) * w(r), 0) / tw * 10) / 10
          : Math.round(wk.reduce((s, r) => s + Number(r.metrics[key]), 0) / wk.length * 10) / 10;
      }
      const target = targets.find(t => t.metric === key) ?? null;
      return { key, label, value, target, zone: zoneFor(value, target ?? undefined) };
    });
    return { month, partial: month >= current, updated, kpis };
  });
}

/** Growth cycle = calendar quarters (Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec); each quarter is a fresh start. Ready = all 3 months finished and every KPI's quarter average green. */
export function quarterlyAverages(monthly: ReturnType<typeof monthlyKpis>, today = new Date()) {
  const qOf = (m: string) => `${m.slice(0, 4)}-Q${Math.floor((Number(m.slice(5, 7)) - 1) / 3) + 1}`;
  const groups = new Map<string, typeof monthly>();
  for (const m of monthly) { const q = qOf(m.month); groups.set(q, [...(groups.get(q) ?? []), m]); }
  const cur = qOf(today.toISOString().slice(0, 7));
  if (!groups.has(cur)) groups.set(cur, []);
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([q, ms]) => {
    const done = ms.filter(m => !m.partial);
    const complete = q < cur && done.length === 3;
    const kpis = MONTHLY_KPIS.map(key => {
      const vals = done.map(m => m.kpis.find(k => k.key === key)?.value).filter(v => v != null) as number[];
      const value = vals.length ? Math.round((vals.reduce((s, v) => s + Number(v), 0) / vals.length) * 100) / 100 : undefined;
      const target = ms[0]?.kpis.find(k => k.key === key)?.target ?? null;
      const label = GROWTH_METRICS.find(m => m.key === key)!.label + (key === 'service_revenue' ? ' (monthly avg)' : ' (avg)');
      return { key, label, value, monthsCounted: vals.length, target, zone: zoneFor(value, target ?? undefined) };
    });
    const [year, qn] = q.split('-');
    return { quarter: `${qn} ${year}`, current: q === cur, monthsDone: done.length, complete, kpis, allGreen: complete && kpis.every(k => k.monthsCounted === 3 && k.zone === 'green') };
  });
}
