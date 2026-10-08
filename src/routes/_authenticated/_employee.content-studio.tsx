import { createFileRoute, Link } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { ArrowLeft } from 'lucide-react';
import { ContentStudioChat } from '@/components/sanctuary/content-studio-chat';
import { listStudioMessages } from '@/lib/content-studio.functions';
export const Route = createFileRoute('/_authenticated/_employee/content-studio')({ loader: () => listStudioMessages(), head: () => appHead('Content Studio', 'Sanctuary’s private captions, scripts, and client education workspace.'), component: Studio });
function Studio() { const messages = Route.useLoaderData(); return <><Link to="/tools" className="back-link"><ArrowLeft size={15}/>All tools</Link><div className="page-heading"><h1>Content Studio</h1></div><ContentStudioChat initialMessages={messages}/></>; }
