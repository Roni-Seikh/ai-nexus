import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Wand2, Loader2, Sparkles, X } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

const FREE_MODELS = [
  { id: 'pollinations-flux',   name: '⚡ Flux',             desc: 'Best quality — Free' },
  { id: 'pollinations-turbo',  name: '🚀 Turbo',            desc: 'Fastest — Free' },
  { id: 'pollinations-stable', name: '🎨 Stable Diffusion', desc: 'Classic — Free' },
  { id: 'dall-e-3',            name: '🔮 DALL-E 3',          desc: 'Best (OpenAI key needed)' },
  { id: 'dall-e-2',            name: '🤖 DALL-E 2',          desc: 'Fast (OpenAI key needed)' },
];

const SIZES = [
  { id: '512x512',   label: '512 × 512',   ratio: '1:1'  },
  { id: '768x768',   label: '768 × 768',   ratio: '1:1'  },
  { id: '1024x1024', label: '1024 × 1024', ratio: '1:1'  },
  { id: '1024x576',  label: '1024 × 576',  ratio: '16:9' },
  { id: '576x1024',  label: '576 × 1024',  ratio: '9:16' },
  { id: '1024x768',  label: '1024 × 768',  ratio: '4:3'  },
];

const SUGGESTIONS = [
  'A majestic dragon soaring through storm clouds, digital art, 8k',
  'Cyberpunk city at night with neon reflections in rain puddles',
  'Beautiful aurora borealis over a snowy mountain landscape',
  'A magical forest with glowing mushrooms and fairy lights',
  'Portrait of a futuristic astronaut on Mars, hyper-realistic',
  'Abstract geometric art with vibrant purple and gold colors',
];

