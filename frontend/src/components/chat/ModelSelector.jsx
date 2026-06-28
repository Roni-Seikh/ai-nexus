import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, Check, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { setSelectedModel } from '@/store/slices/chatSlice';
import api from '@/services/api';

export default function ModelSelector() {
  const dispatch = useDispatch();
  const { selectedModel } = useSelector(s => s.chat);
  const { user } = useSelector(s => s.auth);
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    api.get('/settings/models').then(r => setModels(r.data.data.models)).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = models.find(m => m.id === selectedModel);
  const groups = models.reduce((acc, m) => { (acc[m.provider] = acc[m.provider] || []).push(m); return acc; }, {});

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-dark-600 hover:bg-dark-500 border border-white/10 rounded-lg text-sm transition-colors">
        <span>{current?.icon || '🤖'}</span>
        <span className="text-gray-300 max-w-[120px] truncate">{current?.name || selectedModel}</span>
        <ChevronDown size={13} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-2 w-72 bg-dark-700 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 max-h-80 overflow-y-auto">
              {Object.entries(groups).map(([provider, ms]) => (
                <div key={provider} className="mb-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1.5 capitalize">{provider}</p>
                  {ms.map(m => {
                    const locked = m.plan !== 'free' && user?.plan === 'free';
                    return (
                      <button key={m.id} onClick={() => { if (!locked) { dispatch(setSelectedModel(m.id)); setOpen(false); } }}
                        disabled={locked}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedModel === m.id ? 'bg-brand-600/20 text-white' : locked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}>
                        <span className="text-lg">{m.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{m.name}</span>
                            {locked && <Lock size={11} className="text-yellow-500" />}
                            {m.plan !== 'free' && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Pro</span>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{m.description}</p>
                        </div>
                        {selectedModel === m.id && <Check size={14} className="text-brand-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
