import { createFileRoute } from '@tanstack/react-router';
import { handleSupportChat } from '@/lib/support/chat.server';
export const Route = createFileRoute('/api/support')({ server: { handlers: { POST: ({ request }) => handleSupportChat(request) } } });