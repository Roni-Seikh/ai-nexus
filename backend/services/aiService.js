const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const builtinAI = require('./builtinAI');
const logger = require('../utils/logger');

// ── Helper: is this key real? ──────────────────────────────────────────────────
const isValidKey = (key) => {
  if (!key) return false;
  const fakes = ['sk-...','sk-ant-...','AIza...','sk-or-...','tvly-...','sk-ant-api03-...','AQ.Ab8RN6'];
  if (fakes.some(f => key.startsWith(f.replace('...','')))) return false;
  return key.length > 20;
};

// ── Clients ────────────────────────────────────────────────────────────────────
const getAnthropicClient = (key) => new Anthropic({ apiKey: key || process.env.ANTHROPIC_API_KEY });
const getGeminiClient    = (key) => new GoogleGenerativeAI(key || process.env.GOOGLE_GEMINI_API_KEY);

// ── OpenRouter streamer ────────────────────────────────────────────────────────
const streamOpenRouter = async (messages, model, options, onChunk, apiKey) => {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!isValidKey(key)) throw new Error('No valid OpenRouter key');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
      'X-Title': 'AI Nexus',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${err.slice(0,150)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content || '';
        if (delta) { fullContent += delta; onChunk(delta); }
      } catch {}
    }
  }
  return { content: fullContent, model, provider: 'openrouter', tokens: { prompt:0, completion:0, total:0 } };
};

// ── Anthropic streamer ─────────────────────────────────────────────────────────
const streamAnthropic = async (messages, model, options, systemPrompt, onChunk, apiKey) => {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!isValidKey(key)) throw new Error('No valid Anthropic key');

  const client = getAnthropicClient(key);
  const filtered = messages.filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  const stream = await client.messages.stream({
    model,
    max_tokens: options.maxTokens || 2048,
    system: systemPrompt || 'You are a helpful AI assistant.',
    messages: filtered,
    temperature: options.temperature || 0.7,
  });

  let fullContent = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullContent += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }
  const final = await stream.finalMessage();
  return {
    content: fullContent, model, provider: 'anthropic',
    tokens: { prompt: final.usage.input_tokens, completion: final.usage.output_tokens, total: final.usage.input_tokens + final.usage.output_tokens },
  };
};

// ── Gemini streamer — ONLY used if key starts with AIzaSy ─────────────────────
const streamGemini = async (messages, model, options, onChunk, apiKey) => {
  const key = apiKey || process.env.GOOGLE_GEMINI_API_KEY;
  // Hard check — reject anything that isn't a real Gemini key
  if (!key || !key.startsWith('AIzaSy')) throw new Error('Invalid Gemini key format — must start with AIzaSy');

  const client = getGeminiClient(key);
  const geminiMod = client.getGenerativeModel({ model });
  const systemMsg = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const history = messages.filter(m => m.role !== 'system').slice(0,-1)
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const lastMsg = messages.filter(m => m.role !== 'system').at(-1);
  const userInput = systemMsg ? `${systemMsg}\n\n${lastMsg.content}` : lastMsg.content;

  const chat = geminiMod.startChat({ history, generationConfig: { maxOutputTokens: options.maxTokens || 2048, temperature: options.temperature || 0.7 } });
  const result = await chat.sendMessageStream(userInput);
  let fullContent = '';
  for await (const chunk of result.stream) {
    const t = chunk.text(); fullContent += t; onChunk(t);
  }
  const usage = (await result.response).usageMetadata || {};
  return { content: fullContent, model, provider: 'google',
    tokens: { prompt: usage.promptTokenCount||0, completion: usage.candidatesTokenCount||0, total: usage.totalTokenCount||0 } };
};

