const https = require('https');
const logger = require('../utils/logger');

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

// Model map for Pollinations
const POLLINATIONS_MODELS = {
  'pollinations-flux':   'flux',
  'pollinations-turbo':  'turbo',
  'pollinations-stable': 'stable-diffusion',
};

// Build Pollinations URL
const buildPollinationsUrl = (prompt, options = {}) => {
  const { width = 1024, height = 1024, model = 'flux', seed, nologo = true } = options;
  const encoded = encodeURIComponent(prompt);
  const params  = new URLSearchParams({ width, height, model, nologo, seed: seed || Math.floor(Math.random() * 99999) });
  return `${POLLINATIONS_BASE}/${encoded}?${params.toString()}`;
};

// Generate with Pollinations (free, no key)
exports.generateFree = async (prompt, options = {}) => {
  const { size = '1024x1024', model = 'pollinations-flux', n = 1 } = options;
  const [width, height] = size.split('x').map(Number);
  const polModel = POLLINATIONS_MODELS[model] || 'flux';

  const urls = [];
  for (let i = 0; i < Math.min(n, 4); i++) {
    const seed = Math.floor(Math.random() * 99999);
    const url  = buildPollinationsUrl(prompt, { width, height, model: polModel, seed, nologo: true });
    urls.push(url);
  }

  return { urls, revisedPrompt: null, provider: 'pollinations' };
};

// Try OpenAI DALL-E if key available, otherwise use Pollinations
exports.generateImage = async (prompt, options = {}, apiKey) => {
  const { model = 'pollinations-flux' } = options;
  const isDallE = model.startsWith('dall-e');

  // If DALL-E requested and key available
  if (isDallE && apiKey && !apiKey.startsWith('sk-...') && apiKey.length > 20) {
    try {
      const OpenAI  = require('openai');
      const client  = new OpenAI({ apiKey });
      const { size = '1024x1024', quality = 'standard', style = 'vivid', n = 1 } = options;
      const response = await client.images.generate({
        model, prompt, n: model === 'dall-e-3' ? 1 : Math.min(n, 4),
        size, quality: model === 'dall-e-3' ? quality : undefined,
        style: model === 'dall-e-3' ? style : undefined, response_format: 'url',
      });
      return { urls: response.data.map(d => d.url), revisedPrompt: response.data[0]?.revised_prompt, provider: 'openai' };
    } catch (err) {
      logger.warn('DALL-E failed, falling back to Pollinations:', err.message);
    }
  }

  // Free Pollinations fallback
  return exports.generateFree(prompt, options);
};

exports.AVAILABLE_IMAGE_MODELS = [
  { id: 'pollinations-flux',   name: 'Flux (Free)',          provider: 'pollinations', description: 'High quality, no API key needed', free: true },
  { id: 'pollinations-turbo',  name: 'Turbo (Free)',         provider: 'pollinations', description: 'Fast generation, no API key needed', free: true },
  { id: 'pollinations-stable', name: 'Stable Diffusion (Free)', provider: 'pollinations', description: 'Classic SD model, free', free: true },
  { id: 'dall-e-3',            name: 'DALL-E 3',             provider: 'openai',        description: 'Best quality (OpenAI key required)', free: false },
  { id: 'dall-e-2',            name: 'DALL-E 2',             provider: 'openai',        description: 'Faster DALL-E (OpenAI key required)', free: false },
];