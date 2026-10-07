import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listEmployees = createServerFn({ method: 'GET' })
 .middleware([requireSupabaseAuth])
 .handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('list_sanctuary_employees');
  if (error) throw new Error('Employee access could not be loaded. Owner access is required.');
  return data;
 });

export const revokeEmployee = createServerFn({ method: 'POST' })
 .middleware([requireSupabaseAuth])
 .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
 .handler(async ({ data, context }) => {
  // This transaction independently validates the current owner session and
  // excludes all owner accounts before revoking the employee's membership.
  const { error } = await context.supabase.rpc('revoke_sanctuary_employee', { target_user_id: data.userId });
  if (error) throw new Error('Access could not be revoked. Refresh and try again.');
  // App access is already blocked for every token, even if the Auth service
  // is temporarily unavailable. A ban also stops future login/token refresh.
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: '876000h' });
  return { blocked: true, authBlocked: !banError };
 });