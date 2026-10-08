import { createFileRoute } from '@tanstack/react-router';
import { handleGuidanceChat } from '@/lib/guidance/chat.server';
export const Route = createFileRoute('/api/guidance')({ server: { handlers: { POST: ({ request }) => handleGuidanceChat(request) } } });