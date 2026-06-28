import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Square, Globe, Paperclip, Mic, MicOff,
  ChevronDown, PanelLeft, X, FileText, Image as ImageIcon,
  Loader2, AlertCircle
} from 'lucide-react';
import {
  fetchMessages, createChat, addMessage, setStreaming,
  appendStreamingContent, clearStreamingContent, setCurrentChat, toggleWebSearch
} from '@/store/slices/chatSlice';
import { setSidebarOpen } from '@/store/slices/uiSlice';
import api from '@/services/api';
import MessageBubble from '@/components/chat/MessageBubble';
import ModelSelector from '@/components/chat/ModelSelector';
import ChatWelcome from '@/components/chat/ChatWelcome';
import TypingIndicator from '@/components/chat/TypingIndicator';
import toast from 'react-hot-toast';

// ── Voice recognition hook ──────────────────────────────────
const useSpeechRecognition = (onResult) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice recognition not supported in this browser'); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = 'en-US';
    r.onstart  = () => setListening(true);
    r.onend    = () => { setListening(false); recognitionRef.current = null; };
    r.onerror  = (e) => { setListening(false); if (e.error !== 'aborted') toast.error('Voice error: ' + e.error); };
    r.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      onResult(transcript, e.results[e.results.length - 1].isFinal);
    };
    recognitionRef.current = r;
    r.start();
  }, [onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, start, stop };
};

