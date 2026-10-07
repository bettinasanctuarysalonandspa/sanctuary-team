import { createFileRoute } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { ToolPage } from '@/components/sanctuary/tool-page';
export const Route = createFileRoute('/_authenticated/_employee/consultation')({ head: () => appHead('Consultation Calculator', 'Approved consultation pricing and recommendations for Sanctuary employees.'), component: () => <ToolPage index={0}/> });
