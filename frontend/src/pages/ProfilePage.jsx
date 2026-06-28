import { useSelector } from 'react-redux';
import { User, Mail, Calendar, BarChart2, MessageSquare, Image, Zap } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useSelector(s => s.auth);
  const stats = [
    { icon: MessageSquare, label: 'Messages This Month', value: user?.usage?.messagesThisMonth || 0, color: 'text-brand-400' },
    { icon: Image, label: 'Images Generated', value: user?.usage?.imagesThisMonth || 0, color: 'text-purple-400' },
    { icon: Zap, label: 'Tokens Used', value: (user?.usage?.tokensThisMonth || 0).toLocaleString(), color: 'text-yellow-400' },
  ];
  return (
    <div className="flex flex-col h-full bg-dark-900">
      <div className="px-6 py-4 border-b border-white/5 bg-dark-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-600/20 rounded-xl"><User size={18} className="text-brand-400" /></div>
          <h1 className="text-lg font-semibold text-white">Profile</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center text-3xl font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user?.name}</h2>
              <p className="text-gray-400 flex items-center gap-2"><Mail size={13} />{user?.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${user?.plan === 'free' ? 'bg-gray-600/30 text-gray-400' : 'bg-brand-600/30 text-brand-400'}`}>{user?.plan} Plan</span>
                {user?.isEmailVerified && <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">✓ Verified</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="card text-center">
                <Icon size={20} className={`${color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Account Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-gray-400 flex items-center gap-2"><Calendar size={13} />Member since</span>
                <span className="text-white">{new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-400">Auth provider</span>
                <span className="text-white capitalize">{user?.oauth?.provider || 'local'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
