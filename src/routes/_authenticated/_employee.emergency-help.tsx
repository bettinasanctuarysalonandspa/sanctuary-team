import { createFileRoute } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { ToolPage } from '@/components/sanctuary/tool-page';
export const Route = createFileRoute('/_authenticated/_employee/emergency-help')({ head: () => appHead('Sanctuary Emergency Help', 'Approved client-concern and escalation guidance for Sanctuary employees.'), component: () => <ToolPage index={1}/> });