// ── MAIN: smart waterfall ──────────────────────────────────────────────────────
exports.streamChat = async (messages, model, options = {}, onChunk, userApiKeys = {}) => {
  const systemPrompt  = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const orKey         = userApiKeys.openrouter || process.env.OPENROUTER_API_KEY;
  const anthropicKey  = userApiKeys.anthropic  || process.env.ANTHROPIC_API_KEY;
  const geminiKey     = userApiKeys.gemini     || process.env.GOOGLE_GEMINI_API_KEY;

  const hasOR       = isValidKey(orKey);
  const hasAnthropic= isValidKey(anthropicKey);
  // Gemini ONLY valid if key starts with AIzaSy
  const hasGemini   = geminiKey && geminiKey.startsWith('AIzaSy') && geminiKey.length > 30;

  logger.debug(`[AI] model=${model} | OpenRouter=${hasOR} | Claude=${hasAnthropic} | Gemini=${hasGemini}`);

  // ── Built-in model — no API needed ────────────────────────────────────────
  if (model === 'nexus-builtin' || (!hasOR && !hasAnthropic && !hasGemini)) {
    logger.debug('[AI] Using built-in model');
    return await builtinAI.generate(messages, onChunk);
  }

  // ── 1st: OpenRouter (best free option) ────────────────────────────────────
  if (hasOR) {
    const orModel = model.includes('/') ? model : 'anthropic/claude-3-haiku';
    try {
      logger.debug(`[AI] OpenRouter → ${orModel}`);
      return await streamOpenRouter(messages, orModel, options, onChunk, orKey);
    } catch (err) {
      logger.warn(`[AI] OpenRouter failed: ${err.message} — trying next`);
    }
    // Try free fallbacks on OpenRouter
    for (const fm of ['google/gemini-2.0-flash-exp:free','meta-llama/llama-3.1-8b-instruct:free','mistralai/mistral-7b-instruct:free']) {
      try {
        logger.debug(`[AI] OpenRouter fallback → ${fm}`);
        return await streamOpenRouter(messages, fm, options, onChunk, orKey);
      } catch (err) {
        logger.warn(`[AI] ${fm} failed: ${err.message}`);
      }
    }
  }

  // ── 2nd: Direct Anthropic ─────────────────────────────────────────────────
  if (hasAnthropic) {
    try {
      const claudeModel = model.startsWith('claude-') ? model : 'claude-3-haiku-20240307';
      logger.debug(`[AI] Direct Anthropic → ${claudeModel}`);
      return await streamAnthropic(messages, claudeModel, options, systemPrompt, onChunk, anthropicKey);
    } catch (err) {
      logger.warn(`[AI] Direct Anthropic failed: ${err.message}`);
    }
  }

  // ── 3rd: Direct Gemini (only if key is valid AIzaSy format) ──────────────
  if (hasGemini) {
    try {
      const gModel = model.startsWith('gemini-') ? model : 'gemini-2.0-flash';
      logger.debug(`[AI] Direct Gemini → ${gModel}`);
      return await streamGemini(messages, gModel, options, onChunk, geminiKey);
    } catch (err) {
      logger.warn(`[AI] Direct Gemini failed: ${err.message}`);
    }
  }

  // ── Final fallback: built-in ──────────────────────────────────────────────
  logger.warn('[AI] All providers failed — using built-in model');
  return await builtinAI.generate(messages, onChunk);
};

// ── Title generation ───────────────────────────────────────────────────────────
exports.generateTitle = async (firstMessage) => {
  const prompt = `Generate a concise 3-6 word title. Return ONLY the title, no quotes:\n\n${firstMessage.slice(0,200)}`;
  const dummy = () => {};

  if (isValidKey(process.env.OPENROUTER_API_KEY)) {
    try {
      const r = await streamOpenRouter([{ role:'user', content:prompt }], 'anthropic/claude-3-haiku', { maxTokens:20 }, dummy);
      if (r.content.trim()) return r.content.trim().slice(0,60);
    } catch {}
  }
  if (isValidKey(process.env.ANTHROPIC_API_KEY)) {
    try {
      const client = getAnthropicClient();
      const msg = await client.messages.create({ model:'claude-3-haiku-20240307', max_tokens:20, messages:[{role:'user',content:prompt}] });
      const t = msg.content[0]?.text?.trim();
      if (t) return t.slice(0,60);
    } catch {}
  }
  // Builtin title from first 6 words
  return firstMessage.trim().split(/\s+/).slice(0,6).join(' ') || 'New Chat';
};

// ── Image generation ───────────────────────────────────────────────────────────
exports.generateImage = async () => {
  throw new Error('Image generation requires an OpenAI API key with credits.');
};

// ── Available models ───────────────────────────────────────────────────────────
exports.AVAILABLE_MODELS = [
  { id:'nexus-builtin',                           name:'Nexus Built-in',       provider:'builtin',    description:'No API key needed — always works', icon:'🧠', plan:'free' },
  { id:'anthropic/claude-3-haiku',                name:'Claude 3 Haiku',       provider:'openrouter', description:'Fast Claude via OpenRouter (free)',  icon:'🌸', plan:'free' },
  { id:'google/gemini-2.0-flash-exp:free',        name:'Gemini 2.0 Flash',     provider:'openrouter', description:'Free Gemini via OpenRouter',         icon:'💎', plan:'free' },
  { id:'meta-llama/llama-3.1-8b-instruct:free',   name:'Llama 3.1 8B',         provider:'openrouter', description:'Free open-source model',            icon:'🦙', plan:'free' },
  { id:'mistralai/mistral-7b-instruct:free',       name:'Mistral 7B',           provider:'openrouter', description:'Free Mistral model',                icon:'🌀', plan:'free' },
  { id:'claude-3-haiku-20240307',                  name:'Claude Haiku (Direct)',provider:'anthropic',  description:'Direct Anthropic key required',     icon:'🎭', plan:'free' },
  { id:'claude-3-5-sonnet-20241022',               name:'Claude 3.5 Sonnet',   provider:'anthropic',  description:'Best Claude (own key)',             icon:'🎶', plan:'free' },
  { id:'gemini-2.0-flash',                         name:'Gemini (Direct)',      provider:'google',     description:'Direct Gemini key (AIzaSy...)',     icon:'🔮', plan:'free' },
];

exports.PRIMARY_MODEL  = 'anthropic/claude-3-haiku';
exports.FALLBACK_MODEL = 'nexus-builtin';
