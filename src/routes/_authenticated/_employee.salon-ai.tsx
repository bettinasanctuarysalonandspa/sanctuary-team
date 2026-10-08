import { createFileRoute } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { ToolPage } from '@/components/sanctuary/tool-page';
export const Route = createFileRoute('/_authenticated/_employee/salon-ai')({ head: () => appHead('Sanctuary Handbook', 'The approved education and hospitality library for Sanctuary Salon & Spa.'), component: () => <ToolPage index={2}/> });
