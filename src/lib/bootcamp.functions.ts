import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { LESSONS, SKILLS } from './bootcamp/lessons';
import { HOMEWORK_KEYS } from './bootcamp/homework';

const SKILL_KEYS = [...SKILLS.map(s => s.key), ...HOMEWORK_KEYS] as [string, ...string[]];
const LESSON_IDS = LESSONS.map(l => l.id) as [string, ...string[]];

type Sb = { rpc: (n: 'is_bootcamp_educator') => PromiseLike<{ data: unknown }> };
async function requireEducator(supabase: Sb) {
  const { data } = await supabase.rpc('is_bootcamp_educator');
  if (!data) throw new Error('Educator access is required.');
}

export const getBootcamp = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ costylist: z.string().uuid().nullable().optional() }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const { data: educator } = await sb.rpc('is_bootcamp_educator');
    const target = educator && data.costylist ? data.costylist : context.userId;
    const [edits, progress, practice, reflections, roster] = await Promise.all([
      sb.from('bootcamp_lesson_edits').select('lesson_id,content'),
      sb.from('bootcamp_progress').select('*').eq('costylist_id', target),
      sb.from('bootcamp_practice').select('*').eq('costylist_id', target).order('created_at', { ascending: false }),
      sb.from('bootcamp_reflections').select('*').eq('user_id', target).order('created_at', { ascending: false }),
      educator ? sb.rpc('list_bootcamp_roster') : Promise.resolve({ data: [], error: null }),
    ]);
    if (edits.error || progress.error || practice.error || reflections.error) throw new Error('Bootcamp could not be loaded.');
    return { educator: !!educator, me: context.userId, target, roster: roster.data ?? [], edits: edits.data ?? [], progress: progress.data ?? [], practice: practice.data ?? [], reflections: reflections.data ?? [] };
  });

export const saveBootcampProgress = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ costylist: z.string().uuid(), skill: z.enum(SKILL_KEYS), status: z.enum(['not_started', 'demonstrated', 'practicing', 'ready', 'approved']), assessment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), notes: z.string().max(4000).nullable(), timing_observed: z.string().max(500).nullable(), practice_assignment: z.string().max(2000).nullable() }).parse(input))
  .handler(async ({ context, data }) => {
    await requireEducator(context.supabase);
    const { costylist, ...rest } = data;
    const now = new Date().toISOString();
    const { error } = await context.supabase.from('bootcamp_progress').upsert({ costylist_id: costylist, ...rest, educator_id: context.userId, signed_off_at: rest.status === 'approved' ? now : null, updated_at: now }, { onConflict: 'costylist_id,skill' });
    if (error) throw new Error('Progress could not be saved.');
    return { ok: true };
  });

export const saveLessonEdit = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ lesson_id: z.enum(LESSON_IDS), content: z.object({ sections: z.array(z.object({ heading: z.string().max(200), items: z.array(z.string().max(1000)).max(60) })).max(10), timing: z.object({ handsOn: z.string().max(1000), processing: z.string().max(1000), total: z.string().max(1000) }), fields: z.record(z.string(), z.string().max(2000)) }) }).parse(input))
  .handler(async ({ context, data }) => {
    await requireEducator(context.supabase);
    const { error } = await context.supabase.from('bootcamp_lesson_edits').upsert({ lesson_id: data.lesson_id, content: data.content, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) throw new Error('Lesson could not be saved.');
    return { ok: true };
  });

const t = z.string().trim().max(2000).nullable();
export const addBootcampPractice = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ costylist: z.string().uuid(), assigned_service: z.string().trim().min(1).max(500), stylist_instructions: t, application_time: t, processing_time: t, finishing_time: t, result: t, feedback: t, next_assignment: t }).parse(input))
  .handler(async ({ context, data }) => {
    await requireEducator(context.supabase);
    const { costylist, ...rest } = data;
    const { error } = await context.supabase.from('bootcamp_practice').insert({ costylist_id: costylist, educator_id: context.userId, ...rest });
    if (error) throw new Error('Practice could not be saved.');
    return { ok: true };
  });

export const addReflection = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ learned: z.string().trim().min(1).max(2000), question: z.string().trim().max(2000).nullable() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from('bootcamp_reflections').insert({ user_id: context.userId, ...data });
    if (error) throw new Error('Your note could not be saved.');
    return { ok: true };
  });

export const replyReflection = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ id: z.number().int(), reply: z.string().trim().min(1).max(2000) }).parse(input))
  .handler(async ({ context, data }) => {
    await requireEducator(context.supabase);
    const { error } = await context.supabase.from('bootcamp_reflections').update({ educator_reply: data.reply }).eq('id', data.id);
    if (error) throw new Error('Reply could not be saved.');
    return { ok: true };
  });
