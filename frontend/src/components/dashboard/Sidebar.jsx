import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Plus, Search, Image, Bot, Globe,
  Settings, LogOut, Pin, Archive, Trash2, MoreHorizontal,
  Crown, Sparkles, PanelLeftClose, User
} from 'lucide-react';
import { fetchChats, createChat, deleteChat, updateChat } from '@/store/slices/chatSlice';
import { logout } from '@/store/slices/authSlice';
import { setSidebarOpen } from '@/store/slices/uiSlice';
import toast from 'react-hot-toast';

const NAV = [
  { icon: MessageSquare, label: 'Chat',   path: '/chat'   },
  { icon: Image,         label: 'Images', path: '/images' },
  { icon: Bot,           label: 'Agents', path: '/agents' },
  { icon: Globe,         label: 'Search', path: '/search' },
];

export default function Sidebar() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { id: activeId } = useParams();
  const { chats }  = useSelector(s => s.chat);
  const { user }   = useSelector(s => s.auth);
  const [search, setSearch]   = useState('');
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => { dispatch(fetchChats()); }, [dispatch]);

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setMenuOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const filtered = chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
  const pinned   = filtered.filter(c => c.isPinned && !c.isArchived);
  const recent   = filtered.filter(c => !c.isPinned && !c.isArchived);

  const newChat = async () => {
    const r = await dispatch(createChat({}));
    if (r.payload?.chat) navigate(`/chat/${r.payload.chat._id}`);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this chat?')) return;
    await dispatch(deleteChat(id));
    if (activeId === id) navigate('/chat');
    setMenuOpen(null);
    toast.success('Chat deleted');
  };

  const handlePin = async (e, chat) => {
    e.stopPropagation();
    await dispatch(updateChat({ id: chat._id, isPinned: !chat.isPinned }));
    setMenuOpen(null);
  };

  const handleArchive = async (e, chat) => {
    e.stopPropagation();
    await dispatch(updateChat({ id: chat._id, isArchived: !chat.isArchived }));
    setMenuOpen(null);
    toast.success(chat.isArchived ? 'Unarchived' : 'Archived');
  };

  const ChatItem = ({ chat }) => {
    const isActive = activeId === chat._id;
    return (
      <div onClick={() => navigate(`/chat/${chat._id}`)}
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm`}
        style={{
          backgroundColor: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          border: isActive ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
        <MessageSquare size={13} className="flex-shrink-0" />
        <span className="flex-1 truncate">{chat.title}</span>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === chat._id ? null : chat._id); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
          style={{ color: 'var(--text-faint)' }}>
          <MoreHorizontal size={13} />
        </button>

        {/* Context menu */}
        <AnimatePresence>
          {menuOpen === chat._id && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1 min-w-[150px]"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <button onClick={e => handlePin(e, chat)}
                className="flex items-center gap-2 px-3 py-2 text-xs w-full transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Pin size={11} />{chat.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button onClick={e => handleArchive(e, chat)}
                className="flex items-center gap-2 px-3 py-2 text-xs w-full transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Archive size={11} />Archive
              </button>
              <button onClick={e => handleDelete(e, chat._id)}
                className="flex items-center gap-2 px-3 py-2 text-xs w-full transition-colors text-red-400"
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Trash2 size={11} />Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const SectionLabel = ({ label }) => (
    <p className="text-xs uppercase tracking-wider px-3 py-1.5 font-medium"
      style={{ color: 'var(--text-faint)' }}>{label}</p>
  );

  return (
    <div className="w-64 h-full flex flex-col"
      style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>

      {/* Header */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold gradient-text cursor-pointer" onClick={() => navigate('/')}>AI Nexus</span>
          <button onClick={() => dispatch(setSidebarOpen(false))}
            className="p-1.5 rounded-lg md:hidden transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <PanelLeftClose size={15} />
          </button>
        </div>
        <button onClick={newChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <Plus size={16} /> New Chat
        </button>
      </div>

      {/* Nav items */}
      <div className="px-2 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        {NAV.map(({ icon: Icon, label, path }) => {
          const active = location.pathname.startsWith(path);
          return (
            <button key={path} onClick={() => navigate(path)}
              className="sidebar-item w-full mb-0.5"
              style={active ? {} : {}}>
              <Icon size={15} /><span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Search chats */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-all"
            style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.4)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {pinned.length > 0 && (
          <div className="mb-2">
            <SectionLabel label="Pinned" />
            {pinned.map(c => <ChatItem key={c._id} chat={c} />)}
          </div>
        )}
        {recent.length > 0 && (
          <div>
            {pinned.length > 0 && <SectionLabel label="Recent" />}
            {recent.map(c => <ChatItem key={c._id} chat={c} />)}
          </div>
        )}
        {filtered.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--text-faint)' }}>
            <MessageSquare size={22} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">{search ? 'No chats found' : 'No chats yet'}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        {user?.plan === 'free' && (
          <button onClick={() => navigate('/pricing')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-1 transition-colors text-yellow-400"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(234,179,8,0.08)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Sparkles size={12} /> Upgrade to Pro
          </button>
        )}
        {user?.plan !== 'free' && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-brand-400 mb-1">
            <Crown size={11} /><span className="capitalize">{user?.plan} Plan</span>
          </div>
        )}
        <button onClick={() => navigate('/settings')} className="sidebar-item w-full text-sm">
          <Settings size={14} /><span>Settings</span>
        </button>
        <button onClick={() => navigate('/profile')} className="sidebar-item w-full text-sm">
          <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <span className="flex-1 truncate text-sm">{user?.name}</span>
        </button>
        <button onClick={() => { dispatch(logout()); navigate('/login'); }}
          className="sidebar-item w-full text-sm text-red-400 hover:text-red-300"
          style={{ color: '#f87171' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <LogOut size={14} /><span>Logout</span>
        </button>
      </div>
    </div>
  );
}
