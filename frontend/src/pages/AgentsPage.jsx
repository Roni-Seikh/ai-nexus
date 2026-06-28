import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Zap, ArrowLeft, Send, Square, RotateCcw,
  Copy, Check, Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';

const AGENTS = [
  {
    id: 'research',
    name: 'Research Agent',
    emoji: '🔬',
    color: 'from-blue-600 to-cyan-600',
    textColor: 'text-blue-400',
    desc: 'Deep research on any topic with structured, cited answers',
    placeholder: 'What would you like me to research?',
    systemPrompt: `You are an expert Research Agent with access to deep knowledge across all fields.

When responding:
- Start with a clear summary
- Use headers (##) to organize sections
- Include key facts, statistics, and insights
- Mention multiple perspectives
- Use bullet points and tables when helpful
- End with key takeaways

Be thorough, accurate, and educational. Format in clean Markdown.`,
    suggestions: [
      'Explain quantum computing and its real-world applications',
      'Research the history and future of artificial intelligence',
      'What are the key differences between machine learning and deep learning?',
      'Research climate change — causes, effects and solutions',
    ],
  },
  {
    id: 'coding',
    name: 'Coding Agent',
    emoji: '💻',
    color: 'from-green-600 to-teal-600',
    textColor: 'text-green-400',
    desc: 'Write, debug, explain and review code in any language',
    placeholder: 'Ask me to write code, debug an error, explain a concept...',
    systemPrompt: `You are an expert Coding Agent — a senior software engineer with expertise in all languages and frameworks.

When helping with code:
- Write clean, well-commented, production-ready code
- Always use proper code blocks with language specified
- Explain what the code does and why each part matters
- Point out potential issues and improvements
- Provide example usage and expected output
- Follow best practices (DRY, SOLID, clean architecture)
- For debugging: identify root cause and explain the fix clearly

Supported: Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, SQL, HTML/CSS, React, Node.js, and more.

Always be specific and practical.`,
    suggestions: [
      'Write a REST API with JWT authentication in Node.js/Express',
      'Implement a binary search tree in Python with all operations',
      'Write a React component for a real-time search with debounce',
      'Explain and implement dynamic programming with memoization examples',
    ],
  },
  {
    id: 'writing',
    name: 'Writing Agent',
    emoji: '✍️',
    color: 'from-purple-600 to-pink-600',
    textColor: 'text-purple-400',
    desc: 'Create, edit and improve any kind of written content',
    placeholder: 'Ask me to write an essay, story, email, poem, blog post...',
    systemPrompt: `You are an expert Writing Agent — a professional writer, editor and content strategist.

You excel at:
- Creative writing (stories, poems, scripts, dialogue)
- Professional writing (emails, reports, proposals, cover letters, resumes)
- Content marketing (blog posts, social media, copywriting, SEO content)
- Academic writing (essays, research papers, summaries)
- Editing and proofreading (grammar, style, clarity, tone)

When writing:
- Match the requested tone (formal, casual, persuasive, creative)
- Structure content clearly with proper flow and transitions
- Use vivid, engaging language appropriate to the audience
- Offer alternatives or variations when helpful
- Provide constructive feedback when editing

Deliver polished, publication-ready content every time.`,
    suggestions: [
      'Write a compelling cover letter for a software engineer job',
      'Write a short story about a time traveler discovering ancient Egypt',
      'Write a professional email requesting a salary raise with justification',
      'Write an SEO blog post about the benefits of remote work (800 words)',
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Agent',
    emoji: '📈',
    color: 'from-orange-600 to-red-600',
    textColor: 'text-orange-400',
    desc: 'Marketing strategies, ad copy, SEO, and growth tactics',
    placeholder: 'Ask about marketing strategies, ad copy, social media, SEO, branding...',
    systemPrompt: `You are an expert Marketing Agent — a CMO-level strategist with deep expertise in digital marketing, growth, and brand building.

Your expertise includes:
- Digital marketing strategy (SEO, SEM, social media, email, content marketing)
- Brand positioning and messaging frameworks
- Ad copywriting (Google Ads, Facebook, Instagram, LinkedIn, TikTok)
- Growth hacking and viral marketing tactics
- Customer psychology and conversion rate optimization
- Market research and competitor analysis
- Product launches and go-to-market strategy
- Analytics, KPIs, and ROI measurement

When advising:
- Provide actionable, specific strategies with clear next steps
- Include real examples, templates, and frameworks
- Give specific headlines, copy, and CTAs when requested
- Consider budget constraints and realistic timelines
- Tailor advice to business type, stage, and target audience

Always focus on measurable results and return on investment.`,
    suggestions: [
      'Create a social media marketing strategy for a new mobile app',
      'Write 10 high-converting Google Ad headlines for an e-commerce store',
      'How do I grow my Instagram from 0 to 10,000 followers organically?',
      'Create a complete go-to-market strategy for a B2B SaaS product',
    ],
  },
];

// ── Code block with copy ──────────────────────────────────────
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true); toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-xl overflow-hidden" style={{ border:'1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ backgroundColor:'var(--bg-hover)', borderColor:'var(--border)' }}>
        <span className="text-xs font-mono" style={{ color:'var(--text-faint)' }}>{lang || 'code'}</span>
        <button onClick={copy} className="text-xs flex items-center gap-1 transition-colors"
          style={{ color:'var(--text-faint)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}>
          {copied ? <><Check size={11} className="text-green-400" />Copied</> : <><Copy size={11} />Copy</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs font-mono" style={{ background:'#0a0a0a', color:'#e2e8f0', margin:0 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────
function AgentMessage({ msg, agent, isStreaming }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const copy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true); toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-1 bg-gradient-to-br ${agent.color}`}>
          {agent.emoji}
        </div>
      )}
      <div className={`max-w-[88%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {isUser ? (
          <div className="message-user">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color:'var(--text-primary)' }}>
              {msg.content}
            </p>
          </div>
        ) : (
          <div className="message-ai group">
            <div className="prose-dark text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children }) {
                    const lang = className?.replace('language-','') || '';
                    const code = String(children).replace(/\n$/,'');
                    if (inline) return (
                      <code className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{ backgroundColor:'rgba(124,58,237,0.15)', color:'#a78bfa' }}>{code}</code>
                    );
                    return <CodeBlock lang={lang} code={code} />;
                  },
                }}>
                {msg.content}
              </ReactMarkdown>
              {isStreaming && <span className="inline-block w-2 h-4 bg-brand-400 rounded-sm ml-1 animate-pulse"/>}
            </div>
            <button onClick={copy}
              className="opacity-0 group-hover:opacity-100 mt-1 flex items-center gap-1 text-xs transition-all"
              style={{ color:'var(--text-faint)' }}>
              {copied ? <><Check size={11} className="text-green-400" />Copied</> : <><Copy size={11} />Copy response</>}
            </button>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold text-white">
          U
        </div>
      )}
    </div>
  );
}

