import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import api from '@/services/api';
import MessageBubble from '@/components/chat/MessageBubble';

export default function SharedChatPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/chats/shared/${token}`).then(r => setData(r.data.data)).catch(e => setError(e.response?.data?.message || 'Not found')).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen bg-dark-900 flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center gap-4 text-gray-400"><MessageSquare size={40} className="opacity-30" /><p>{error}</p><Link to="/" className="btn-primary">Go Home</Link></div>;

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div><h1 className="text-xl font-bold text-white">{data?.chat?.title}</h1><p className="text-sm text-gray-400">{data?.messages?.length} messages</p></div>
          <Link to="/register" className="btn-primary text-sm">Try AI Nexus Free</Link>
        </div>
        <div className="space-y-6">
          {data?.messages?.map((msg, i) => <MessageBubble key={msg._id || i} message={msg} />)}
        </div>
      </div>
    </div>
  );
}
