import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ExternalLink, Loader2, Link2, AlertCircle, BookOpen, Clock } from 'lucide-react';
import api from '@/services/api';

const isURL = (str) => {
  try { new URL(str.startsWith('http') ? str : 'https://' + str); return /\.\w{2,}/.test(str); }
  catch { return false; }
};

export default function SearchPage() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError]     = useState('');
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  const handleSearch = async (e, q) => {
    if (e) e.preventDefault();
    const searchQ = q || query;
    if (!searchQ.trim()) return;
    setLoading(true); setSearched(true); setError(''); setSummary(''); setResults([]);

    // Add to history
    setHistory(h => [searchQ, ...h.filter(x => x !== searchQ)].slice(0, 8));

    try {
      // If it's a URL — fetch info about that specific site
      if (isURL(searchQ)) {
        const url = searchQ.startsWith('http') ? searchQ : 'https://' + searchQ;
        const { data } = await api.post('/search', { query: `site information about ${url} what is this website`, maxResults: 6 });
        setResults(data.data.results || []);
        if (data.data.results?.length > 0) {
          setSummary(`Here's what I found about **${url}**:\n\n${data.data.results.map((r,i) => `**${i+1}. ${r.title}**\n${r.snippet}`).join('\n\n')}`);
        } else {
          setError(`Couldn't fetch information about ${url}. Try searching for the website name instead.`);
        }
      } else {
        const { data } = await api.post('/search', { query: searchQ, maxResults: 8 });
        setResults(data.data.results || []);
        if (data.data.results?.length === 0) setError('No results found. Try different keywords.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed. Check your search API configuration.');
    } finally { setLoading(false); }
  };

  const quickSearch = (q) => { setQuery(q); handleSearch(null, q); };

  const SUGGESTIONS = [
    'Latest AI news 2025', 'Best programming languages', 'How does quantum computing work',
    'Machine learning tutorials', 'Top JavaScript frameworks', 'Python vs JavaScript',
  ];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600/20 rounded-xl"><Globe size={18} className="text-green-400" /></div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Web Search</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Search the internet or paste a URL to get info about any website</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-6">
            <div className="relative flex-1">
              {isURL(query)
                ? <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
                : <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />}
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search anything or paste a website URL…"
                className="input-base pl-10 py-3 text-sm" />
            </div>
            <button type="submit" disabled={loading || !query.trim()}
              className="btn-primary px-5 gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>

          {/* URL badge */}
          {isURL(query) && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-brand-600/10 border border-brand-500/20 rounded-lg text-sm text-brand-400">
              <Link2 size={13} />
              <span>URL detected — I'll find information about this website</span>
            </div>
          )}

          {/* Suggestions (when empty) */}
          {!searched && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-faint)' }}>
                  Quick searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => quickSearch(s)}
                      className="px-3 py-1.5 text-sm rounded-full border transition-all hover:border-brand-500/40 hover:text-brand-400"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="nexus-card p-5 rounded-xl">
                <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>💡 How to use Web Search</h3>
                <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <li>• <strong style={{ color: 'var(--text-secondary)' }}>Search anything</strong> — news, tutorials, facts, explanations</li>
                  <li>• <strong style={{ color: 'var(--text-secondary)' }}>Paste a URL</strong> — e.g. <code className="text-brand-400 text-xs">github.com/openai</code> to get info about that site</li>
                  <li>• <strong style={{ color: 'var(--text-secondary)' }}>In Chat</strong> — toggle the 🌐 Web Search button in the chat input to search while chatting</li>
                </ul>
              </div>
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_,i) => (
                <div key={i} className="nexus-card p-4 shimmer" style={{ height: '80px' }} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm mb-4">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Search Error</p>
                <p>{error}</p>
                <p className="mt-2 text-xs text-red-400/60">Make sure TAVILY_API_KEY or SERPER_API_KEY is set in your backend .env</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {results.length} results for <span style={{ color: 'var(--text-primary)' }} className="font-medium">"{query}"</span>
                </p>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  Live results
                </span>
              </div>

              <AnimatePresence>
                {results.map((r, i) => (
                  <motion.a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="block nexus-card p-4 hover:border-brand-500/30 transition-all group rounded-xl"
                    style={{ textDecoration: 'none' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-brand-600/15 text-brand-400">
                            [{i+1}]
                          </span>
                          <span className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>
                            {r.url?.replace(/^https?:\/\//, '').split('/')[0]}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm mb-1.5 group-hover:text-brand-400 transition-colors line-clamp-1"
                          style={{ color: 'var(--text-primary)' }}>
                          {r.title}
                        </h3>
                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {r.snippet}
                        </p>
                      </div>
                      <ExternalLink size={13} className="flex-shrink-0 mt-1 opacity-40 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* No results */}
          {!loading && searched && results.length === 0 && !error && (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <Globe size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">No results found</p>
              <p className="text-sm">Try different keywords or check your spelling</p>
            </div>
          )}

          {/* Search History */}
          {history.length > 0 && !searched && (
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-faint)' }}>
                <Clock size={12} /> Recent searches
              </p>
              <div className="space-y-1">
                {history.map((h, i) => (
                  <button key={i} onClick={() => quickSearch(h)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 flex items-center gap-2"
                    style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} /> {h}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
