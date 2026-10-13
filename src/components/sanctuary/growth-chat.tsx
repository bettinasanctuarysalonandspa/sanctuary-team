import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai';
import { useServerFn } from '@tanstack/react-start';
import { useRouter } from '@tanstack/react-router';
import { Camera, Mic, MicOff, RotateCcw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearGrowthMessages } from '@/lib/growth.functions';
import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';

type Recognition = { lang: string; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

/** Shrinks a phone photo to a readable JPEG so uploads stay fast. */
async function toImagePart(file: File): Promise<FileUIPart> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { type: 'file', mediaType: 'image/jpeg', url: canvas.toDataURL('image/jpeg', 0.85), filename: file.name };
}

export function GrowthChat({ initialMessages, starters }: { initialMessages: UIMessage[]; starters: string[] }) {
  const router = useRouter();
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/growth', headers: async () => { const { data } = await supabase.auth.getSession(); return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}; }, prepareSendMessagesRequest: ({ messages, headers }) => ({ ...(headers ? { headers } : {}), body: { messages: messages.slice(-1).map(m => ({ id: m.id, role: m.role, parts: m.parts.filter(p => p.type === 'text' || p.type === 'file') })) } }) }), []);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({ messages: initialMessages, transport, onFinish: () => { void router.invalidate(); } });
  const clear = useServerFn(clearGrowthMessages);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<FileUIPart[]>([]);
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState('');
  const rec = useRef<Recognition | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = status === 'submitted' || status === 'streaming';
  useEffect(() => { const w = window as unknown as Record<string, unknown>; setVoice(Boolean(w['SpeechRecognition'] || w['webkitSpeechRecognition'])); return () => rec.current?.stop(); }, []);
  function toggleVoice() {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as Record<string, new () => Recognition>;
    const Ctor = w['SpeechRecognition'] || w['webkitSpeechRecognition'];
    if (!Ctor) return;
    const r = new Ctor(); r.lang = 'en-US';
    r.onresult = e => setText(prev => [prev, Array.from(e.results).map(v => v[0]?.transcript ?? '').join(' ')].filter(Boolean).join(' ').slice(0, 4000));
    r.onend = () => setListening(false); r.onerror = () => { setListening(false); setNotice('Voice input is unavailable. Please type instead.'); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setNotice('Voice input is unavailable. Please type instead.'); }
  }
  async function addPhotos(files: FileList | null) {
    if (!files) return;
    try { const parts = await Promise.all(Array.from(files).slice(0, 4).map(toImagePart)); setPhotos(p => [...p, ...parts].slice(0, 4)); }
    catch { setNotice('That photo could not be opened. Try a screenshot or a JPEG photo.'); }
    if (fileInput.current) fileInput.current.value = '';
  }
  function send(value: string) {
    if ((!value && !photos.length) || busy) return;
    clearError(); setNotice(''); setText('');
    void sendMessage({ text: value || 'Here is a photo of my form / numbers.', files: photos });
    setPhotos([]);
  }
  async function reset() { try { await clear(); setMessages([]); clearError(); } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not start over.'); } }
  let errorText = error?.message ?? '';
  try { errorText = JSON.parse(errorText).message ?? errorText; } catch { /* plain */ }
  return <section aria-label="Growth Coach chat" className="flex flex-col gap-4">
    <div className="flex min-h-9 justify-end">{messages.length > 0 && <Button variant="glass" size="sm" onClick={() => void reset()} disabled={busy}><RotateCcw size={15}/>New conversation</Button>}</div>
    <Conversation className="h-[52vh] min-h-80 flex-none rounded-lg border border-input bg-card/60 backdrop-blur">
      <ConversationContent className="gap-5">
        {messages.length === 0 && <ConversationEmptyState><div className="grid gap-3 text-center"><span className="brand-mark mx-auto" aria-hidden="true">S</span><p className="text-sm text-muted-foreground">Your coach remembers your progress. Start with:</p><div className="flex flex-wrap justify-center gap-2">{starters.map(s => <Button key={s} variant="glass" size="sm" onClick={() => send(s)}>{s}</Button>)}</div></div></ConversationEmptyState>}
        {messages.map(m => <Message key={m.id} from={m.role}><MessageContent className={m.role === 'user' ? 'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground break-words' : 'break-words'}>
          {m.parts.map((p, i) => p.type === 'text' ? <MessageResponse key={i}>{p.text}</MessageResponse> : p.type === 'file' && p.mediaType.startsWith('image/') ? <img key={i} src={p.url} alt="Shared photo" className="max-h-48 rounded-md"/> : null)}
        </MessageContent></Message>)}
        {busy && <Shimmer>Thinking…</Shimmer>}
      </ConversationContent><ConversationScrollButton/>
    </Conversation>
    {(errorText || notice) && <p role="alert" className="form-message">{errorText || notice}</p>}
    {photos.length > 0 && <div className="flex flex-wrap gap-2">{photos.map((p, i) => <div key={i} className="relative"><img src={p.url} alt="Photo to send" className="h-16 w-16 rounded-md object-cover"/><button type="button" aria-label="Remove photo" className="absolute -right-2 -top-2 rounded-full bg-card p-0.5 shadow" onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}><X size={13}/></button></div>)}</div>}
    <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={e => void addPhotos(e.target.files)}/>
    <PromptInput onSubmit={() => send(text.trim())}>
      <PromptInputTextarea value={text} onChange={e => setText(e.target.value)} maxLength={4000} placeholder="Share your week, ask for coaching, or send a photo of your numbers…" aria-label="Your message" className="min-h-24 text-base"/>
      <PromptInputFooter className="justify-end gap-2">
        <Button variant="glass" size="icon-sm" type="button" title="Send a photo or screenshot" aria-label="Send a photo or screenshot" onClick={() => fileInput.current?.click()}><Camera/></Button>
        {voice && <Button variant="glass" size="icon-sm" type="button" aria-label={listening ? 'Stop voice input' : 'Speak'} aria-pressed={listening} onClick={toggleVoice}>{listening ? <MicOff/> : <Mic/>}</Button>}
        <PromptInputSubmit status={status} onStop={() => void stop()} disabled={!busy && !text.trim() && !photos.length}/>
      </PromptInputFooter>
    </PromptInput>
  </section>;
}
