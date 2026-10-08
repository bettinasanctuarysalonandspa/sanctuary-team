import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { UIMessage } from 'ai';

export const listStudioMessages = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from('content_studio_messages').select('message').eq('user_id', context.userId).order('id', { ascending: false }).limit(80);
  if (error) throw new Error('Your conversation could not be loaded.');
  return (data ?? []).reverse().map(r => { const m = r.message as unknown as UIMessage; return { id: m.id, role: m.role as 'user' | 'assistant', parts: m.parts.filter(p => p.type === 'text').map(p => ({ type: 'text' as const, text: p.text })) }; });
});
export const clearStudioMessages = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { error } = await context.supabase.from('content_studio_messages').delete().eq('user_id', context.userId);
  if (error) throw new Error('Your conversation could not be cleared.');
  return { ok: true };
});
export const getStudioKnowledge = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: owner } = await context.supabase.rpc('is_sanctuary_owner');
  if (!owner) throw new Error('Owner access is required.');
  const { data, error } = await context.supabase.from('content_studio_knowledge').select('*').order('updated_at', { ascending: false });
  if (error) throw new Error('Approved information could not be loaded.');
  const { data: state } = await context.supabase.from('content_studio_gateway_state').select('paused,reason').eq('id', 1).maybeSingle();
  return { records: data ?? [], state };
});
export const saveStudioKnowledge = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ id: z.string().uuid().nullable(), title: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(80000), source: z.string().trim().min(1).max(500), source_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), approved: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: owner } = await context.supabase.rpc('is_sanctuary_owner');
    if (!owner) throw new Error('Owner access is required.');
    const { id, ...values } = data;
    const row = { ...values, updated_at: new Date().toISOString() };
    const result = id ? await context.supabase.from('content_studio_knowledge').update(row).eq('id', id).select('id').single() : await context.supabase.from('content_studio_knowledge').insert(row).select('id').single();
    if (result.error) throw new Error('Your information could not be saved.');
    return result.data;
  });
export const resumeStudio = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: owner } = await context.supabase.rpc('is_sanctuary_owner');
  if (!owner) throw new Error('Owner access is required.');
  const { error } = await context.supabase.from('content_studio_gateway_state').upsert({ id: 1, paused: false, reason: null, updated_at: new Date().toISOString() });
  if (error) throw new Error('Content Studio could not be resumed.');
  return { ok: true };
});