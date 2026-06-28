import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles, MessageSquare, Image, Globe, Bot, Code2, Mic,
  ArrowRight, Check, Star, Zap, Shield, Users, ChevronRight
} from 'lucide-react';

const FEATURES = [
  { icon: MessageSquare, title: 'Multi-Model Chat', desc: 'Switch between GPT-4o, Claude 3.5, Gemini 1.5, Llama and more in one place.', color: 'from-blue-600 to-cyan-600' },
  { icon: Image, title: 'AI Image Generation', desc: 'Create stunning images with DALL-E 3, Stable Diffusion and Flux.', color: 'from-purple-600 to-pink-600' },
  { icon: Globe, title: 'Real-Time Web Search', desc: 'Answers grounded in current information with cited sources.', color: 'from-green-600 to-teal-600' },
  { icon: Bot, title: 'Specialized AI Agents', desc: 'Research, Coding, Writing and Marketing agents built to get things done.', color: 'from-orange-600 to-red-600' },
  { icon: Code2, title: 'Code Interpreter', desc: 'Run Python and JavaScript in a secure sandbox and see results instantly.', color: 'from-indigo-600 to-blue-600' },
  { icon: Mic, title: 'Voice Chat', desc: 'Speak naturally and get spoken responses. Hands-free AI interaction.', color: 'from-pink-600 to-rose-600' },
];

const MODELS = [
  { name: 'GPT-4o', provider: 'OpenAI', icon: '🤖' },
  { name: 'Claude 3.5', provider: 'Anthropic', icon: '🎭' },
  { name: 'Gemini 1.5', provider: 'Google', icon: '💎' },
  { name: 'Llama 3.1', provider: 'Meta', icon: '🦙' },
  { name: 'DeepSeek', provider: 'DeepSeek', icon: '🌊' },
  { name: 'DALL-E 3', provider: 'OpenAI', icon: '🎨' },
];

const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'Product Manager', text: 'AI Nexus replaced 5 different AI tools for me. The model switching alone saves hours every week.', stars: 5 },
  { name: 'Marcus Rivera', role: 'Full Stack Dev', text: 'The code interpreter is insane. I prototype and test ideas without leaving my chat window.', stars: 5 },
  { name: 'Priya Nair', role: 'Content Strategist', text: 'Web search + AI writing is a game-changer. No more hallucinated facts in my content.', stars: 5 },
];

function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text">AI Nexus</Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#models" className="hover:text-white transition-colors">Models</a>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm py-2">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm py-2">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600/20 border border-brand-500/30 rounded-full text-sm text-brand-300 mb-8">
            <Sparkles size={14} /><span>Now with Claude 3.5 Sonnet & Gemini 1.5 Pro</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            The AI platform
            <br />
            <span className="gradient-text">that does it all</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Chat, generate images, search the web, run code and build with AI agents — all in one beautifully designed workspace.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary flex items-center gap-2 px-8 py-4 text-base shadow-lg shadow-brand-600/20">
              Start for free <ArrowRight size={18} />
            </Link>
            <Link to="/pricing" className="btn-secondary flex items-center gap-2 px-8 py-4 text-base">
              View pricing <ChevronRight size={18} />
            </Link>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-5 text-sm text-gray-500">
            Free plan available · No credit card required
          </motion.p>
        </div>

        {/* Hero preview */}
        <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative max-w-4xl mx-auto mt-16">
          <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50">
            {/* Mock chat UI */}
            <div className="bg-dark-800/80 border-b border-white/5 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/60" /><div className="w-3 h-3 rounded-full bg-yellow-500/60" /><div className="w-3 h-3 rounded-full bg-green-500/60" /></div>
              <div className="flex-1 bg-dark-600/50 rounded-lg px-3 py-1.5 text-xs text-gray-500 text-center">AI Nexus — Your Intelligent Workspace</div>
            </div>
            <div className="p-6 space-y-4 bg-dark-900/50">
              <div className="flex justify-end">
                <div className="message-user text-sm">Build me a React dashboard with charts and dark mode</div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center text-xs flex-shrink-0">✨</div>
                <div className="message-ai text-sm flex-1">
                  <p className="text-gray-300 mb-2">I'll create a beautiful React dashboard for you! Here's a complete implementation:</p>
                  <div className="bg-dark-800 rounded-lg p-3 font-mono text-xs text-green-400 border border-white/5">
                    <p className="text-gray-500 mb-1">{'// Dashboard.jsx'}</p>
                    <p>{'import { BarChart, LineChart } from "recharts";'}</p>
                    <p className="text-brand-400">{'export default function Dashboard() {'}</p>
                    <p className="ml-4 text-gray-300">{'  return <div className="dark:bg-gray-900">…</div>'}</p>
                    <p className="text-brand-400">{'}'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-dark-700/50 rounded-xl px-4 py-3 border border-white/5">
                <span className="text-gray-500 text-sm flex-1">Ask anything…</span>
                <div className="flex gap-2">
                  <div className="px-2 py-1 bg-dark-600 rounded text-xs text-gray-400 border border-white/5">🤖 GPT-4o</div>
                  <div className="p-1.5 bg-brand-600 rounded-lg"><ArrowRight size={13} /></div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent pointer-events-none rounded-2xl" style={{ top: '60%' }} />
        </motion.div>
      </section>

      {/* Models */}
      <section id="models" className="py-16 px-6 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-10">
            <p className="text-sm text-gray-500 uppercase tracking-wider mb-3">Powered by</p>
            <h2 className="text-2xl font-bold text-white">All the best AI models in one place</h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {MODELS.map((m, i) => (
              <FadeIn key={m.name} delay={i * 0.05}>
                <div className="card text-center hover:border-white/10 transition-all group">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{m.icon}</div>
                  <p className="text-sm font-semibold text-white">{m.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.provider}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-sm text-brand-400 uppercase tracking-wider font-medium mb-3">Everything you need</p>
            <h2 className="text-4xl font-bold text-white mb-4">Packed with powerful features</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">From real-time web search to AI image generation, AI Nexus gives you superpowers.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.07}>
                <div className="card group hover:border-white/10 transition-all hover:-translate-y-1">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon size={18} className="text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-dark-800/30">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-2">Loved by creators & developers</h2>
            <p className="text-gray-400">Join thousands of users who use AI Nexus every day</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div className="card">
                  <div className="flex gap-0.5 mb-3">{[...Array(t.stars)].map((_,j) => <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />)}</div>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">"{t.text}"</p>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <div className="relative p-12 rounded-3xl overflow-hidden border border-brand-500/20" style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, rgba(10,10,10,0) 70%)' }}>
              <h2 className="text-4xl font-bold text-white mb-4">Start building with AI today</h2>
              <p className="text-gray-400 text-lg mb-8">Free plan available. No credit card required.</p>
              <Link to="/register" className="btn-primary inline-flex items-center gap-2 px-10 py-4 text-base shadow-lg shadow-brand-600/20">
                Get started for free <ArrowRight size={18} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold gradient-text">AI Nexus</div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
          </div>
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} AI Nexus. All rights reserved.</p>
          <p className="mt-2 text-sm text-gray-500">
            Build With ❤️ By{" "}
            <a
              href="https://www.linkedin.com/in/roniseikh"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              Roni Seikh
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
