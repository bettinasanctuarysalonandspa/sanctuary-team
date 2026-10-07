import { createFileRoute, redirect } from '@tanstack/react-router';
import { appHead } from '@/lib/app-meta';
import { tools } from '@/components/sanctuary/tools';
export const Route = createFileRoute('/_authenticated/_employee/admin')({ beforeLoad: ({ context }) => { if (!context.access.admin) throw redirect({ to: '/access-pending' }); }, head: () => appHead('Owner administration', 'The restricted owner workspace for Sanctuary approved information.'), component: Admin });
function Admin() { return <><div className="page-heading"><p className="eyebrow">OWNER ADMINISTRATION</p><h1>Approved information</h1><p>No salon information has been added yet. Information management will be built with each tool, step by step.</p></div>{tools.map(tool => <div className="admin-row" key={tool.path}><span className={`tool-icon ${tool.tone}`}><tool.icon size={19}/></span><div><h2>{tool.title}</h2><p>No approved information</p></div><span className="status">Not configured</span></div>)}</>; }