// ── Typing dots ───────────────────────────────────────────────
function AgentTyping({ agent }) {
  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 bg-gradient-to-br ${agent.color}`}>
        {agent.emoji}
      </div>
      <div className="message-ai flex items-center gap-1 py-4 px-4">
        <span className="typing-dot w-2 h-2 rounded-full bg-brand-400"/>
        <span className="typing-dot w-2 h-2 rounded-full bg-brand-400"/>
        <span className="typing-dot w-2 h-2 rounded-full bg-brand-400"/>
      </div>
    </div>
  );
}

// ── Agent chat screen ─────────────────────────────────────────
function AgentChat({ agent, onBack }) {
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [streaming, setStreaming]   = useState('');
  const [abortCtrl, setAbortCtrl]   = useState(null);
  const endRef      = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, streaming]);

  const send = async (override) => {
    const content = (override || input).trim();
    if (!content || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const history = [...messages, { role:'user', content, id:Date.now() }];
    setMessages(history);
    setLoading(true);
    setStreaming('');

    // Build payload: system prompt + conversation
    const payload = [
      { role:'system', content: agent.systemPrompt },
      ...history.map(m => ({ role:m.role, content:m.content })),
    ];

    const ctrl = new AbortController();
    setAbortCtrl(ctrl);

    try {
      // Call the agents/chat endpoint
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const resp = await fetch(`${apiBase}/agents/chat`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body:   JSON.stringify({ messages: payload }),
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${resp.status}`);
      }

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type === 'chunk') { full += p.content; setStreaming(full); }
            if (p.type === 'error') throw new Error(p.message);
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') throw parseErr;
          }
        }
      }

      setMessages(prev => [...prev, { role:'assistant', content:full, id:Date.now() }]);
      setStreaming('');
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error(`Agent error: ${err.message}`);
        setStreaming('');
      }
    } finally {
      setLoading(false);
      setAbortCtrl(null);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor:'var(--bg-base)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor:'var(--border)', backgroundColor:'var(--bg-surface)' }}>
        <button onClick={onBack}
          className="p-2 rounded-lg transition-colors" style={{ color:'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <ArrowLeft size={16}/>
        </button>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${agent.color}`}>
          {agent.emoji}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{agent.name}</p>
          <p className="text-xs" style={{ color:'var(--text-muted)' }}>{agent.desc}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { if (confirm('Clear chat?')) setMessages([]); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ color:'var(--text-muted)', borderColor:'var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <RotateCcw size={12}/> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 bg-gradient-to-br ${agent.color} shadow-lg`}>
              {agent.emoji}
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color:'var(--text-primary)' }}>{agent.name}</h2>
            <p className="text-sm text-center mb-8 max-w-sm" style={{ color:'var(--text-muted)' }}>
              {agent.desc}. Try a suggestion or ask anything!
            </p>
            <div className="grid grid-cols-1 gap-3 w-full max-w-lg">
              {agent.suggestions.map((s, i) => (
                <motion.button key={i}
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl border text-sm transition-all"
                  style={{ backgroundColor:'var(--bg-card)', borderColor:'var(--border)', color:'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(124,58,237,0.4)'; e.currentTarget.style.color='var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)'; }}>
                  <span className={`font-bold mr-2 ${agent.textColor}`}>→</span>{s}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id}
                  initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.2 }}>
                  <AgentMessage msg={msg} agent={agent}/>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && streaming && (
              <AgentMessage msg={{ role:'assistant', content:streaming, id:'stream' }} agent={agent} isStreaming/>
            )}
            {loading && !streaming && <AgentTyping agent={agent}/>}
            <div ref={endRef}/>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4" style={{ borderColor:'var(--border)', backgroundColor:'var(--bg-surface)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border transition-all"
            style={{ backgroundColor:'var(--bg-input)', borderColor:'var(--border)' }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
            onBlurCapture={e  => e.currentTarget.style.borderColor = 'var(--border)'}>
            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={handleKey}
              placeholder={agent.placeholder}
              rows={1}
              className="w-full bg-transparent px-4 pt-4 pb-12 resize-none focus:outline-none text-sm leading-relaxed"
              style={{ color:'var(--text-primary)', minHeight:'56px', maxHeight:'180px' }}
            />
            <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full bg-black/20 border ${agent.textColor}`}
                style={{ borderColor:'rgba(255,255,255,0.1)' }}>
                {agent.emoji} {agent.name}
              </span>
              {loading ? (
                <button onClick={() => abortCtrl?.abort()}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors">
                  <Square size={13}/>
                </button>
              ) : (
                <button onClick={() => send()} disabled={!input.trim()}
                  className="p-2 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ backgroundColor:'#7c3aed', color:'#fff' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6d28d9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7c3aed'}>
                  <Send size={13}/>
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-center mt-2" style={{ color:'var(--text-faint)' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Agent grid (home screen) ──────────────────────────────────
export default function AgentsPage() {
  const [active, setActive] = useState(null);
  if (active) return <AgentChat agent={active} onBack={() => setActive(null)}/>;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor:'var(--bg-base)' }}>
      <div className="px-6 py-4 border-b flex items-center gap-3"
        style={{ borderColor:'var(--border)', backgroundColor:'var(--bg-surface)' }}>
        <div className="p-2 bg-blue-600/20 rounded-xl"><Bot size={18} className="text-blue-400"/></div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color:'var(--text-primary)' }}>AI Agents</h1>
          <p className="text-xs" style={{ color:'var(--text-muted)' }}>
            Specialized assistants — each with unique expertise and personality
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AGENTS.map((agent, i) => (
              <motion.div key={agent.id}
                initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
                onClick={() => setActive(agent)}
                className="nexus-card cursor-pointer group transition-all"
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-lg`}>
                    {agent.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold" style={{ color:'var(--text-primary)' }}>{agent.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-600/15 text-brand-400 border border-brand-500/20">Built-in</span>
                    </div>
                    <p className="text-sm mb-3" style={{ color:'var(--text-muted)' }}>{agent.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {agent.suggestions.slice(0,2).map(s => (
                        <span key={s} className="text-xs px-2 py-1 rounded-lg truncate max-w-[180px]"
                          style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-faint)' }}>
                          {s.slice(0,40)}…
                        </span>
                      ))}
                    </div>
                    <button className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r ${agent.color} transition-all active:scale-95 group-hover:opacity-100 opacity-90`}>
                      <Zap size={14}/> Start Chatting
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="nexus-card p-4 flex items-start gap-3">
            <Sparkles size={15} className="text-brand-400 flex-shrink-0 mt-0.5"/>
            <p className="text-xs leading-relaxed" style={{ color:'var(--text-muted)' }}>
              Each agent has a specialized AI persona. The <strong style={{color:'var(--text-secondary)'}}>Research Agent</strong> gives structured, detailed research.
              The <strong style={{color:'var(--text-secondary)'}}>Coding Agent</strong> writes production-ready code.
              The <strong style={{color:'var(--text-secondary)'}}>Writing Agent</strong> creates polished content.
              The <strong style={{color:'var(--text-secondary)'}}>Marketing Agent</strong> provides growth strategies.
              Conversations are independent per agent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
