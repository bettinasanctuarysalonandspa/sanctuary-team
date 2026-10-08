import { createFileRoute } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { ToolPage } from '@/components/sanctuary/tool-page';
export const Route = createFileRoute('/_authenticated/_employee/content-studio')({ head: () => appHead('Content Studio', 'Sanctuary’s private captions, scripts, and client education workspace.'), component: () => <ToolPage index={3}/> });
