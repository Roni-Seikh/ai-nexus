import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Settings, Key, Palette, User, Eye, EyeOff, Check } from 'lucide-react';
import { updateProfile } from '@/store/slices/authSlice';
import { setTheme } from '@/store/slices/uiSlice';
import api from '@/services/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'profile',    label: 'Profile',    icon: User },
  { id: 'api',        label: 'API Keys',   icon: Key },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

const MODELS = [
  { id: 'nexus-builtin',                         name: '🧠 Nexus Built-in',      desc: 'Always works — no API key needed' },
  { id: 'anthropic/claude-3-haiku',              name: '🌸 Claude 3 Haiku',      desc: 'Fast Claude via OpenRouter (free)' },
  { id: 'google/gemini-2.0-flash-exp:free',      name: '💎 Gemini 2.0 Flash',    desc: 'Free Gemini via OpenRouter' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: '🦙 Llama 3.1 8B',       desc: 'Free open-source via OpenRouter' },
  { id: 'claude-3-5-sonnet-20241022',            name: '🎶 Claude 3.5 Sonnet',   desc: 'Best Claude (direct Anthropic key)' },
  { id: 'gemini-2.0-flash',                      name: '🔮 Gemini 2.0 Flash',    desc: 'Direct Google Gemini key (AIzaSy…)' },
];

const THEMES = [
  { id: 'dark',   label: '🌙 Dark',   desc: 'Easy on the eyes' },
  { id: 'light',  label: '☀️ Light',  desc: 'Bright and clean' },
  { id: 'system', label: '💻 System', desc: 'Follows your OS setting' },
];

// Apply theme to document
const applyTheme = (theme) => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
  root.classList.toggle('light', !isDark);
  // CSS variable overrides for light mode
  if (!isDark) {
    root.style.setProperty('--bg-primary',   '#f8f9fa');
    root.style.setProperty('--bg-secondary', '#ffffff');
    root.style.setProperty('--text-primary', '#111111');
    root.style.setProperty('--text-muted',   '#555555');
    root.style.setProperty('--border',       'rgba(0,0,0,0.1)');
  } else {
    root.style.removeProperty('--bg-primary');
    root.style.removeProperty('--bg-secondary');
    root.style.removeProperty('--text-primary');
    root.style.removeProperty('--text-muted');
    root.style.removeProperty('--border');
  }
};

