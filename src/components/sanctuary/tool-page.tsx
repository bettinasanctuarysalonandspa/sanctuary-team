import { Link } from '@tanstack/react-router';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tools } from './tools';
export function ToolPage({ index }: { index: number }) {
 const tool = tools[index]; if (!tool) return null;
 return <><Link to="/tools" className="back-link"><ArrowLeft size={15}/>All tools</Link><div className="page-heading"><span className={`tool-icon ${tool.tone}`}><tool.icon size={19}/></span><h1>{tool.title}</h1><p>{tool.description}</p></div><section className="empty-state"><span className={`tool-icon ${tool.tone}`}><LockKeyhole size={23} strokeWidth={1.3}/></span><h2>{tool.empty}</h2><p>{tool.detail}</p><span className="status">Awaiting approved information</span><div className="mt-6"><Button variant="glass" asChild><Link to="/">Back to home</Link></Button></div></section></>;
}
