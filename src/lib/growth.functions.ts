import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { UIMessage } from 'ai';
import { loadGrowth } from './growth/context';

async function requireOwner(supabase: { rpc: (n: 'is_sanctuary_owner') => PromiseLike<{ data: unknown }> }) {
  const { data } = await supabase.rpc('is_sanctuary_owner');
  if (!data) throw new Error('Owner access is required.');
}

export const getMyGrowth = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [{ data: msgs, error }, { data: me }] = await Promise.all([
    context.supabase.from('growth_messages').select('message').eq('user_id', context.userId).order('id', { ascending: false }).limit(80),
    context.supabase.rpc('my_stylist_level'),
  ]);
  if (error) throw new Error('Your conversation could not be loaded.');
  const messages = (msgs ?? []).reverse().map(r => { const m = r.message as unknown as UIMessage; return { id: m.id, role: m.role as 'user' | 'assistant', parts: m.parts.filter(p => p.type === 'text').map(p => ({ type: 'text' as const, text: p.text })) }; });
  const growth = await loadGrowth(context.supabase, context.userId, me?.[0]?.level ?? null);
  return { messages, growth };
});

export const clearGrowthMessages = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { error } = await context.supabase.from('growth_messages').delete().eq('user_id', context.userId);
  if (error) throw new Error('Your conversation could not be cleared.');
  return { ok: true };
});

export const getGrowthAdmin = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireOwner(context.supabase);
  const [roster, knowledge, targets, state] = await Promise.all([
    context.supabase.rpc('list_growth_roster'),
    context.supabase.from('growth_knowledge').select('*').order('updated_at', { ascending: false }),
    context.supabase.from('growth_level_targets').select('*').order('level'),
    context.supabase.from('growth_gateway_state').select('paused,reason').eq('id', 1).maybeSingle(),
  ]);
  if (roster.error || knowledge.error || targets.error) throw new Error('Growth information could not be loaded.');
  const people = await Promise.all((roster.data ?? []).map(async p => ({ ...p, growth: await loadGrowth(context.supabase, p.user_id, p.level) })));
  return { people, knowledge: knowledge.data ?? [], targets: targets.data ?? [], state: state.data };
});

export const saveGrowthKnowledge = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ id: z.string().uuid().nullable(), title: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(80000), source: z.string().trim().min(1).max(500), source_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), approved: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    await requireOwner(context.supabase);
    const { id, ...values } = data;
    const row = { ...values, updated_at: new Date().toISOString() };
    const r = id ? await context.supabase.from('growth_knowledge').update(row).eq('id', id) : await context.supabase.from('growth_knowledge').insert(row);
    if (r.error) throw new Error('Your information could not be saved.');
    return { ok: true };
  });

export const saveGrowthTarget = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ level: z.string().trim().min(1).max(60), metric: z.string().min(1).max(60), green_min: z.number().nullable(), yellow_min: z.number().nullable(), next_level_requirement: z.string().trim().max(1000).nullable() }).parse(input))
  .handler(async ({ context, data }) => {
    await requireOwner(context.supabase);
    const { error } = await context.supabase.from('growth_level_targets').upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: 'level,metric' });
    if (error) throw new Error('The target could not be saved.');
    return { ok: true };
  });

export const resumeGrowth = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireOwner(context.supabase);
  const { error } = await context.supabase.from('growth_gateway_state').upsert({ id: 1, paused: false, reason: null, updated_at: new Date().toISOString() });
  if (error) throw new Error('Sanctuary Growth could not be resumed.');
  return { ok: true };
});
