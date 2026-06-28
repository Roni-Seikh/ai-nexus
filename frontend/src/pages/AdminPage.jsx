import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { Shield, Users, MessageSquare, DollarSign, RefreshCw } from 'lucide-react';
import api from '@/services/api';

export default function AdminPage() {
  const { user } = useSelector(s => s.auth);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'admin') return <Navigate to="/chat" replace />;

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats').then(r => setStats(r.data.data)),
      api.get('/admin/users?limit=10').then(r => setUsers(r.data.data.users)),
    ]).finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'text-blue-400', bg: 'bg-blue-600/20' },
    { icon: MessageSquare, label: 'Total Chats', value: stats.totalChats, color: 'text-green-400', bg: 'bg-green-600/20' },
    { icon: DollarSign, label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, color: 'text-yellow-400', bg: 'bg-yellow-600/20' },
  ] : [];

  return (
    <div className="flex flex-col h-full bg-dark-900">
      <div className="px-6 py-4 border-b border-white/5 bg-dark-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 rounded-xl"><Shield size={18} className="text-red-400" /></div>
          <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {loading ? <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_,i) => <div key={i} className="card shimmer h-24" />)}</div> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statCards.map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="card flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${bg}`}><Icon size={20} className={color} /></div>
                  <div><p className="text-2xl font-bold text-white">{value}</p><p className="text-sm text-gray-400">{label}</p></div>
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <h2 className="font-semibold text-white mb-4">Recent Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/5">{['Name','Email','Plan','Joined'].map(h => <th key={h} className="text-left py-2 px-3 text-gray-400 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-white/5 hover:bg-white/2">
                      <td className="py-3 px-3 text-white">{u.name}</td>
                      <td className="py-3 px-3 text-gray-400">{u.email}</td>
                      <td className="py-3 px-3"><span className={`capitalize text-xs px-2 py-1 rounded-full ${u.plan === 'free' ? 'bg-gray-600/30 text-gray-400' : 'bg-brand-600/30 text-brand-400'}`}>{u.plan}</span></td>
                      <td className="py-3 px-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
