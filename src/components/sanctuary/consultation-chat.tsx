import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mic, MicOff, RotateCcw, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearConsultation, listConsultationMessages, sendConsultationMessage } from '@/lib/consultation.functions';

type Msg = { id: number | string; role: string; content: string };
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

const KEY = ['private', 'consultation-messages'];

export function ConsultationChat() {
  const list = useServerFn(listConsultationMessages);
  const send = useServerFn(sendConsultationMessage);
  const clear = useServerFn(clearConsultation);
  const qc = useQueryClient();
  const messages = useQuery({ queryKey: KEY, queryFn: () => list() });
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const w = window as unknown as Record<string, unknown>; setVoice(Boolean(w['SpeechRecognition'] || w['webkitSpeechRecognition'])); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.data?.length, pending]);

  async function submit(value = text) {
    const t = value.trim();
    if (!t || pending) return;
    setPending(t); setText(''); setError('');
    try { await send({ data: { text: t } }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); setText(t); }
    finally { await qc.invalidateQueries({ queryKey: KEY }); setPending(null); }
  }

  function toggleVoice() {
    if (listening) { recRef.current?.stop(); return; }
    const w = window as unknown as Record<string, new () => Recognition>;
    const Ctor = w['SpeechRecognition'] || w['webkitSpeechRecognition'];
    if (!Ctor) return;
    const rec = new Ctor(); rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = false;
    rec.onresult = e => { const said = Array.from(e.results).map(r => r[0]?.transcript ?? '').join(' '); setText(prev => (prev ? prev + ' ' : '') + said); };
    rec.onend = () => setListening(false); rec.onerror = () => setListening(false);
    recRef.current = rec; setListening(true); rec.start();
  }

  async function startOver() {
    if (pending) return;
    await clear(); await qc.invalidateQueries({ queryKey: KEY });
  }

  const shown: Msg[] = [...(messages.data ?? []), ...(pending ? [{ id: 'pending', role: 'user', content: pending }] : [])];

  return (
    <section className="flex flex-col gap-4" aria-label="Consultation chat">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Ask in everyday words, like "Full balayage with Ava, plus the Keratin shampoo."</p>
        {shown.length > 0 && <Button variant="glass" size="sm" onClick={() => void startOver()} disabled={!!pending}><RotateCcw size={15}/>New consultation</Button>}
      </div>
      <div className="flex min-h-[40vh] flex-col gap-3 rounded-2xl border border-input bg-card/60 p-4 backdrop-blur" aria-live="polite">
        {messages.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading…</p>
          : shown.length === 0 ? <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">Start by telling me which stylist and what the client would like.</p>
          : shown.map(m => (
            <div key={m.id} className={m.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground' : 'mr-auto max-w-[92%] rounded-2xl bg-background px-4 py-3 text-foreground shadow-sm'}>
              {m.role === 'user' ? <p className="whitespace-pre-wrap break-words">{m.content}</p>
                : <div className="prose prose-sm max-w-none break-words [&_li]:my-0.5 [&_p]:my-1.5 [&_table]:text-sm [&_ul]:my-1.5"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>}
            </div>
          ))}
        {pending && <p role="status" className="mr-auto text-sm text-muted-foreground">Thinking…</p>}
        <div ref={endRef}/>
      </div>
      {error && <p className="form-message" role="alert">{error}</p>}
      <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); } }}
          rows={2} maxLength={4000} placeholder="Type your question…" aria-label="Your question"
          className="min-h-[52px] flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"/>
        {voice && <Button type="button" variant="glass" size="icon" onClick={toggleVoice} aria-label={listening ? 'Stop voice input' : 'Speak your question'} aria-pressed={listening}>{listening ? <MicOff size={18}/> : <Mic size={18}/>}</Button>}
        <Button type="submit" size="icon" disabled={!text.trim() || !!pending} aria-label="Send"><SendHorizontal size={18}/></Button>
      </form>
    </section>
  );
}
