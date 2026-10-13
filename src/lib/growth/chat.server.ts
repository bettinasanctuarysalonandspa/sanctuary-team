import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from '../content-studio/run-id.server.ts';
import { growthPrompt } from './prompt';
import { describeGrowth, loadGrowth } from './context';
import { GROWTH_METRICS, weekStart } from './metrics';

const part = z.union([
  z.object({ type: z.literal('text'), text: z.string().max(4000) }),
  z.object({ type: z.literal('file'), mediaType: z.string().regex(/^image\/(png|jpe?g|webp|gif|heic|heif)$/), url: z.string().startsWith('data:image/').max(7_000_000), filename: z.string().max(200).optional() }),
]);
const inputSchema = z.object({ messages: z.array(z.object({ id: z.string().min(1).max(200), role: z.enum(['user', 'assistant']), parts: z.array(part).min(1).max(10) })).min(1).max(100) });
const metricShape = Object.fromEntries(GROWTH_METRICS.map(m => [m.key, z.number().nullable()])) as Record<string, z.ZodNullable<z.ZodNumber>>;

export async function handleGrowthChat(request: Request) {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!url || !key || !apiKey) return Response.json({ message: 'Sanctuary Growth is not configured.' }, { status: 503 });
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) return Response.json({ message: 'Please sign in again.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: 'This request is not allowed.' }, { status: 403 });
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: token }, fetch: (input, init) => { const h = new Headers(init?.headers); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
  const { data: identity, error: authError } = await db.auth.getUser(token.slice(7));
  if (authError || !identity.user) return Response.json({ message: 'Please sign in again.' }, { status: 401 });
  const userId = identity.user.id;
  const { data: employee } = await db.rpc('is_sanctuary_employee');
  if (!employee) return Response.json({ message: 'Approved employee access is required.' }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Please send a message or up to 8 photos at a time.' }, { status: 400 });
  const last = parsed.data.messages.at(-1) as UIMessage | undefined;
  if (!last || last.role !== 'user') return Response.json({ message: 'A new request is required.' }, { status: 400 });

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: state } = await supabaseAdmin.from('growth_gateway_state').select('paused,reason').eq('id', 1).maybeSingle();
  if (state?.paused) return Response.json({ message: state.reason || 'Sanctuary Growth is paused. Please contact the owner.' }, { status: 403 });

  const [{ data: history }, { data: knowledge }, { data: me }, { data: profile }] = await Promise.all([
    db.from('growth_messages').select('message').eq('user_id', userId).order('id', { ascending: false }).limit(24),
    db.from('growth_knowledge').select('title,content,source,source_date').eq('approved', true).order('source_date'),
    db.rpc('my_stylist_level'),
    db.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
  ]);
  let growth;
  try { growth = await loadGrowth(db, userId, me?.[0]?.level ?? null); } catch { return Response.json({ message: 'Your saved progress could not be loaded.' }, { status: 503 }); }
  const context = describeGrowth(profile?.display_name || me?.[0]?.name || 'Team member', growth) + `\nToday: ${new Date().toISOString().slice(0, 10)} (current week starts ${weekStart()})`;

  // Stored history is text only; photos are read once and never retained.
  const stored = (history ?? []).reverse().map(r => r.message as unknown as UIMessage).filter(m => m.id !== last.id);
  const textOnly = (m: UIMessage) => ({ ...m, parts: m.parts.filter(p => p.type === 'text') });
  const hasImage = last.parts.some(p => p.type === 'file');
  const savedLast = textOnly(last);
  if (hasImage) savedLast.parts = [...savedLast.parts, { type: 'text', text: '📷 (photo shared)' }];
  const { error: saveError } = await db.from('growth_messages').upsert({ user_id: userId, message_id: last.id, message: savedLast as never }, { onConflict: 'user_id,message_id' });
  if (saveError) return Response.json({ message: 'Your message could not be saved.' }, { status: 503 });

  const modelMessages = await convertToModelMessages([...stored.map(textOnly), last]);
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({ baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey, headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' }, fetch: runIdFetch.fetch });
  const ok = (error: { message: string } | null) => error ? { saved: false, error: 'Could not save.' } : { saved: true };
  const result = streamText({
    model: provider.responses('openai/gpt-6-astra'),
    system: growthPrompt(knowledge ?? [], context),
    messages: modelMessages,
    maxRetries: 0,
    abortSignal: request.signal,
    stopWhen: stepCountIs(6),
    tools: {
      save_checkin: tool({
        description: 'Save confirmed weekly numbers. Merges into the week; null = not provided (keeps any saved value).',
        inputSchema: z.object({ week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Monday of the week, YYYY-MM-DD'), from_photo: z.boolean(), metrics: z.object(metricShape) }),
        execute: async ({ week_start, from_photo, metrics }) => {
          const { data: prev } = await db.from('growth_checkins').select('metrics').eq('user_id', userId).eq('week_start', week_start).maybeSingle();
          const merged = { ...((prev?.metrics as object) ?? {}), ...Object.fromEntries(Object.entries(metrics).filter(([, v]) => v != null)) };
          const { error } = await db.from('growth_checkins').upsert({ user_id: userId, week_start, metrics: merged, source: from_photo ? 'photo' : 'chat', updated_at: new Date().toISOString() }, { onConflict: 'user_id,week_start' });
          return ok(error);
        },
      }),
      set_goal: tool({ description: 'Save a goal the person committed to.', inputSchema: z.object({ content: z.string().min(1).max(500) }), execute: async ({ content }) => ok((await db.from('growth_items').insert({ user_id: userId, kind: 'goal', content })).error) }),
      give_assignment: tool({ description: 'Save this week\'s agreed assignment.', inputSchema: z.object({ content: z.string().min(1).max(500) }), execute: async ({ content }) => ok((await db.from('growth_items').insert({ user_id: userId, kind: 'assignment', content })).error) }),
      add_note: tool({ description: 'Save a short coaching note worth remembering next time.', inputSchema: z.object({ content: z.string().min(1).max(500) }), execute: async ({ content }) => ok((await db.from('growth_items').insert({ user_id: userId, kind: 'note', content })).error) }),
      complete_item: tool({ description: 'Mark a goal or assignment (#id) complete.', inputSchema: z.object({ id: z.number().int() }), execute: async ({ id }) => ok((await db.from('growth_items').update({ done: true, completed_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)).error) }),
      set_training_week: tool({ description: 'Set an associate\'s current program week (1-12).', inputSchema: z.object({ week: z.number().int().min(1).max(12) }), execute: async ({ week }) => ok((await db.from('growth_profiles').upsert({ user_id: userId, training_week: week, updated_at: new Date().toISOString() })).error) }),
    },
    providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', include: ['reasoning.encrypted_content'] } },
  });
  const iterator = result.fullStream[Symbol.asyncIterator]();
  let first = await iterator.next();
  while (!first.done && !['error', 'text-delta', 'finish', 'tool-call'].includes(first.value.type)) first = await iterator.next();
  if (first.value?.type === 'error') {
    const error = first.value.error as { statusCode?: number; responseBody?: string };
    const status = error.statusCode ?? 500;
    let message = 'Sanctuary Growth could not answer. Please try again.';
    try { const body = JSON.parse(error.responseBody ?? '{}'); message = body.message ?? body.error?.message ?? message; } catch { /* fallback */ }
    if ([402, 403, 404].includes(status)) await supabaseAdmin.from('growth_gateway_state').upsert({ id: 1, paused: true, reason: message, updated_at: new Date().toISOString() });
    console.error('growth gateway error', status);
    return Response.json({ message }, { status });
  }
  return withLovableAiGatewayRunIdHeader(result.toUIMessageStreamResponse({ originalMessages: [...stored, savedLast], generateMessageId: () => crypto.randomUUID(), sendReasoning: false,
    onError: () => 'Sanctuary Growth could not finish this answer.',
    onFinish: async ({ responseMessage, isAborted }) => {
      const plain = textOnly(responseMessage);
      if (isAborted && !plain.parts.length) return;
      if (!plain.parts.length) return;
      await db.from('growth_messages').upsert({ user_id: userId, message_id: plain.id, message: plain as never }, { onConflict: 'user_id,message_id' });
    },
  }), runIdFetch);
}
