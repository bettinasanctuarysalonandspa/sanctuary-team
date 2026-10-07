import { createFileRoute } from '@tanstack/react-router';
import { ToolGrid } from '@/components/sanctuary/tools';
import { appHead } from '@/lib/app-meta';
export const Route = createFileRoute('/tools')({ head: () => appHead('Your tools', 'Four dedicated employee resources for Sanctuary Salon & Spa.'), component: () => <><div className="page-heading"><p className="eyebrow">SANCTUARY WORKSPACE</p><h1>Your tools</h1></div><ToolGrid/></> });
