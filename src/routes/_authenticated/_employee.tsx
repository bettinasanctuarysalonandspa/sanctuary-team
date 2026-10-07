import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getEmployeeAccess } from '@/lib/access.functions';
export const Route = createFileRoute('/_authenticated/_employee')({
 beforeLoad: async () => { const access = await getEmployeeAccess(); if (!access.employee) throw redirect({ to: '/access-pending' }); return { access }; },
 component: () => <Outlet/>,
});
