import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listConsultationMessages = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('consultation_messages').select('id,role,content').eq('user_id', context.userId).order('id').limit(200);
    if (error) throw new Error('Your conversation could not be loaded.');
    return data;
  });

export const sendConsultationMessage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ text: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const { error } = await db.from('consultation_messages').insert({ user_id: context.userId, role: 'user', content: data.text });
    if (error) throw new Error('Employee access is required.');
    const { data: rows, error: histError } = await db.from('consultation_messages').select('role,content').eq('user_id', context.userId).order('id', { ascending: false }).limit(12);
    if (histError) throw new Error('Your conversation could not be loaded.');
    const { runConsultation } = await import('./consultation.server');
    const reply = await runConsultation(db, rows.reverse().map(r => ({ role: r.role as 'user' | 'assistant', content: r.content })));
    await db.from('consultation_messages').insert({ user_id: context.userId, role: 'assistant', content: reply.slice(0, 20000) });
    return { reply };
  });

export const clearConsultation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from('consultation_messages').delete().eq('user_id', context.userId);
    if (error) throw new Error('The conversation could not be cleared.');
    return { ok: true };
  });