export default function ChatPage() {
  const { id } = useParams();
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { messages, currentChat, isStreaming, streamingContent, selectedModel, webSearchEnabled } = useSelector(s => s.chat);
  const { user }       = useSelector(s => s.auth);
  const { sidebarOpen } = useSelector(s => s.ui);

  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [abortCtrl, setAbortCtrl] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef  = useRef(null);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const containerRef   = useRef(null);

  // Voice recognition
  const { listening, start: startVoice, stop: stopVoice } = useSpeechRecognition((transcript, isFinal) => {
    setInput(transcript);
    if (isFinal && transcript.trim()) {
      setTimeout(() => handleSend(transcript), 300);
    }
  });

  useEffect(() => {
    if (id) dispatch(fetchMessages(id));
    else { dispatch(setCurrentChat(null)); }
  }, [id, dispatch]);

  useEffect(() => {
    if (!showScrollBtn) scrollToBottom();
  }, [messages, streamingContent]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  };

  // ── File upload ──────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowed = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    for (const file of files) {
      if (!allowed.includes(file.type)) { toast.error(`${file.name}: file type not supported`); continue; }
      if (file.size > 10 * 1024 * 1024)  { toast.error(`${file.name}: max size is 10MB`); continue; }

      setUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (id) formData.append('chatId', id);
        const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const doc = data.data.document;
        setAttachedFiles(prev => [...prev, { id: doc._id, name: doc.originalName, type: doc.type, url: doc.url, extractedText: doc.extractedText }]);
        toast.success(`${file.name} uploaded`);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}: ${err.response?.data?.message || err.message}`);
      } finally { setUploadingFile(false); }
    }
    e.target.value = '';
  };

  const removeFile = (id) => setAttachedFiles(prev => prev.filter(f => f.id !== id));

  // ── Send message ─────────────────────────────────────────
  const handleSend = useCallback(async (overrideContent) => {
    const content = (overrideContent || input).trim();
    if (!content || isLoading) return;

    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setIsLoading(true);

    let chatId = id;
    if (!chatId) {
      const result = await dispatch(createChat({ model: selectedModel }));
      if (!result.payload?.chat) { setIsLoading(false); return; }
      chatId = result.payload.chat._id;
      navigate(`/chat/${chatId}`, { replace: true });
    }

    // Build message with file context
    let fullContent = content;
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles
        .filter(f => f.extractedText)
        .map(f => `\n\n[File: ${f.name}]\n${f.extractedText.slice(0, 3000)}`)
        .join('');
      if (fileContext) fullContent = content + fileContext;
    }

    const userMsg = {
      _id: Date.now().toString(), role: 'user', content,
      attachments: attachedFiles.map(f => ({ name: f.name, type: f.type, url: f.url })),
      createdAt: new Date().toISOString(),
    };
    dispatch(addMessage(userMsg));
    setAttachedFiles([]);

    dispatch(setStreaming(true));
    dispatch(clearStreamingContent());

    const controller = new AbortController();
    setAbortCtrl(controller);

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ content: fullContent, model: selectedModel, webSearch: webSearchEnabled }),
        signal: controller.signal,
      });

      if (!resp.ok) { toast.error('Failed to get response'); return; }

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'chunk') dispatch(appendStreamingContent(parsed.content));
            else if (parsed.type === 'error') toast.error(parsed.message || 'AI error');
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
      dispatch(setStreaming(false));
      dispatch(clearStreamingContent());
      if (chatId) dispatch(fetchMessages(chatId));
      setAbortCtrl(null);
    }
  }, [input, id, isLoading, selectedModel, webSearchEnabled, attachedFiles, dispatch, navigate]);

  const handleStop = () => { abortCtrl?.abort(); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)', backdropFilter: 'blur(12px)' }}>
        {!sidebarOpen && (
          <button onClick={() => dispatch(setSidebarOpen(true))}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <PanelLeft size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
            {currentChat?.title || 'New Chat'}
          </h2>
        </div>
        <ModelSelector />
      </div>

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {!hasMessages && !isStreaming ? (
          <ChatWelcome onSuggestion={t => setInput(t)} userName={user?.name} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div key={msg._id || i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <MessageBubble message={msg} isLast={i === messages.length - 1}
                    onRegenerate={i === messages.length - 1 && msg.role === 'assistant' ? handleSend : null} />
                </motion.div>
              ))}
            </AnimatePresence>

            {isStreaming && streamingContent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <MessageBubble message={{ role: 'assistant', content: streamingContent, _id: 'streaming' }} isStreaming />
              </motion.div>
            )}
            {isStreaming && !streamingContent && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            onClick={scrollToBottom}
            className="absolute bottom-28 right-6 p-2 rounded-full shadow-lg transition-colors"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── INPUT AREA ───────────────────────────────────────── */}
      <div className="border-t p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="max-w-3xl mx-auto">

          {/* Attached files preview */}
          <AnimatePresence>
            {attachedFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 mb-3">
                {attachedFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {f.type === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => removeFile(f.id)}
                      className="hover:text-red-400 transition-colors" style={{ color: 'var(--text-faint)' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {uploadingFile && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <Loader2 size={12} className="animate-spin" /> Uploading…
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main input box */}
          <div className="relative rounded-2xl border transition-all"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}>

            {/* Listening indicator */}
            <AnimatePresence>
              {listening && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-3 right-14 flex items-center gap-1.5 text-xs text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Listening…
                </motion.div>
              )}
            </AnimatePresence>

            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={handleKeyDown}
              placeholder={listening ? 'Listening… speak now' : 'Message AI Nexus… (Shift+Enter for new line)'}
              rows={1}
              className="w-full bg-transparent px-4 pt-4 pb-12 resize-none focus:outline-none text-sm leading-relaxed"
              style={{ color: 'var(--text-primary)', minHeight: '56px', maxHeight: '200px' }}
            />

            {/* Bottom toolbar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1">

                {/* Web Search Toggle */}
                <button onClick={() => dispatch(toggleWebSearch())}
                  title={webSearchEnabled ? 'Web search ON — click to disable' : 'Enable web search'}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    webSearchEnabled
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                      : 'border border-transparent hover:border-white/10'
                  }`}
                  style={{ color: webSearchEnabled ? undefined : 'var(--text-faint)' }}>
                  <Globe size={13} />
                  <span className="hidden sm:inline">Search</span>
                  {webSearchEnabled && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                </button>

                {/* File attach */}
                <input ref={fileInputRef} type="file" className="hidden"
                  multiple accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Attach file (PDF, DOCX, TXT, Image)"
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ color: attachedFiles.length > 0 ? '#a78bfa' : 'var(--text-faint)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  {attachedFiles.length > 0 && (
                    <span className="ml-0.5 text-xs font-medium text-brand-400">{attachedFiles.length}</span>
                  )}
                </button>

                {/* Voice input */}
                <button onClick={listening ? stopVoice : startVoice}
                  title={listening ? 'Stop recording' : 'Voice input (click to speak)'}
                  className={`p-1.5 rounded-lg transition-all ${listening ? 'bg-red-500/20 text-red-400 animate-pulse' : ''}`}
                  style={{ color: listening ? undefined : 'var(--text-faint)' }}
                  onMouseEnter={e => { if (!listening) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!listening) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  {listening ? <MicOff size={14} /> : <Mic size={14} />}
                </button>

              </div>

              {/* Send / Stop */}
              {isLoading ? (
                <button onClick={handleStop} title="Stop generation"
                  className="p-2 rounded-xl transition-colors bg-red-500/20 hover:bg-red-500/30 text-red-400">
                  <Square size={14} />
                </button>
              ) : (
                <button onClick={() => handleSend()} disabled={!input.trim() && attachedFiles.length === 0}
                  className="p-2 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#7c3aed', color: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6d28d9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7c3aed'}>
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-faint)' }}>
              {webSearchEnabled && (
                <span className="flex items-center gap-1 text-brand-400">
                  <Globe size={10} /> Web search active
                </span>
              )}
              {attachedFiles.length > 0 && (
                <span className="flex items-center gap-1 text-purple-400">
                  <Paperclip size={10} /> {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''} attached
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
