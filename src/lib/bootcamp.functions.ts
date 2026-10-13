import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { LESSONS, SKILLS } from './bootcamp/lessons';
import { HOMEWORK_KEYS } from './bootcamp/homework';
import { TRACK_KEYS } from './bootcamp/specialty';

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
    const lc = await context.supabase.rpc('can_change_levels');
    return { educator: !!educator, canLevel: !!lc.data, me: context.userId, target, roster: roster.data ?? [], edits: edits.data ?? [], progress: progress.data ?? [], practice: practice.data ?? [], reflections: reflections.data ?? [] };
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

export const getSpecialty = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ costylist: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const [entries, restr, roster] = await Promise.all([
      sb.from('specialty_entries').select('*').eq('costylist_id', data.costylist).order('created_at', { ascending: false }),
      sb.from('specialty_signoff_restrictions').select('track').eq('educator_id', context.userId),
      sb.rpc('list_bootcamp_roster'),
    ]);
    if (entries.error) throw new Error('Specialty progress could not be loaded.');
    const names = Object.fromEntries((roster.data ?? []).map((r: { user_id: string; display_name: string }) => [r.user_id, r.display_name]));
    return { entries: (entries.data ?? []).map(e => ({ ...e, educator_name: names[e.educator_id] ?? 'Educator' })), blocked: (restr.data ?? []).map(r => r.track) };
  });

const proofFile = z.object({ path: z.string().min(3).max(300), kind: z.enum(['before', 'after', 'photo', 'video']), media_type: z.string().max(100) });

export const addSpecialtyEntry = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ costylist: z.string().uuid(), track: z.enum(TRACK_KEYS), stage: z.enum(['mannequin', 'model', 'final']), approved: z.boolean(), service: t, technique: t, result: t, feedback: t, next_assignment: t, count: z.number().int().min(1).max(20).optional(), files: z.array(proofFile).max(12).optional() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: ok } = await context.supabase.rpc('can_sign_specialty', { _track: data.track });
    if (!ok) throw new Error('You are not authorized to sign off on this specialty.');
    const { costylist, files, count, ...rest } = data;
    if (files?.length) {
      if (files.some(f => !f.path.startsWith(`${costylist}/`))) throw new Error('Invalid upload.');
      if (data.stage === 'final') throw new Error('Photos and videos are kept with mannequin and model records — record the final approval on its own.');
    }
    const reps = count ?? 1;
    const { error } = await context.supabase.from('specialty_entries').insert(
      Array.from({ length: reps }, () => ({ costylist_id: costylist, educator_id: context.userId, ...rest })),
    );
    if (error) throw new Error('Could not be saved.');
    if (files?.length) {
      const { error: pe } = await context.supabase.from('specialty_proof').insert({
        costylist_id: costylist, track: data.track, stage: data.stage as 'mannequin' | 'model', note: data.feedback,
        files, status: 'approved', reviewer_id: context.userId, reviewer_note: data.feedback, reviewed_at: new Date().toISOString(),
      });
      if (pe) throw new Error('The progress was saved, but the photos or videos could not be attached.');
    }
    return { ok: true };
  });

export const getProof = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ costylist: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const [{ data: canView }, { data: owner }] = await Promise.all([sb.rpc('can_view_proof'), sb.rpc('is_sanctuary_owner')]);
    if (data.costylist !== context.userId && !canView) return { canView: false, owner: !!owner, viewers: [] as string[], items: [] };
    const { data: rows, error } = await sb.from('specialty_proof').select('*').eq('costylist_id', data.costylist).order('created_at', { ascending: false });
    if (error) throw new Error('Photos and videos could not be loaded.');
    const paths = (rows ?? []).flatMap(r => (r.files as { path: string }[]).map(f => f.path));
    const signed = paths.length ? (await sb.storage.from('growth-proof').createSignedUrls(paths, 3600)).data ?? [] : [];
    const urls = Object.fromEntries(signed.map(s => [s.path, s.signedUrl]));
    const viewers = owner ? ((await sb.from('proof_viewers').select('user_id')).data ?? []).map(v => v.user_id) : [];
    return { canView: !!canView, owner: !!owner, viewers, items: (rows ?? []).map(r => ({ ...r, files: (r.files as z.infer<typeof proofFile>[]).map(f => ({ ...f, url: urls[f.path] ?? null })) })) };
  });

export const submitProof = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ track: z.enum(TRACK_KEYS), stage: z.enum(['mannequin', 'model']), note: z.string().trim().max(2000).nullable(), files: z.array(proofFile).min(1).max(12) }).parse(input))
  .handler(async ({ context, data }) => {
    if (data.files.some(f => !f.path.startsWith(`${context.userId}/`))) throw new Error('Invalid upload.');
    if (data.stage === 'model' && !(data.files.some(f => f.kind === 'before') && data.files.some(f => f.kind === 'after'))) throw new Error('Model work needs a before and an after photo.');
    const { error } = await context.supabase.from('specialty_proof').insert({ costylist_id: context.userId, ...data });
    if (error) throw new Error('Could not be sent.');
    return { ok: true };
  });

export const reviewProof = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ id: z.number().int(), approve: z.boolean(), note: z.string().trim().max(2000).nullable() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('review_specialty_proof', { proof_id: data.id, approve: data.approve, note: data.note ?? '' });
    if (error) throw new Error('You are not able to review this one.');
    return { ok: true };
  });

export const setProofViewer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ user: z.string().uuid(), allow: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc('set_proof_viewer', { target_user_id: data.user, allow: data.allow });
    if (error) throw new Error('Could not be changed.');
    return { ok: true };
  });
