import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, Zap, MessageSquare, Image, Globe, Bot, Key } from 'lucide-react';
import { useSelector } from 'react-redux';

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, icon: '🆓', color: 'from-slate-600 to-slate-700',
    badge: null,
    features: [
      '🧠 Nexus Built-in AI (always works)',
      '💬 Unlimited basic conversations',
      '🌐 Web search (via DuckDuckGo)',
      '🎨 Free image generation (Flux, Turbo, SD)',
      '📎 File upload & document chat',
      '🎤 Voice input',
      '🤖 4 AI Agents (Research, Coding, Writing, Marketing)',
      '📱 Mobile friendly',
    ],
    cta: 'Current Plan',
    ctaAction: null,
  },
  {
    id: 'openrouter', name: 'OpenRouter', price: 0, icon: '🚀', color: 'from-brand-600 to-blue-600',
    badge: 'Recommended',
    features: [
      '✅ Everything in Free',
      '🌸 Claude 3 Haiku (fast & smart)',
      '💎 Gemini 2.0 Flash',
      '🦙 Llama 3.1 70B',
      '🌀 Mistral & more models',
      '⚡ Real AI responses (not built-in)',
      '🔑 One free API key — no billing',
      '📈 Generous free tier limits',
    ],
    cta: 'Get Free OpenRouter Key',
    ctaAction: () => window.open('https://openrouter.ai/keys', '_blank'),
    highlight: true,
  },
  {
    id: 'advanced', name: 'Full Power', price: '~$5–20', icon: '👑', color: 'from-yellow-600 to-orange-600',
    badge: 'Max Features',
    features: [
      '✅ Everything in OpenRouter',
      '🎭 Direct Anthropic Claude access',
      '🔮 Direct Google Gemini Pro',
      '🤖 GPT-4o (OpenAI)',
      '🎨 DALL-E 3 image generation',
      '🔍 Tavily/Serper web search',
      '♾️ No rate limits',
      '🏆 Best response quality',
    ],
    cta: 'Add Your Own API Keys',
    ctaAction: 'settings',
  },
];

const HOW_IT_WORKS = [
  { icon: Zap, title: 'Start Free', desc: 'Use the built-in Nexus AI model with web search, image generation, agents and more — all free, no account needed.' },
  { icon: Key, title: 'Add OpenRouter Key', desc: 'Get a free key from openrouter.ai to unlock Claude, Gemini and Llama. No billing required on the free tier.' },
  { icon: Bot, title: 'Add Direct Keys', desc: 'Add your own Anthropic, Google or OpenAI keys in Settings → API Keys for maximum quality and control.' },
];

export default function PricingPage() {
  const navigate  = useNavigate();
  const { user }  = useSelector(s => s.auth);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link to={user ? '/chat' : '/'} className="inline-flex items-center gap-2 text-sm mb-8 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <ArrowLeft size={14} /> Back
        </Link>

        <div className="text-center mb-12">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">100% Free</span> to Get Started
          </motion.h1>
          <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>
            No credit card. No subscription. No limits on the free tier.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
            Add your own API keys to unlock more powerful AI models.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="nexus-card text-center p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center mx-auto mb-3">
                <Icon size={18} className="text-brand-400" />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                <span className="text-brand-400 mr-2">{i+1}.</span>{title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`nexus-card relative flex flex-col ${plan.highlight ? 'ring-2 ring-brand-500/50' : ''}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                  {plan.badge}
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-xl mb-4`}>
                {plan.icon}
              </div>

              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-5">
                {plan.price === 0
                  ? <span className="text-3xl font-bold text-green-400">Free</span>
                  : <><span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{plan.price}</span>
                     <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/mo estimated</span></>}
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex-shrink-0">{f.slice(0, 2)}</span>
                    <span>{f.slice(2).trim()}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (!plan.ctaAction) return;
                  if (plan.ctaAction === 'settings') navigate('/settings');
                  else plan.ctaAction();
                }}
                disabled={!plan.ctaAction}
                className={`w-full py-3 rounded-xl font-medium transition-all text-sm ${
                  plan.highlight
                    ? 'text-white active:scale-95'
                    : plan.ctaAction
                    ? 'active:scale-95'
                    : 'opacity-60 cursor-default'
                }`}
                style={plan.highlight
                  ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff' }
                  : { backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Free models list */}
        <div className="nexus-card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            🎁 Everything Free — No Signup Required
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🧠', name: 'Nexus Built-in AI', desc: 'Always available' },
              { icon: '🎨', name: 'Flux Image Gen', desc: 'Pollinations.ai' },
              { icon: '🌐', name: 'Web Search', desc: 'DuckDuckGo + Wiki' },
              { icon: '🤖', name: '4 AI Agents', desc: 'Research, Code, Write' },
              { icon: '📎', name: 'File Upload', desc: 'PDF, DOCX, Images' },
              { icon: '🎤', name: 'Voice Input', desc: 'Browser built-in' },
              { icon: '💾', name: 'Chat History', desc: 'MongoDB Atlas' },
              { icon: '🔗', name: 'Share Chats', desc: 'Public links' },
            ].map(({ icon, name, desc }) => (
              <div key={name} className="flex items-start gap-2 p-3 rounded-lg"
                style={{ backgroundColor: 'var(--bg-hover)' }}>
                <span className="text-lg">{icon}</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          {user ? (
            <Link to="/chat" className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base">
              <MessageSquare size={16} />Continue Chatting
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/register" className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base">
                Get Started Free
              </Link>
              <Link to="/login" className="btn-secondary inline-flex items-center gap-2 px-8 py-3 text-base">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}