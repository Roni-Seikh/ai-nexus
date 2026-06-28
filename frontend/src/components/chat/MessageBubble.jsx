import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, RotateCcw, ThumbsUp, ThumbsDown, User, Sparkles, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/services/api';

const MODEL_ICONS = { 'gpt': '🤖', 'claude': '🎭', 'gemini': '💎', 'llama': '🦙', 'deepseek': '🌊' };
const getModelIcon = (model = '') => {
  for (const [key, icon] of Object.entries(MODEL_ICONS)) if (model.toLowerCase().includes(key)) return icon;
  return '✨';
};

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };
  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-white/5">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-700 border-b border-white/5">
        <span className="text-xs text-gray-400 font-mono">{language || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter language={language || 'text'} style={oneDark} customStyle={{ margin: 0, padding: '16px', background: '#0a0a0a', fontSize: '13px', lineHeight: '1.6' }} showLineNumbers={children.split('\n').length > 5}>
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MessageBubble({ message, isStreaming, isLast, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(message.feedback?.rating || null);

  const isUser = message.role === 'user';

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const sendFeedback = async (rating) => {
    const newRating = feedback === rating ? null : rating;
    setFeedback(newRating);
    if (message._id && message._id !== 'streaming') {
      try { await api.patch(`/messages/${message._id}/feedback`, { rating: newRating }); } catch {}
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0 mt-1 text-sm">
          {getModelIcon(message.model)}
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {isUser ? (
          <div className="message-user">
            <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <div className="message-ai w-full">
            <div className="prose-dark text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children }) {
                    const lang = className?.replace('language-', '') || '';
                    const code = String(children).replace(/\n$/, '');
                    if (inline) return <code className="bg-dark-500 text-brand-300 px-1.5 py-0.5 rounded text-xs font-mono">{code}</code>;
                    return <CodeBlock language={lang}>{code}</CodeBlock>;
                  },
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">{children}<ExternalLink size={10} /></a>,
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="inline-block w-2 h-4 bg-brand-400 rounded-sm ml-1 animate-pulse" />}
            </div>

            {/* Web search results */}
            {message.webSearchResults?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <span>🌐</span> Sources
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.webSearchResults.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-500/50 border border-white/5 rounded-lg text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all max-w-[180px]">
                      <span className="text-brand-400 font-mono">[{i + 1}]</span>
                      <span className="truncate">{r.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!isUser && !isStreaming && (
          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
            <button onClick={copyMessage} className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            {isLast && onRegenerate && (
              <button onClick={onRegenerate} className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                <RotateCcw size={13} />
              </button>
            )}
            <button onClick={() => sendFeedback('thumbs_up')} className={`p-1.5 rounded-lg transition-colors ${feedback === 'thumbs_up' ? 'text-green-400 bg-green-400/10' : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'}`}>
              <ThumbsUp size={13} />
            </button>
            <button onClick={() => sendFeedback('thumbs_down')} className={`p-1.5 rounded-lg transition-colors ${feedback === 'thumbs_down' ? 'text-red-400 bg-red-400/10' : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'}`}>
              <ThumbsDown size={13} />
            </button>
            {message.tokens?.total > 0 && (
              <span className="text-xs text-gray-600 ml-1">{message.tokens.total} tokens</span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold">
          U
        </div>
      )}
    </div>
  );
}
