import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai';
import { useServerFn } from '@tanstack/react-start';
import { Copy, ImagePlus, Mic, MicOff, RotateCcw, Video, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearStudioMessages } from '@/lib/content-studio.functions';
import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse, MessageAction } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';

type Recognition = { lang: string; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

const STARTERS = [
  'Create a post',
  'Create a caption for my video',
  'Create a caption for my photos',
  'Write a Reel script',
];

function canvasPart(src: CanvasImageSource, w: number, h: number, name: string): FileUIPart {
  const scale = Math.min(1, 1400 / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const ctx = c.getContext('2d'); if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return { type: 'file', mediaType: 'image/jpeg', url: c.toDataURL('image/jpeg', 0.8), filename: name };
}
async function photoPart(file: File): Promise<FileUIPart> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const el = new Image(); el.onload = () => res(el); el.onerror = () => rej(new Error('unreadable')); el.src = url; });
    return canvasPart(img, img.naturalWidth, img.naturalHeight, file.name);
  } finally { URL.revokeObjectURL(url); }
}
/** The studio "watches" a video by looking at evenly spaced still frames. */
async function videoParts(file: File, count = 6): Promise<FileUIPart[]> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  try {
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('unreadable video')); setTimeout(() => rej(new Error('timeout')), 15000); });
    const d = isFinite(v.duration) && v.duration > 0 ? v.duration : 1;
    const out: FileUIPart[] = [];
    for (let i = 0; i < count; i++) {
      v.currentTime = Math.min(d - 0.05, (d * (i + 0.5)) / count);
      await new Promise<void>(res => { v.onseeked = () => res(); setTimeout(res, 3000); });
      out.push(canvasPart(v, v.videoWidth, v.videoHeight, `${file.name} frame ${i + 1}`));
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

export function ContentStudioChat({ initialMessages }: { initialMessages: UIMessage[] }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/content-studio', headers: async () => { const { data } = await supabase.auth.getSession(); return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}; }, prepareSendMessagesRequest: ({ messages, headers }) => ({ ...(headers ? { headers } : {}), body: { messages: messages.slice(-1).map(m => ({ id: m.id, role: m.role, parts: m.parts.filter(p => p.type === 'text' || p.type === 'file') })) } }) }), []);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({ messages: initialMessages, transport });
  const clear = useServerFn(clearStudioMessages);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState('');
  const [clearing, setClearing] = useState(false);
  const [media, setMedia] = useState<{ kind: 'photo' | 'video'; parts: FileUIPart[] }[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
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
  async function addMedia(files: FileList | null, kind: 'photo' | 'video') {
    if (!files?.length) return;
    setLoadingMedia(true); setNotice('');
    const list = Array.from(files).slice(0, kind === 'video' ? 1 : 8);
    const results = await Promise.allSettled(list.map(f => kind === 'video' ? videoParts(f) : photoPart(f).then(p => [p])));
    const ok = results.flatMap(r => r.status === 'fulfilled' ? [{ kind, parts: r.value }] : []);
    setMedia(m => [...m, ...ok].slice(0, 8));
    if (ok.length < results.length) setNotice(kind === 'video' ? 'That video could not be opened. Try a shorter clip or a screen recording.' : 'A photo could not be opened — try a screenshot of it instead.');
    setLoadingMedia(false);
    if (photoInput.current) photoInput.current.value = '';
    if (videoInput.current) videoInput.current.value = '';
  }
  function send(value: string) {
    const files = media.flatMap(m => m.parts).slice(0, 12);
    if ((!value && !files.length) || busy || clearing || loadingMedia) return;
    const hasVideo = media.some(m => m.kind === 'video');
    const fallback = hasVideo ? 'Here is my video. Watch it and create a post with a caption in the Sanctuary voice using a hook, three secrets, and an offer/CTA.' : 'Here are my photos. Create a post with a caption in the Sanctuary voice using a hook, three secrets, and an offer/CTA.';
    const note = files.length ? (hasVideo ? ' [Video shared as still frames in order]' : '') : '';
    clearError(); setNotice(''); setText(''); setMedia([]);
    void sendMessage({ text: (value || fallback) + note, files });
    input.current?.focus();
  }
  async function reset() { setClearing(true); try { await clear(); setMessages([]); clearError(); setNotice(''); } catch (e) { setNotice(e instanceof Error ? e.message : 'The conversation could not be cleared.'); } finally { setClearing(false); input.current?.focus(); } }
  let errorText = error?.message ?? '';
  try { errorText = JSON.parse(errorText).message ?? errorText; } catch { /* plain message */ }
  return <section aria-label="Content Studio chat" className="flex flex-col gap-4">
    <div className="flex min-h-9 justify-end">{messages.length > 0 && <Button variant="glass" size="sm" onClick={() => void reset()} disabled={busy || clearing}><RotateCcw size={15}/>New conversation</Button>}</div>
    <Conversation className="h-[52vh] min-h-80 flex-none rounded-lg border border-input bg-card/60 backdrop-blur">
      <ConversationContent className="gap-5">
        {messages.length === 0 && <ConversationEmptyState><div className="grid gap-3 text-center"><span className="brand-mark mx-auto" aria-hidden="true">S</span><p className="text-sm text-muted-foreground">Add a photo or video, or start with:</p><div className="flex flex-wrap justify-center gap-2">{STARTERS.map(s => <Button key={s} variant="glass" size="sm" type="button" onClick={() => { if (s.includes('video')) videoInput.current?.click(); else if (s.includes('photos')) photoInput.current?.click(); else send(s); }}>{s}</Button>)}</div></div></ConversationEmptyState>}
        {messages.map(m => <Message key={m.id} from={m.role}><MessageContent className={m.role === 'user' ? 'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground break-words' : 'break-words'}>{m.parts.map((p, i) => p.type === 'text' ? <MessageResponse key={i}>{p.text}</MessageResponse> : p.type === 'file' && p.url ? <img key={i} src={p.url} alt="Shared media" className="mt-1 h-20 w-20 rounded-md object-cover"/> : null)}</MessageContent>{m.role === 'assistant' && !busy && <MessageAction tooltip="Copy content" label="Copy content" onClick={() => void navigator.clipboard.writeText(m.parts.filter(p => p.type === 'text').map(p => p.text).join('\n')).catch(() => setNotice('Content could not be copied.'))}><Copy size={15}/></MessageAction>}</Message>)}
        {busy && <Shimmer>Writing…</Shimmer>}
      </ConversationContent><ConversationScrollButton/>
    </Conversation>
    {(errorText || notice) && <p role="alert" className="form-message">{errorText || notice}</p>}
    {(media.length > 0 || loadingMedia) && <div className="flex flex-wrap items-center gap-2">{media.map((m, i) => <div key={i} className="relative"><img src={m.parts[0]?.url} alt={m.kind === 'video' ? 'Video to send' : 'Photo to send'} className="h-16 w-16 rounded-md object-cover"/>{m.kind === 'video' && <Video size={14} className="absolute bottom-1 left-1 text-primary-foreground"/>}<button type="button" aria-label="Remove" className="absolute -right-2 -top-2 rounded-full bg-card p-0.5 shadow" onClick={() => setMedia(ms => ms.filter((_, j) => j !== i))}><X size={13}/></button></div>)}{loadingMedia && <Shimmer>Opening…</Shimmer>}</div>}
    <input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={e => void addMedia(e.target.files, 'photo')}/>
    <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={e => void addMedia(e.target.files, 'video')}/>
    <PromptInput onSubmit={() => send(text.trim())}>
      <PromptInputTextarea ref={input} value={text} onChange={e => setText(e.target.value)} maxLength={4000} placeholder="What would you like to create?" aria-label="Your content request" className="min-h-24 text-base"/>
      <PromptInputFooter className="justify-end gap-2"><Button variant="glass" size="icon-sm" type="button" title="Add photos" aria-label="Add photos" onClick={() => photoInput.current?.click()} disabled={busy || loadingMedia}><ImagePlus/></Button><Button variant="glass" size="icon-sm" type="button" title="Add a video" aria-label="Add a video" onClick={() => videoInput.current?.click()} disabled={busy || loadingMedia}><Video/></Button>{voice && <Button variant="glass" size="icon-sm" type="button" title={listening ? 'Stop voice input' : 'Speak your request'} aria-label={listening ? 'Stop voice input' : 'Speak your request'} aria-pressed={listening} onClick={toggleVoice}>{listening ? <MicOff/> : <Mic/>}</Button>}<PromptInputSubmit status={status} onStop={() => void stop()} disabled={clearing || loadingMedia || (!busy && !text.trim() && !media.length)} title={busy ? 'Stop writing' : 'Send request'} aria-label={busy ? 'Stop writing' : 'Send request'}/></PromptInputFooter>
    </PromptInput>
  </section>;
}