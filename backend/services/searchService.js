const https = require('https');
const http  = require('http');
const axios = require('axios');
const logger = require('../utils/logger');

// ── DDG instant answer ───────────────────────────────────────
const ddgSearch = (q) => new Promise((resolve) => {
  const path = `/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const req  = https.request(
    { hostname:'api.duckduckgo.com', path, method:'GET',
      headers:{'User-Agent':'Mozilla/5.0'}, timeout:6000 },
    (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          const out = [];
          if (j.AbstractText?.length > 10)
            out.push({ title: j.Heading||q, snippet: j.AbstractText, url: j.AbstractURL||'' });
          (j.RelatedTopics||[]).forEach(t => {
            if (t.Text && t.FirstURL && !t.Topics)
              out.push({ title: t.Text.slice(0,80), snippet: t.Text, url: t.FirstURL });
          });
          resolve(out.slice(0,5));
        } catch { resolve([]); }
      });
    });
  req.on('error', () => resolve([]));
  req.on('timeout', () => { req.destroy(); resolve([]); });
  req.end();
});

// ── Wikipedia ────────────────────────────────────────────────
const wikiSearch = async (q) => {
  try {
    const { data } = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
      { timeout:5000, headers:{'User-Agent':'AI-Nexus/1.0'} }
    );
    if (data.extract?.length > 20)
      return [{ title: data.title, snippet: data.extract.slice(0,500), url: data.content_urls?.desktop?.page||'' }];
  } catch {}
  return [];
};

// ── True HTTP scraper — visits the URL like a browser ────────
const scrapeURL = (rawUrl, depth=0) => new Promise((resolve) => {
  if (depth > 3) { resolve(null); return; }
  try {
    const parsed = new URL(rawUrl);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol==='https:'?443:80),
      path:     (parsed.pathname||'/') + (parsed.search||''),
      method:   'GET',
      timeout:  12000,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection':      'close',
        'Cache-Control':   'no-cache',
      },
    };
    const req = lib.request(opts, (res) => {
      // Follow redirects
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        try {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.protocol}//${parsed.hostname}${res.headers.location}`;
          resolve(scrapeURL(next, depth+1));
        } catch { resolve(null); }
        return;
      }
      const chunks = [];
      let total = 0;
      res.on('data', chunk => {
        chunks.push(chunk);
        total += chunk.length;
        if (total > 80000) req.destroy();
      });
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf8', 0, 80000);
        const get  = (...patterns) => {
          for (const p of patterns) {
            const m = html.match(p);
            if (m?.[1]?.trim().length > 2)
              return m[1].trim()
                .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
                .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ');
          }
          return '';
        };
        const title = get(
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{2,200})/i,
          /<meta[^>]+content=["']([^"']{2,200})["'][^>]+property=["']og:title/i,
          /<title[^>]*>([^<]{2,200})<\/title>/i
        );
        const desc  = get(
          /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{5,500})/i,
          /<meta[^>]+content=["']([^"']{5,500})["'][^>]+property=["']og:description/i,
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{5,500})/i,
          /<meta[^>]+content=["']([^"']{5,500})["'][^>]+name=["']description/i
        );
        if (title || desc) {
          resolve({
            title:   (title||parsed.hostname).slice(0,150),
            snippet: (desc ||`Website at ${rawUrl}`).slice(0,500),
            url:     rawUrl,
          });
        } else {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  } catch { resolve(null); }
});

// ── URL detector ─────────────────────────────────────────────
const isURL = (q) => {
  if (q.includes(' ')) return false;
  try { new URL(q.startsWith('http') ? q : 'https://'+q); return /\.\w{2,}/.test(q); }
  catch { return false; }
};

// ── Main ─────────────────────────────────────────────────────
exports.search = async (query, options = {}) => {
  const { maxResults = 8 } = options;

  // ── URL mode ────────────────────────────────────────────────
  if (isURL(query)) {
    const url    = query.startsWith('http') ? query : 'https://'+query;
    const domain = new URL(url).hostname.replace(/^www\./,'');
    logger.info(`[Search] URL scrape: ${url}`);

    // Run scrape + background searches in parallel
    const [scraped, ddg, wiki] = await Promise.all([
      scrapeURL(url),
      ddgSearch(domain),
      wikiSearch(domain),
    ]);

    const results = [];
    if (scraped) results.push(scraped);
    wiki.forEach(r => { if (!results.find(x=>x.url===r.url)) results.push(r); });
    ddg.forEach(r  => { if (!results.find(x=>x.url===r.url)) results.push(r); });

    // Always return something meaningful
    if (results.length === 0) {
      results.push({
        title:   domain,
        snippet: `I visited ${url} — the site appears to block automated access (common for apps like claude.ai, vercel apps, etc.). Here's what I know from my knowledge base: ${domain} is a website. Try searching for "${domain}" as plain text to find more info.`,
        url,
      });
    }
    return results.slice(0, maxResults);
  }

  // ── Text search ─────────────────────────────────────────────
  // Tavily
  if (process.env.TAVILY_API_KEY && !/^tvly-\.+$/.test(process.env.TAVILY_API_KEY) && process.env.TAVILY_API_KEY.length > 10) {
    try {
      const { data } = await axios.post('https://api.tavily.com/search',
        { api_key:process.env.TAVILY_API_KEY, query, search_depth:'basic', max_results:maxResults },
        { timeout:8000 });
      if (data.results?.length)
        return data.results.map(r=>({ title:r.title, url:r.url, snippet:r.content?.slice(0,300)||'', score:r.score }));
    } catch(e) { logger.warn('Tavily:',e.message); }
  }

  // Serper
  if (process.env.SERPER_API_KEY && process.env.SERPER_API_KEY.length > 5 && !process.env.SERPER_API_KEY.includes('...')) {
    try {
      const { data } = await axios.post('https://google.serper.dev/search',
        { q:query, num:maxResults },
        { headers:{'X-API-KEY':process.env.SERPER_API_KEY,'Content-Type':'application/json'}, timeout:8000 });
      if (data.organic?.length)
        return data.organic.map(r=>({ title:r.title, url:r.link, snippet:r.snippet, score:1 }));
    } catch(e) { logger.warn('Serper:',e.message); }
  }

  // Free fallback
  const [wiki, ddg] = await Promise.all([wikiSearch(query), ddgSearch(query)]);
  const seen = new Set();
  const out  = [...wiki, ...ddg].filter(r => {
    if (!r.snippet||seen.has(r.url)) return false;
    seen.add(r.url); return true;
  });
  return out.length > 0 ? out.slice(0,maxResults) : [{
    title: `Search: ${query}`,
    snippet: `No results found for "${query}". Add TAVILY_API_KEY or SERPER_API_KEY in backend/.env for better search results.`,
    url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  }];
};
