import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { z } from 'zod';
import { convertToModelMessages, type UIMessage } from 'ai';
import { createResponsesCall } from './responses.server.ts';
import { studioPrompt } from './prompt';
import { withLovableAiGatewayRunIdHeader } from './run-id.server.ts';

const inputSchema = z.object({ messages: z.array(z.object({ id: z.string().min(1).max(200), role: z.enum(['user', 'assistant']), parts: z.array(z.object({ type: z.literal('text'), text: z.string().max(4000) })).min(1) })).min(1).max(100) });

export async function handleStudioChat(request: Request) {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!url || !key || !apiKey) return Response.json({ message: 'Content Studio is not configured.' }, { status: 503 });
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) return Response.json({ message: 'Please sign in again.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: 'This request is not allowed.' }, { status: 403 });
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: token }, fetch: (input, init) => { const headers = new Headers(init?.headers); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
  const { data: identity, error: authError } = await db.auth.getUser(token.slice(7));
  if (authError || !identity.user) return Response.json({ message: 'Please sign in again.' }, { status: 401 });
  const userId = identity.user.id;
  const { data: employee } = await db.rpc('is_sanctuary_employee');
  if (!employee) return Response.json({ message: 'Approved employee access is required.' }, { status: 403 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Please send a text request of up to 4,000 characters.' }, { status: 400 });
  const last = parsed.data.messages.at(-1);
  if (!last || last.role !== 'user') return Response.json({ message: 'A new request is required.' }, { status: 400 });
  // The browser supplies the latest input, never authority over stored history.
  const { data: history, error: historyError } = await db.from('content_studio_messages').select('message').eq('user_id', userId).order('id', { ascending: false }).limit(24);
  const { data: knowledge, error: knowledgeError } = await db.from('content_studio_knowledge').select('title,content,source,source_date').eq('approved', true).order('source_date');
  if (historyError || knowledgeError) return Response.json({ message: 'Your approved information could not be loaded.' }, { status: 503 });
  if (!knowledge?.length) return Response.json({ message: 'Content Studio is awaiting owner-approved information.' }, { status: 409 });
  // Privileged reads only after validated membership; persistent circuit breaker.
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: state, error: stateError } = await supabaseAdmin.from('content_studio_gateway_state').select('paused,reason').eq('id', 1).maybeSingle();
  if (stateError) return Response.json({ message: 'Content Studio availability could not be checked.' }, { status: 503 });
  if (state?.paused) return Response.json({ message: state.reason || 'Content Studio is paused. Please contact the owner.' }, { status: 403 });
  let failureStatus = 500;
  let failureMessage = 'Content Studio could not answer. Please try again.';
  const gatewayRequest = new Request(request.url, { signal: request.signal });
  const messages = (history ?? []).reverse().map(r => r.message as unknown as UIMessage).filter(m => m.id !== last.id);
  messages.push(last);
  const { error: saveError } = await db.from('content_studio_messages').upsert({ user_id: userId, message_id: last.id, message: last }, { onConflict: 'user_id,message_id' });
  if (saveError) return Response.json({ message: 'Your request could not be saved.' }, { status: 503 });
  const modelMessages = convertToModelMessages(messages.map(m => ({ ...m, parts: m.parts.filter(p => p.type === 'text') })));
  const call = createResponsesCall(gatewayRequest, { baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey, model: 'openai/gpt-6-astra' }, modelMessages, studioPrompt(knowledge));
  // Provider errors are handled before returning a stream; never auto-retry.
  const iterator = call.result.fullStream[Symbol.asyncIterator]();
  let first = await iterator.next();
  while (!first.done && first.value.type !== 'error' && first.value.type !== 'text-delta' && first.value.type !== 'finish') first = await iterator.next();
  if (first.value?.type === 'error') {
    const error = first.value.error as { statusCode?: number; responseBody?: string };
    failureStatus = error.statusCode ?? 500;
    try { const body = JSON.parse(error.responseBody ?? '{}'); failureMessage = body.message ?? body.error?.message ?? failureMessage; } catch { /* safe fallback */ }
    if ([402, 403, 404].includes(failureStatus)) await supabaseAdmin.from('content_studio_gateway_state').upsert({ id: 1, paused: true, reason: failureMessage, updated_at: new Date().toISOString() });
    return Response.json({ message: failureMessage }, { status: failureStatus });
  }
  if (first.done || first.value?.type === 'finish') return Response.json({ message: 'Content Studio could not provide this response.' }, { status: 422 });
  return withLovableAiGatewayRunIdHeader(call.result.toUIMessageStreamResponse({ originalMessages: messages, generateMessageId: () => crypto.randomUUID(), sendReasoning: false,
    onError: () => failureMessage,
    onFinish: async ({ responseMessage, isAborted }) => {
      if (isAborted && !responseMessage.parts.some(p => p.type === 'text' && p.text)) return;
      const plain = { ...responseMessage, parts: responseMessage.parts.filter(p => p.type === 'text') };
      const { error } = await db.from('content_studio_messages').upsert({ user_id: userId, message_id: plain.id, message: plain as unknown as Database['public']['Tables']['content_studio_messages']['Insert']['message'] }, { onConflict: 'user_id,message_id' });
      if (error) throw new Error('Your answer could not be saved.');
    },
  }), call.runIdFetch);
}