import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai';
import { photoPart } from './content-studio-chat';
import { useServerFn } from '@tanstack/react-start';
import { BookOpen, Camera, ClipboardList, Copy, Mail, MessageSquare, Mic, MicOff, RotateCcw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearGuidanceMessages } from '@/lib/guidance.functions';
import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse, MessageAction } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';

type Recognition = { lang: string; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const starters = [
  { label: 'Check my dress code', icon: Camera, text: 'Does my outfit meet our handbook dress code? Please check this photo.', photo: true },
  { label: 'Find a handbook rule', icon: BookOpen, text: 'What does our handbook say about [topic]?', topic: true },
  { label: 'Find a policy or procedure', icon: ClipboardList, text: 'What is our policy or procedure for [situation]?', topic: true },
  { label: 'Reply to an email', icon: Mail, text: 'Write a ready-to-copy reply to this client email in the Sanctuary voice, following our approved policies:\n\n' },
  { label: 'Reply to a review', icon: MessageSquare, text: 'Write a ready-to-copy reply to this client review in the Sanctuary voice, following our approved policies:\n\n' },
];
export function GuidanceChat({ initialMessages }: { initialMessages: UIMessage[] }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/guidance', headers: async () => { const { data } = await supabase.auth.getSession(); return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}; }, prepareSendMessagesRequest: ({ messages, headers }) => ({ ...(headers ? { headers } : {}), body: { messages: messages.slice(-1).map(m => ({ id: m.id, role: m.role, parts: m.parts.filter(p => p.type === 'text' || p.type === 'file') })) } }) }), []);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({ messages: initialMessages, transport });
  const clear = useServerFn(clearGuidanceMessages);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState('');
  const [clearing, setClearing] = useState(false);
  const [photos, setPhotos] = useState<FileUIPart[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  async function addPhotos(files: FileList | null) {
    const list = Array.from(files ?? []).slice(0, 4 - photos.length);
    const results = await Promise.allSettled(list.map(photoPart));
    const ok = results.flatMap(r => r.status === 'fulfilled' ? [r.value] : []);
    if (ok.length < list.length) setNotice('One photo could not be opened. Please try a screenshot or retake it.');
    setPhotos(prev => [...prev, ...ok].slice(0, 4));
    if (fileInput.current) fileInput.current.value = '';
  }
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
  return <section aria-label="Sanctuary Handbook and Guidance chat" className="flex flex-col gap-4">
    <div className="flex min-h-9 justify-end">{messages.length > 0 && <Button variant="glass" size="sm" onClick={() => void reset()} disabled={busy || clearing}><RotateCcw size={15}/>New conversation</Button>}</div>
    <Conversation className="h-[52vh] min-h-80 flex-none rounded-lg border border-input bg-card/60 backdrop-blur">
      <ConversationContent className="gap-5">
        {messages.length === 0 && <ConversationEmptyState><span className="brand-mark" aria-hidden="true">S</span></ConversationEmptyState>}
        {messages.map(m => <Message key={m.id} from={m.role}><MessageContent className={m.role === 'user' ? 'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground break-words' : 'break-words'}>{m.parts.map((p, i) => p.type === 'text' ? <MessageResponse key={i}>{p.text}</MessageResponse> : p.type === 'file' ? <img key={i} src={p.url} alt="Shared photo" className="max-h-48 rounded-md"/> : null)}</MessageContent>{m.role === 'assistant' && !busy && <MessageAction tooltip="Copy answer" label="Copy answer" onClick={() => void navigator.clipboard.writeText(m.parts.filter(p => p.type === 'text').map(p => p.text).join('\n')).catch(() => setNotice('Answer could not be copied.'))}><Copy size={15}/></MessageAction>}</Message>)}
        {busy && <Shimmer>Thinking…</Shimmer>}
      </ConversationContent><ConversationScrollButton/>
    </Conversation>
    {(errorText || notice) && <p role="alert" className="form-message">{errorText || notice}</p>}
    <div aria-label="Quick questions" className="flex flex-wrap gap-2">
      {starters.map(starter => <Button key={starter.label} type="button" variant="glass" size="sm" className="h-auto min-h-9 max-w-full whitespace-normal text-left" disabled={busy || clearing} onClick={() => {
        setText(starter.text);
        requestAnimationFrame(() => {
          input.current?.focus();
          const start = starter.text.indexOf('[');
          if ('topic' in starter && start >= 0) input.current?.setSelectionRange(start, starter.text.indexOf(']') + 1);
          else input.current?.setSelectionRange(starter.text.length, starter.text.length);
        });
        if ('photo' in starter && photos.length < 4) fileInput.current?.click();
      }}><starter.icon size={15} className="shrink-0"/>{starter.label}</Button>)}
    </div>
    <PromptInput onSubmit={() => { const value = text.trim() || (photos.length ? 'Please look at this photo.' : ''); if (!value || busy || clearing) return; clearError(); setNotice(''); setText(''); const files = photos; setPhotos([]); void sendMessage({ text: value, files }); input.current?.focus(); }}>
      <PromptInputTextarea ref={input} value={text} onChange={e => setText(e.target.value)} maxLength={4000} placeholder="Ask a question, or add a photo of your outfit, a review, or an email…" aria-label="Your question" className="min-h-24 text-base"/>
      {photos.length > 0 && <div className="flex flex-wrap gap-2 p-2">{photos.map((p, i) => <div key={i} className="relative"><img src={p.url} alt="Photo to send" className="h-20 w-20 rounded-md bg-muted object-contain"/><button type="button" aria-label="Remove photo" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow"><X size={12}/></button></div>)}</div>}
      <PromptInputFooter className="justify-end gap-2"><input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={e => void addPhotos(e.target.files)}/><Button variant="glass" size="sm" type="button" disabled={busy || photos.length >= 4} onClick={() => fileInput.current?.click()} aria-label="Add a photo"><Camera size={15}/>Photo</Button>{voice && <Button variant="glass" size="icon-sm" type="button" title={listening ? 'Stop voice input' : 'Speak your question'} aria-label={listening ? 'Stop voice input' : 'Speak your question'} aria-pressed={listening} onClick={toggleVoice}>{listening ? <MicOff/> : <Mic/>}</Button>}<PromptInputSubmit status={status} onStop={() => void stop()} disabled={clearing || (!busy && !text.trim() && !photos.length)} title={busy ? 'Stop writing' : 'Send question'} aria-label={busy ? 'Stop writing' : 'Send request'}/></PromptInputFooter>
    </PromptInput>
  </section>;
}