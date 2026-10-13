export const GROWTH_METRICS = [
  { key: 'clients_served', label: 'Clients served', unit: 'count' },
  { key: 'new_clients', label: 'New clients', unit: 'count' },
  { key: 'service_revenue', label: 'Service revenue', unit: 'dollars' },
  { key: 'retail_sales', label: 'Retail sales', unit: 'dollars' },
  { key: 'rebooking_pct', label: 'Rebooking', unit: 'percent' },
  { key: 'utilization_pct', label: 'Utilization', unit: 'percent' },
  { key: 'rts_pct', label: 'Retail-to-service', unit: 'percent' },
  { key: 'social_posts', label: 'Social posts', unit: 'count' },
  { key: 'models', label: 'Models / Opportunity Day guests', unit: 'count' },
  { key: 'mannequin_reps', label: 'Mannequin reps', unit: 'count' },
] as const;
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
