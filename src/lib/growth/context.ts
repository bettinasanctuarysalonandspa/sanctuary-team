import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { GROWTH_METRICS, formatMetric, zoneFor, type Metrics, type Target } from './metrics';

type Db = SupabaseClient<Database>;

/** Loads one person's saved growth record (RLS scopes it to the caller, or the owner). */
export async function loadGrowth(db: Db, userId: string, level: string | null) {
  const [profile, checkins, items, targets] = await Promise.all([
    db.from('growth_profiles').select('start_date,training_week,focus').eq('user_id', userId).maybeSingle(),
    db.from('growth_checkins').select('week_start,metrics,source').eq('user_id', userId).order('week_start', { ascending: false }).limit(12),
    db.from('growth_items').select('id,kind,content,done,created_at,completed_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
    level ? db.from('growth_level_targets').select('level,metric,green_min,yellow_min,next_level_requirement').eq('level', level) : Promise.resolve({ data: [] as Target[], error: null }),
  ]);
  if (profile.error || checkins.error || items.error || targets.error) throw new Error('Saved progress could not be loaded.');
  const latest = (checkins.data?.[0]?.metrics ?? {}) as Metrics;
  const t = (targets.data ?? []) as Target[];
  // Service dollar targets are monthly: zone off the month-to-date total, not one week.
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthService = (checkins.data ?? []).filter(c => String(c.week_start).startsWith(monthPrefix)).reduce((sum, c) => sum + (Number((c.metrics as Metrics).service_revenue) || 0), 0);
  const serviceValue = monthService || latest.service_revenue;
  const zoneValues: Metrics = { ...latest, ...(serviceValue != null ? { service_revenue: serviceValue } : {}) };
  const zones = GROWTH_METRICS.map(m => ({ key: m.key, label: m.label, value: zoneValues[m.key], zone: zoneFor(zoneValues[m.key], t.find(x => x.metric === m.key)), target: t.find(x => x.metric === m.key) ?? null }));
  return { level, profile: profile.data, checkins: (checkins.data ?? []).map(c => ({ ...c, metrics: c.metrics as Metrics })), items: items.data ?? [], targets: t, zones };
}

export function describeGrowth(name: string, g: Awaited<ReturnType<typeof loadGrowth>>) {
  const lines = [`Name: ${name}`, `Level (from the salon's stylist list): ${g.level ?? 'Not on the stylist list yet — ask leadership'}`];
  if (g.profile?.training_week) lines.push(`Associate training week: ${g.profile.training_week} of 12`);
  if (g.profile?.start_date) lines.push(`Start date: ${g.profile.start_date}`);
  lines.push('Weekly check-ins (newest first):');
  lines.push(g.checkins.length ? g.checkins.map(c => `- Week of ${c.week_start}: ` + Object.entries(c.metrics).map(([k, v]) => `${GROWTH_METRICS.find(m => m.key === k)?.label ?? k} ${formatMetric(k, v)}`).join(', ')).join('\n') : '- None yet');
  lines.push('Current zones (computed from owner targets; Service revenue zone uses the month-to-date total against the monthly target): ' + g.zones.map(z => `${z.label}: ${z.zone === 'unset' ? 'no target set' : z.zone}`).join('; '));
  const reqs = g.targets.filter(t => t.next_level_requirement).map(t => `${t.metric}: ${t.next_level_requirement}`);
  if (reqs.length) lines.push('Next-level requirements: ' + reqs.join('; '));
  const open = g.items.filter(i => !i.done && i.kind !== 'note');
  lines.push('Open goals & assignments:\n' + (open.length ? open.map(i => `- [#${i.id} ${i.kind}] ${i.content}`).join('\n') : '- None'));
  const done = g.items.filter(i => i.done).slice(0, 10);
  if (done.length) lines.push('Recently completed:\n' + done.map(i => `- ${i.kind}: ${i.content}`).join('\n'));
  const notes = g.items.filter(i => i.kind === 'note').slice(0, 10);
  if (notes.length) lines.push('Coaching notes:\n' + notes.map(i => `- ${i.created_at.slice(0, 10)}: ${i.content}`).join('\n'));
  return lines.join('\n');
}
