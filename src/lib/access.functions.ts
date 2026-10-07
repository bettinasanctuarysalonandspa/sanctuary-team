import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const getEmployeeAccess = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
 const { data: valid, error: sessionError } = await context.supabase.rpc('sanctuary_session_valid');
 if (sessionError) throw new Error('Your session could not be verified. Please try again.');
 if (!valid) return { admin: false, employee: false, valid: false };
 const { data: roles, error } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId);
 if (error) throw new Error('Employee access could not be checked. Please try again.');
 const admin = roles?.some(row => row.role === 'admin') ?? false;
 const employee = admin || (roles?.some(row => row.role === 'employee') ?? false);
 return { admin, employee, valid: true };
});
