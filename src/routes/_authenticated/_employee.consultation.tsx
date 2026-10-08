import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { appHead } from '@/lib/app-meta';
import { tools } from '@/components/sanctuary/tools';
import { ConsultationChat } from '@/components/sanctuary/consultation-chat';

export const Route = createFileRoute('/_authenticated/_employee/consultation')({
  head: () => appHead('Consultation Calculator', 'Approved consultation pricing and recommendations for Sanctuary employees.'),
  component: Consultation,
});

function Consultation() {
  const tool = tools[0]!;
  return <>
    <Link to="/tools" className="back-link"><ArrowLeft size={15}/>All tools</Link>
    <div className="page-heading"><span className={`tool-icon ${tool.tone}`}><tool.icon size={19}/></span><h1>{tool.title}</h1></div>
    <ConsultationChat/>
  </>;
}
