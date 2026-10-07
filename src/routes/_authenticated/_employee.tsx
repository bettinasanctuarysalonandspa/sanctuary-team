import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getEmployeeAccess } from '@/lib/access.functions';
import { supabase } from '@/integrations/supabase/client';
export const Route = createFileRoute('/_authenticated/_employee')({
 beforeLoad: async () => { const access = await getEmployeeAccess(); if (!access.valid) { await supabase.auth.signOut({ scope: 'local' }); throw redirect({ to: '/auth' }); } if (!access.employee) throw redirect({ to: '/access-pending' }); return { access }; },
 component: () => <Outlet/>,
});
