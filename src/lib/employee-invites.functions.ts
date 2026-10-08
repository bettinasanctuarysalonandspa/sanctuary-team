import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const inviteSchema = z.object({
  name: z.string().trim().min(1, 'Enter the person’s name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

async function requireOwner(context: { supabase: { rpc: (...args: any[]) => any }; userId: string }) {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || data !== true) throw new Error('Owner access is required to manage team accounts.');
}

// Loaded inside the handler so the server-only request helper never enters the
// browser bundle.
async function appOrigin() {
  try {
    const { getRequest } = await import('@tanstack/react-start/server');
    const url = getRequest()?.url;
    if (url) return new URL(url).origin;
  } catch {
    /* fall through */
  }
  return undefined;
}

/** Creates the account, grants employee access, and emails the private invitation link. */
export const inviteEmployee = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const existing = await context.supabase
      .from('employee_invitations')
      .select('id, status')
      .eq('email', data.email)
      .maybeSingle();
    if (existing.error) throw new Error('Team accounts could not be checked. Please try again.');
    if (existing.data && existing.data.status !== 'revoked') {
      throw new Error('An invitation is already waiting for this email. Use Send invitation again to resend it.');
    }

    // Record the approval first, so accepting the link always grants access even
    // if the account step below is interrupted.
    const record = await context.supabase
      .from('employee_invitations')
      .upsert(
        { email: data.email, display_name: data.name, status: 'pending', invited_by: context.userId, accepted_at: null },
        { onConflict: 'email' },
      )
      .select('id')
      .single();
    if (record.error) throw new Error('The invitation could not be recorded. Please try again.');

    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${appOrigin() ?? ''}/set-password`,
      data: { full_name: data.name },
    });
    if (error) {
      await context.supabase.from('employee_invitations').delete().eq('id', record.data.id);
      throw new Error('The invitation could not be sent. Check the email address and try again.');
    }

    // Privileged by definition: only an owner reached this point, and the role is
    // hardcoded to employee — an invitation can never grant owner access.
    if (invited.user) {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({ user_id: invited.user.id, role: 'employee' });
      if (roleError) throw new Error('The invitation was sent, but access could not be granted. Please try again.');
      await context.supabase.from('employee_invitations').update({ user_id: invited.user.id }).eq('id', record.data.id);
    }
    return { invited: true };
  });

/** Re-sends the private invitation link to an account that has not accepted yet. */
export const resendInvitation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().trim().toLowerCase().email() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${appOrigin() ?? ''}/set-password`,
    });
    if (error) throw new Error('The invitation could not be sent again. Please try again.');
    await context.supabase.from('employee_invitations').update({ updated_at: new Date().toISOString() }).eq('email', data.email);
    return { sent: true };
  });

/** Withdraws an invitation that has not been accepted. Never touches an active employee. */
export const removeInvitation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    const record = await context.supabase
      .from('employee_invitations')
      .select('id, status, user_id')
      .eq('id', data.id)
      .maybeSingle();
    if (record.error) throw new Error('The invitation could not be found. Please refresh and try again.');
    if (!record.data) throw new Error('That invitation is no longer here. Please refresh.');
    if (record.data.status === 'accepted') throw new Error('This person already joined the team. Use Revoke access instead.');
    await context.supabase.from('employee_invitations').delete().eq('id', data.id);
    return { removed: true };
  });

/** Pending and accepted invitations, owner only. */
export const listInvitations = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc('list_sanctuary_invitations');
    if (error) throw new Error('Invitations could not be loaded.');
    return data as Array<{ id: string; email: string; display_name: string; status: string; created_at: string; accepted_at: string | null }>;
  });

/** Called by the invited person's own session once they open their invitation link. */
export const acceptInvitation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc('accept_sanctuary_invitation');
    if (error) return { accepted: false };
    return { accepted: data === 'accepted' };
  });
