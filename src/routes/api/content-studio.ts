import { createFileRoute } from '@tanstack/react-router';
import { handleStudioChat } from '@/lib/content-studio/chat.server';
export const Route = createFileRoute('/api/content-studio')({ server: { handlers: { POST: ({ request }) => handleStudioChat(request) } } });