export default function SettingsPage() {
  const dispatch   = useDispatch();
  const { user }   = useSelector(s => s.auth);
  const { theme }  = useSelector(s => s.ui);
  const [tab, setTab] = useState('profile');
  const [saving, setSaving]  = useState(false);
  const [apiKeys, setApiKeys] = useState({ openai: '', anthropic: '', gemini: '', openrouter: '' });
  const [showKeys, setShowKeys] = useState({});
  const [selectedModel, setSelectedModel] = useState(user?.preferences?.defaultModel || 'nexus-builtin');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' });

  // Apply theme on mount and change
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const handleThemeChange = (t) => {
    dispatch(setTheme(t));
    applyTheme(t);
    toast.success(`Theme set to ${t}`);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await dispatch(updateProfile({ name: profileForm.name, preferences: { ...user?.preferences, defaultModel: selectedModel } }));
      toast.success('Profile saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const saveApiKeys = async () => {
    setSaving(true);
    try {
      await api.put('/users/api-keys', apiKeys);
      toast.success('API keys saved!');
    } catch { toast.error('Failed to save API keys'); }
    finally { setSaving(false); }
  };

  const toggleShowKey = (k) => setShowKeys(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="flex flex-col h-full bg-dark-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-dark-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-600/20 rounded-xl"><Settings size={18} className="text-gray-400" /></div>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-dark-700 p-1 rounded-xl border border-white/5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-brand-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          {/* ── PROFILE ────────────────────────────────────── */}
          {tab === 'profile' && (
            <div className="space-y-5">
              <div className="card">
                <h2 className="font-semibold text-white mb-4">Profile Information</h2>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-blue-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user?.name}</p>
                    <p className="text-gray-400 text-sm">{user?.email}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize mt-1 inline-block ${user?.plan === 'free' ? 'bg-gray-600/30 text-gray-400' : 'bg-brand-600/30 text-brand-400'}`}>
                      {user?.plan} plan
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Display Name</label>
                    <input value={profileForm.name} onChange={e => setProfileForm(p=>({...p,name:e.target.value}))}
                      className="input-base" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                    <input value={user?.email} className="input-base opacity-50 cursor-not-allowed" readOnly />
                    <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
                  </div>
                  <button onClick={saveProfile} disabled={saving} className="btn-primary">
                    {saving ? 'Saving…' : 'Save Profile'}
                  </button>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="card">
                <h2 className="font-semibold text-white mb-4">Usage This Month</h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Messages', value: user?.usage?.messagesThisMonth || 0, color: 'text-brand-400' },
                    { label: 'Images', value: user?.usage?.imagesThisMonth || 0, color: 'text-purple-400' },
                    { label: 'Tokens', value: (user?.usage?.tokensThisMonth || 0).toLocaleString(), color: 'text-yellow-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-dark-600/50 rounded-xl p-3 text-center border border-white/5">
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── API KEYS ───────────────────────────────────── */}
          {tab === 'api' && (
            <div className="card space-y-5">
              <div>
                <h2 className="font-semibold text-white mb-1">API Keys</h2>
                <p className="text-sm text-gray-400">Add your own keys for unlimited access. Keys are encrypted and stored securely.</p>
              </div>

              <div className="p-3 bg-brand-600/10 border border-brand-500/20 rounded-xl text-sm text-brand-300">
                💡 <strong>Tip:</strong> Add an <strong>OpenRouter</strong> key for free access to Claude, Gemini & Llama.
                Get one free at <a href="https://openrouter.ai" target="_blank" className="underline">openrouter.ai</a>
              </div>

              {[
                { key: 'openrouter', label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...', hint: 'Free tier available — recommended!' },
                { key: 'anthropic',  label: 'Anthropic API Key',  placeholder: 'sk-ant-...',   hint: 'Direct Claude access' },
                { key: 'gemini',     label: 'Google Gemini Key',  placeholder: 'AIzaSy...',    hint: 'Must start with AIzaSy' },
                { key: 'openai',     label: 'OpenAI API Key',     placeholder: 'sk-...',        hint: 'For GPT-4 and DALL-E' },
              ].map(({ key, label, placeholder, hint }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
                  <div className="relative">
                    <input type={showKeys[key] ? 'text' : 'password'} value={apiKeys[key]}
                      onChange={e => setApiKeys(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder} className="input-base pr-10" />
                    <button type="button" onClick={() => toggleShowKey(key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showKeys[key] ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{hint}</p>
                </div>
              ))}

              <button onClick={saveApiKeys} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save API Keys'}
              </button>
            </div>
          )}

          {/* ── APPEARANCE ─────────────────────────────────── */}
          {tab === 'appearance' && (
            <div className="space-y-5">
              {/* Theme Switcher */}
              <div className="card">
                <h2 className="font-semibold text-white mb-1">Theme</h2>
                <p className="text-sm text-gray-400 mb-4">Choose how AI Nexus looks</p>
                <div className="grid grid-cols-3 gap-3">
                  {THEMES.map(({ id, label, desc }) => (
                    <button key={id} onClick={() => handleThemeChange(id)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${theme === id ? 'border-brand-500 bg-brand-600/10' : 'border-white/10 hover:border-white/20 bg-dark-600/30'}`}>
                      {theme === id && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                      <p className="text-sm font-medium text-white mb-1">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </button>
                  ))}
                </div>

                {/* Live preview */}
                <div className="mt-4 p-4 rounded-xl border border-white/5 bg-dark-600/30">
                  <p className="text-xs text-gray-500 mb-2">Preview</p>
                  <div className={`rounded-lg p-3 text-sm ${theme === 'light' ? 'bg-white text-gray-900 border border-gray-200' : 'bg-dark-800 text-white border border-white/5'}`}>
                    <p className="font-medium mb-1">AI Nexus</p>
                    <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Your intelligent AI assistant</p>
                  </div>
                </div>
              </div>

              {/* Default Model */}
              <div className="card">
                <h2 className="font-semibold text-white mb-1">Default AI Model</h2>
                <p className="text-sm text-gray-400 mb-4">Model used when starting new chats</p>
                <div className="space-y-2">
                  {MODELS.map(({ id, name, desc }) => (
                    <button key={id} onClick={() => setSelectedModel(id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedModel === id ? 'border-brand-500 bg-brand-600/10' : 'border-white/5 hover:border-white/10 bg-dark-600/20'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${selectedModel === id ? 'border-brand-500 bg-brand-500' : 'border-gray-600'}`}>
                        {selectedModel === id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{name}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button onClick={saveProfile} disabled={saving} className="btn-primary mt-4">
                  {saving ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>

              {/* Font Size */}
              <div className="card">
                <h2 className="font-semibold text-white mb-1">Chat Font Size</h2>
                <p className="text-sm text-gray-400 mb-4">Adjust text size in conversations</p>
                <div className="flex gap-3">
                  {[['sm','Small'], ['md','Medium'], ['lg','Large']].map(([size, label]) => (
                    <button key={size} onClick={() => dispatch(updateProfile({ preferences: { ...user?.preferences, fontSize: size } }))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${user?.preferences?.fontSize === size ? 'border-brand-500 bg-brand-600/20 text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}