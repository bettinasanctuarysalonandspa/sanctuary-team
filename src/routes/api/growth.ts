import { createFileRoute } from '@tanstack/react-router';
import { handleGrowthChat } from '@/lib/growth/chat.server';
export const Route = createFileRoute('/api/growth')({ server: { handlers: { POST: ({ request }) => handleGrowthChat(request) } } });
