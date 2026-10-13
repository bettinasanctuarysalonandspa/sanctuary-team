import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { getMyGrowth } from '@/lib/growth.functions';
import { GrowthChat } from '@/components/sanctuary/growth-chat';
import { GrowthProgress, ZoneList } from '@/components/sanctuary/growth-progress';

export const Route = createFileRoute('/_authenticated/_employee/growth')({ loader: () => getMyGrowth(), head: () => appHead('Sanctuary Growth', 'Your coach and progress tracker — weekly coaching, numbers, and level zones.'), component: Growth });

const tabs = ['Coach', 'My Progress', 'My Zone'] as const;
function Growth() {
  const { messages, growth } = Route.useLoaderData();
  const [tab, setTab] = useState<(typeof tabs)[number]>('Coach');
  const isAssociate = /associate/i.test(growth.level ?? '');
  const starters = growth.checkins.length ? ['Here’s how my week went', 'What should I focus on this week?', 'Check my zones'] : isAssociate ? ['I’m starting the Associate program', 'What’s this week’s focus?'] : ['Help me set my first goals', 'Here are my numbers this week'];
  return <>
    <Link to="/tools" className="back-link"><ArrowLeft size={15}/>All tools</Link>
    <div className="page-heading"><h1>Sanctuary Growth</h1><p>Your coach and KPI tracker. {growth.level ? <>Level: <strong>{growth.level}</strong>{growth.profile?.training_week ? ` · Week ${growth.profile.training_week} of 12` : ''}</> : 'Your level will appear once leadership adds you to the stylist list.'}</p></div>
    <div role="tablist" className="mb-4 flex gap-2">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm ${tab === t ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card/60'}`}>{t}</button>)}</div>
    {tab === 'Coach' && <GrowthChat initialMessages={messages} starters={starters}/>}
    {tab === 'My Progress' && <GrowthProgress growth={growth}/>}
    {tab === 'My Zone' && <ZoneList growth={growth}/>}
  </>;
}
