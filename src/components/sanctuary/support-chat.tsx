import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useServerFn } from '@tanstack/react-start';
import { Copy, Mic, MicOff, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearSupportMessages } from '@/lib/support.functions';
import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse, MessageAction } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';

type Recognition = { lang: string; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const ISSUES = ['Water / Plumbing Emergency','Electrical / Power Emergency','Gas Smell / Evacuation','Fire / Smoke / Burning Smell','HVAC Issue','Internet / Phones / System Outage','Payment System Down','Medical / Client Injury','Aggressive Client / Safety Threat','Chemical Spill / Product Safety','Equipment Failure','Weather / Building Access Issue','Who to Call','Document an Incident','Escalate to Management'];
export function SupportChat({ initialMessages }: { initialMessages: UIMessage[] }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/support', headers: async () => { const { data } = await supabase.auth.getSession(); return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}; }, prepareSendMessagesRequest: ({ messages, headers }) => ({ ...(headers ? { headers } : {}), body: { messages: messages.slice(-1).map(m => ({ id: m.id, role: m.role, parts: m.parts.filter(p => p.type === 'text') })) } }) }), []);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({ messages: initialMessages, transport });
  const clear = useServerFn(clearSupportMessages);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState('');
  const [clearing, setClearing] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const busy = status === 'submitted' || status === 'streaming';
  useEffect(() => { const w = window as unknown as Record<string, unknown>; setVoice(Boolean(w['SpeechRecognition'] || w['webkitSpeechRecognition'])); return () => rec.current?.stop(); }, []);
  useEffect(() => { if (!busy) input.current?.focus(); }, [busy]);
  function toggleVoice() {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as Record<string, new () => Recognition>;
    const Ctor = w['SpeechRecognition'] || w['webkitSpeechRecognition'];
    if (!Ctor) return;
    const r = new Ctor(); r.lang = 'en-US';
    r.onresult = e => setText(prev => [prev, Array.from(e.results).map(v => v[0]?.transcript ?? '').join(' ')].filter(Boolean).join(' ').slice(0, 4000));
    r.onend = () => setListening(false); r.onerror = () => { setListening(false); setNotice('Voice input is unavailable. Please type your request.'); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setNotice('Voice input is unavailable. Please type your request.'); }
  }
  async function reset() { setClearing(true); try { await clear(); setMessages([]); clearError(); setNotice(''); } catch (e) { setNotice(e instanceof Error ? e.message : 'The conversation could not be cleared.'); } finally { setClearing(false); input.current?.focus(); } }
  let errorText = error?.message ?? '';
  try { errorText = JSON.parse(errorText).message ?? errorText; } catch { /* plain message */ }
  return <section aria-label="Sanctuary Emergency Support chat" className="flex flex-col gap-4">
    <div className="flex min-h-9 justify-end">{messages.length > 0 && <Button variant="glass" size="sm" onClick={() => void reset()} disabled={busy || clearing}><RotateCcw size={15}/>New conversation</Button>}</div>
    <Conversation className="h-[52vh] min-h-80 flex-none rounded-lg border border-input bg-card/60 backdrop-blur">
      <ConversationContent className="gap-5">
        {messages.length === 0 && <div className="grid gap-3"><p className="text-base">What emergency or urgent issue is happening? Choose the closest option or describe it below.</p><div className="grid gap-2 sm:grid-cols-2">{ISSUES.map(issue => <Button key={issue} variant="glass" className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left text-base" disabled={busy} onClick={() => { clearError(); void sendMessage({ text: issue }); }}>{issue}</Button>)}</div></div>}
        {messages.map(m => <Message key={m.id} from={m.role}><MessageContent className={m.role === 'user' ? 'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground break-words' : 'break-words'}>{m.parts.map((p, i) => p.type === 'text' ? <MessageResponse key={i}>{p.text}</MessageResponse> : null)}</MessageContent>{m.role === 'assistant' && !busy && <MessageAction tooltip="Copy answer" label="Copy answer" onClick={() => void navigator.clipboard.writeText(m.parts.filter(p => p.type === 'text').map(p => p.text).join('\n')).catch(() => setNotice('Answer could not be copied.'))}><Copy size={15}/></MessageAction>}</Message>)}
        {busy && <Shimmer>Thinking…</Shimmer>}
      </ConversationContent><ConversationScrollButton/>
    </Conversation>
    {(errorText || notice) && <p role="alert" className="form-message">{errorText || notice}</p>}
    <PromptInput onSubmit={() => { const value = text.trim(); if (!value || busy || clearing) return; clearError(); setNotice(''); setText(''); void sendMessage({ text: value }); input.current?.focus(); }}>
      <PromptInputTextarea ref={input} value={text} onChange={e => setText(e.target.value)} maxLength={4000} placeholder="Describe what is happening right now…" aria-label="What is happening" className="min-h-24 text-base"/>
      <PromptInputFooter className="justify-end gap-2">{voice && <Button variant="glass" size="icon-sm" type="button" title={listening ? 'Stop voice input' : 'Speak your question'} aria-label={listening ? 'Stop voice input' : 'Speak your question'} aria-pressed={listening} onClick={toggleVoice}>{listening ? <MicOff/> : <Mic/>}</Button>}<PromptInputSubmit status={status} onStop={() => void stop()} disabled={clearing || (!busy && !text.trim())} title={busy ? 'Stop writing' : 'Send question'} aria-label={busy ? 'Stop writing' : 'Send request'}/></PromptInputFooter>
    </PromptInput>
  </section>;
}