// ── Download helper — fetches blob so it actually downloads ──
const downloadImage = async (url, filename) => {
  try {
    toast.loading('Preparing download…', { id: 'dl' });
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || `ai-nexus-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast.success('Image downloaded!', { id: 'dl' });
  } catch (err) {
    toast.dismiss('dl');
    // Fallback: open in new tab if CORS blocks blob download
    window.open(url, '_blank');
    toast.success('Opened in new tab — right-click to save');
  }
};

export default function ImagePage() {
  const [prompt, setPrompt]       = useState('');
  const [negative, setNegative]   = useState('');
  const [options, setOptions]     = useState({ model: 'pollinations-flux', size: '1024x1024', n: 1 });
  const [generating, setGenerating] = useState(false);
  const [images, setImages]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [showAdv, setShowAdv]     = useState(false);

  useEffect(() => {
    api.get('/images')
      .then(r => setImages(r.data.data.images || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return; }
    setGenerating(true);
    try {
      const { data } = await api.post('/images/generate', {
        prompt, negativePrompt: negative, ...options,
      });
      setImages(prev => [data.data.image, ...prev]);
      toast.success('Image generated! 🎨');
      setPrompt('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally { setGenerating(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this image?')) return;
    await api.delete(`/images/${id}`);
    setImages(prev => prev.filter(i => i._id !== id));
    if (selected?._id === id) setSelected(null);
    toast.success('Deleted');
  };

  const isFree = options.model.startsWith('pollinations');

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-3"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="p-2 bg-purple-600/20 rounded-xl">
          <Wand2 size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Image Generation</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Free AI image generation — Flux, Turbo & Stable Diffusion
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">

          {/* Free badge */}
          {isFree && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-green-500/20 bg-green-500/5 text-green-400">
              <Sparkles size={14} />
              <span><strong>Free</strong> — {FREE_MODELS.find(m => m.id === options.model)?.name} via Pollinations.ai. No API key needed!</span>
            </div>
          )}

          {/* Generator */}
          <div className="nexus-card space-y-4">
            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Prompt
              </label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                placeholder="A majestic dragon flying over a castle at sunset, fantasy art, ultra detailed, 4k..."
                className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-all"
                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.slice(0, 4).map(s => (
                <button key={s} onClick={() => setPrompt(s)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={{ backgroundColor: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  {s.slice(0, 38)}…
                </button>
              ))}
            </div>

            {/* Model + Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Model</label>
                <div className="space-y-1.5">
                  {FREE_MODELS.map(m => (
                    <button key={m.id} onClick={() => setOptions(p => ({ ...p, model: m.id }))}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs text-left transition-all"
                      style={{
                        backgroundColor: options.model === m.id ? 'rgba(124,58,237,0.12)' : 'var(--bg-hover)',
                        borderColor: options.model === m.id ? '#7c3aed' : 'transparent',
                        color: 'var(--text-primary)',
                      }}>
                      <span>{m.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${m.id.startsWith('pollinations') ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Size / Ratio</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SIZES.map(s => (
                    <button key={s.id} onClick={() => setOptions(p => ({ ...p, size: s.id }))}
                      className="px-2 py-2 rounded-lg border text-xs transition-all"
                      style={{
                        backgroundColor: options.size === s.id ? 'rgba(124,58,237,0.12)' : 'var(--bg-hover)',
                        borderColor: options.size === s.id ? '#7c3aed' : 'transparent',
                      }}>
                      <div style={{ color: 'var(--text-primary)' }}>{s.label}</div>
                      <div className="opacity-60" style={{ color: 'var(--text-muted)' }}>{s.ratio}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                    Count: {options.n}
                  </label>
                  <input type="range" min={1} max={4} value={options.n}
                    onChange={e => setOptions(p => ({ ...p, n: +e.target.value }))}
                    className="w-full accent-brand-500" />
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div>
              <button onClick={() => setShowAdv(!showAdv)} className="text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                {showAdv ? '▲ Hide' : '▼ Show'} advanced (negative prompt)
              </button>
              <AnimatePresence>
                {showAdv && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-3">
                    <input value={negative} onChange={e => setNegative(e.target.value)} className="input-base text-sm"
                      placeholder="blurry, low quality, watermark, text, distorted..." />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={handleGenerate} disabled={generating || !prompt.trim()} className="btn-primary w-full py-3 gap-2">
              {generating
                ? <><Loader2 size={16} className="animate-spin" />Generating…</>
                : <><Wand2 size={16} />Generate {options.n > 1 ? `${options.n} images` : 'image'}</>}
            </button>
          </div>

          {/* Gallery */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Your Images</h2>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{images.length} images</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl shimmer" style={{ backgroundColor: 'var(--bg-card)' }} />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-16 nexus-card" style={{ color: 'var(--text-muted)' }}>
                <Wand2 size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium mb-1">No images yet</p>
                <p className="text-sm">Generate your first image above — it's free!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <AnimatePresence>
                  {images.map((img, idx) => img.urls?.[0] && (
                    <motion.div key={img._id}
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer"
                      style={{ border: '1px solid var(--border)' }}
                      onClick={() => setSelected(img)}>
                      <img src={img.urls[0]} alt={img.prompt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={e => { e.target.src = 'https://placehold.co/400x400/111/555?text=Image'; }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-colors
                                      flex items-end justify-between p-3 opacity-0 group-hover:opacity-100">
                        <p className="text-xs text-white line-clamp-2 flex-1 mr-2">{img.prompt?.slice(0, 60)}…</p>
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => downloadImage(img.urls[0], `ai-nexus-${idx+1}.png`)}
                            title="Download image"
                            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors">
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(img._id)}
                            title="Delete image"
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center p-6"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>

              {/* Close */}
              <button onClick={() => setSelected(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X size={16} />
              </button>

              <img src={selected.urls?.[0]} alt={selected.prompt}
                className="w-full rounded-2xl shadow-2xl"
                onError={e => { e.target.src='https://placehold.co/800x800/111/444?text=Image+Error'; }} />

              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 mb-1 line-clamp-2">{selected.prompt}</p>
                  <p className="text-xs text-gray-500">{selected.model} · {selected.size}</p>
                </div>
                <button
                  onClick={() => downloadImage(selected.urls[0], `ai-nexus-${Date.now()}.png`)}
                  className="btn-primary flex items-center gap-2 flex-shrink-0">
                  <Download size={14} /> Download
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
