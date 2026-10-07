import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
export const getEmployeeAccess = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
 const { data: roles, error } = await context.supabase.from('user_roles').select('role').eq('user_id', context.userId);
 if (error) throw new Error('Employee access could not be checked. Please try again.');
 const admin = roles?.some(row => row.role === 'admin') ?? false;
 const employee = admin || (roles?.some(row => row.role === 'employee') ?? false);
 return { admin, employee };
});
