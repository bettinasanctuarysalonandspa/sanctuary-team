import { createFileRoute, Link } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { ArrowLeft } from 'lucide-react';
import { SupportChat } from '@/components/sanctuary/support-chat';
import { listSupportMessages } from '@/lib/support.functions';
export const Route = createFileRoute('/_authenticated/_employee/emergency-help')({ loader: () => listSupportMessages(), head: () => appHead('Sanctuary Emergency Support', 'Help with client situations, salon procedures, and problem-solving.'), component: Guidance });
function Guidance() { const messages = Route.useLoaderData(); return <><Link to="/tools" className="back-link"><ArrowLeft size={15}/>All tools</Link><div className="page-heading"><h1>Sanctuary Emergency Support</h1><p>Help with client situations, salon procedures, and problem-solving.</p></div><SupportChat initialMessages={messages}/></>; }
