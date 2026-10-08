import { createFileRoute } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { ToolPage } from '@/components/sanctuary/tool-page';
export const Route = createFileRoute('/_authenticated/_employee/salon-ai')({ head: () => appHead('Sanctuary Guidance', 'Your resource for policies, procedures, communication, and professional growth.'), component: () => <ToolPage index={2}/> });
