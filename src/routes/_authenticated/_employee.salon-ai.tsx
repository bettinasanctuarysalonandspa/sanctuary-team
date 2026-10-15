import { createFileRoute, Link } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { ArrowLeft } from 'lucide-react';
import { GuidanceChat } from '@/components/sanctuary/guidance-chat';
import { listGuidanceMessages } from '@/lib/guidance.functions';
export const Route = createFileRoute('/_authenticated/_employee/salon-ai')({ loader: () => listGuidanceMessages(), head: () => appHead('Sanctuary Handbook and Guidance', 'Your resource for policies, procedures, communication, and professional growth.'), component: Guidance });
function Guidance() { const messages = Route.useLoaderData(); return <><Link to="/tools" className="back-link"><ArrowLeft size={15}/>All tools</Link><div className="page-heading"><h1>Sanctuary Handbook and Guidance</h1><p>Your resource for policies, procedures, communication, and professional growth.</p></div><GuidanceChat initialMessages={messages}/></>; }
