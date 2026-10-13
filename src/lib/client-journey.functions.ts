import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { CJ_QUESTIONS, CJ_VERSION, nextLevel } from './client-journey/questions';

type Rpc = { rpc: (n: 'is_sanctuary_owner' | 'is_bootcamp_educator' | 'is_sanctuary_employee') => PromiseLike<{ data: unknown }> };
async function flags(sb: Rpc) {
  const [o, e, m] = await Promise.all([sb.rpc('is_sanctuary_owner'), sb.rpc('is_bootcamp_educator'), sb.rpc('is_sanctuary_employee')]);
  return { owner: !!o.data, educator: !!e.data, employee: !!m.data };
}

/** My own test page: settings, my level and my attempts. */
export const getMyClientJourney = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sb = context.supabase;
  const [settings, me, attempts] = await Promise.all([
    sb.from('cj_settings').select('pass_percent').eq('id', 1).maybeSingle(),
    sb.from('calc_stylists').select('level').eq('user_id', context.userId).maybeSingle(),
    sb.from('cj_attempts').select('*').eq('user_id', context.userId).order('created_at', { ascending: false }),
  ]);
  if (attempts.error) throw new Error('Your test history could not be loaded.');
  const level = me.data?.level ?? 'Associate';
  return { passPercent: settings.data?.pass_percent ?? 90, level, next: nextLevel(level), attempts: attempts.data ?? [] };
});

export const submitClientJourney = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ purpose: z.enum(['bootcamp', 'advancement']), answers: z.array(z.number().int().min(0).max(3)).length(CJ_QUESTIONS.length) }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    if (!(await flags(sb)).employee) throw new Error('Team access is required.');
    const [settings, me, profile, assign] = await Promise.all([
      sb.from('cj_settings').select('pass_percent').eq('id', 1).maybeSingle(),
      sb.from('calc_stylists').select('level').eq('user_id', context.userId).maybeSingle(),
      sb.from('profiles').select('display_name').eq('id', context.userId).maybeSingle(),
      sb.from('cj_assignments').select('educator_id').eq('user_id', context.userId).maybeSingle(),
    ]);
    const level = me.data?.level ?? 'Associate';
    const proposed = data.purpose === 'advancement' ? nextLevel(level) : null;
    if (data.purpose === 'advancement' && !proposed) throw new Error('Legacy is the highest level.');
    const pass = settings.data?.pass_percent ?? 90;
    const { gradeClientJourney } = await import('./client-journey/grade');
    const r = gradeClientJourney(data.answers, pass);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('cj_attempts').insert({
      user_id: context.userId, stylist_name: profile.data?.display_name || 'Team member', purpose: data.purpose,
      current_level: level, proposed_level: proposed, version: CJ_VERSION, score: r.score, total: r.total, percent: r.percent,
      pass_percent: pass, passed: r.passed, missed: r.missed, educator_id: assign.data?.educator_id ?? null,
    });
    if (error) throw new Error('Your test could not be saved. Please try again.');
    return { ...r, passPercent: pass, level, proposed };
  });

/** Owner/educator review: results, assignments, settings, advancement check. */
export const getClientJourneyAdmin = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sb = context.supabase;
  const f = await flags(sb);
  const lc = await sb.rpc('can_change_levels');
  const canLevel = !!lc.data;
  if (!f.owner && !f.educator && !canLevel) throw new Error('Educator access is required.');
  const [settings, attempts, stylists, assignments, roster] = await Promise.all([
    sb.from('cj_settings').select('pass_percent').eq('id', 1).maybeSingle(),
    sb.from('cj_attempts').select('*').order('created_at', { ascending: false }).limit(300),
    sb.from('calc_stylists').select('id,name,level,user_id,active').eq('active', true).order('name'),
    sb.from('cj_assignments').select('user_id,educator_id'),
    sb.rpc('list_bootcamp_roster'),
  ]);
  if (attempts.error) throw new Error('Results could not be loaded.');
  return { owner: f.owner, canLevel, me: context.userId, passPercent: settings.data?.pass_percent ?? 90, attempts: attempts.data ?? [], stylists: stylists.data ?? [], assignments: assignments.data ?? [], roster: roster.data ?? [] };
});

export const saveFollowup = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ id: z.number().int(), note: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('cj_followup', { attempt_id: data.id, note: data.note });
    if (error) throw new Error('Follow-up could not be saved.');
    return { ok: true };
  });

export const markResultsSeen = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await context.supabase.rpc('cj_mark_seen');
  return { ok: true };
});

export const savePassPercent = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ pass: z.number().int().min(1).max(100) }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('cj_settings').update({ pass_percent: data.pass, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) throw new Error('Owner access is required.');
    return { ok: true };
  });

export const assignEducator = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ user: z.string().uuid(), educator: z.string().uuid().nullable() }).parse(input))
  .handler(async ({ context, data }) => {
    const q = data.educator
      ? context.supabase.from('cj_assignments').upsert({ user_id: data.user, educator_id: data.educator, updated_at: new Date().toISOString() })
      : context.supabase.from('cj_assignments').delete().eq('user_id', data.user);
    const { error } = await q;
    if (error) throw new Error('Owner access is required.');
    return { ok: true };
  });

export const changeLevel = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('promote'), stylist: z.number().int() }),
    z.object({ kind: z.literal('correct'), stylist: z.number().int(), level: z.enum(['New Stylist', 'Designer 1', 'Designer 2', 'Advanced 1', 'Advanced 2', 'Master 1', 'Master 2', 'Legacy']) }),
    z.object({ kind: z.literal('associate'), user: z.string().uuid(), name: z.string().trim().min(1).max(120) }),
  ]).parse(input))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { error } = data.kind === 'promote' ? await sb.rpc('promote_stylist', { stylist_id: data.stylist })
      : data.kind === 'correct' ? await sb.rpc('correct_stylist_level', { stylist_id: data.stylist, new_level: data.level })
      : await sb.rpc('promote_associate', { target_user_id: data.user, stylist_name: data.name });
    if (error) throw new Error(error.message.includes('required') || error.message.includes('Legacy') || error.message.includes('linked') || error.message.includes('already') ? error.message : 'The level could not be changed.');
    return { ok: true };
  });
