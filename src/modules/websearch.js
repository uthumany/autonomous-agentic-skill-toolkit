'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');

class WebSearchEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy', 'webcache');
    this.ttl = 60 * 60 * 1000; // 1 hour
  }

  async init() {
    await fs.promises.mkdir(this.baseDir, { recursive: true });
  }

  _cacheKey(prefix, value) {
    const hash = crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
    return path.join(this.baseDir, `${prefix}_${hash}.json`);
  }

  async _readCache(filePath) {
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const entry = JSON.parse(raw);
      if (Date.now() - entry.cachedAt < this.ttl) return entry.data;
      await fs.promises.unlink(filePath).catch(() => {});
    } catch { /* miss */ }
    return null;
  }

  async _writeCache(filePath, data) {
    await fs.promises.writeFile(filePath, JSON.stringify({ cachedAt: Date.now(), data }), 'utf8');
  }

  _httpRequest(urlOrOptions, body) {
    return new Promise((resolve, reject) => {
      const isHttps = typeof urlOrOptions === 'string'
        ? urlOrOptions.startsWith('https')
        : (urlOrOptions.port === 443 || urlOrOptions.protocol === 'https:');
      const mod = isHttps ? https : http;
      const req = mod.request(urlOrOptions, { timeout: 15000 }, res => {
        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, typeof urlOrOptions === 'string' ? urlOrOptions : undefined);
          resolve(this._httpRequest(redirectUrl.toString(), body));
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), headers: res.headers }));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      if (body) req.write(body);
      req.end();
    });
  }

  async search(query, limit = 10) {
    const cacheFile = this._cacheKey('search', `${query}:${limit}`);
    const cached = await this._readCache(cacheFile);
    if (cached) return cached;

    const postData = `q=${encodeURIComponent(query)}`;
    const options = {
      method: 'POST',
      hostname: 'html.duckduckgo.com',
      path: '/html/',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const response = await this._httpRequest(options, postData);
    const html = response.body;

    const results = [];
    // DuckDuckGo HTML results: each result is in a div with class "result"
    // Pattern: <a rel="nofollow" class="result__a" href="URL">TITLE</a> ... <a class="result__snippet" ...>SNIPPET</a>
    // Also try: <a class="result__url" href="URL" ... and <a class="result__snippet" href="...">snippet</a>
    const resultBlocks = html.split(/class="result\s/);

    for (let i = 1; i < resultBlocks.length && results.length < limit; i++) {
      const block = resultBlocks[i];

      // Extract URL from result__a or result__url
      const urlMatch = block.match(/class="result__a"[^>]*href="([^"]+)"/) ||
                        block.match(/class="result__url"[^>]*href="([^"]+)"/);
      // Extract title from result__a
      const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      // Extract snippet from result__snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) ||
                           block.match(/class="result__snippet"[^>]*>([\s\S]*?)\s*<\/td>/);

      if (urlMatch) {
        let url = urlMatch[1];
        // DDG wraps URLs through redirect; try to extract the actual URL from the href
        const uddgMatch = url.match(/uddg=([^&]+)/);
        if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);

        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        if (url.startsWith('http') && title) {
          results.push({ title, url, snippet });
        }
      }
    }

    await this._writeCache(cacheFile, results);
    return results;
  }

  async extract(url) {
    const cacheFile = this._cacheKey('extract', url);
    const cached = await this._readCache(cacheFile);
    if (cached) return cached;

    const response = await this._httpRequest(url);
    const html = response.body;

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

    // Strip scripts, styles, and HTML tags
    let content = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    const result = { title, content, url, fetched: new Date().toISOString() };
    await this._writeCache(cacheFile, result);
    return result;
  }

  async cacheClear() {
    const files = await fs.promises.readdir(this.baseDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        await fs.promises.unlink(path.join(this.baseDir, f)).catch(() => {});
      }
    }
  }

  async cacheStats() {
    let entries = 0;
    let totalSize = 0;
    try {
      const files = await fs.promises.readdir(this.baseDir);
      for (const f of files) {
        if (f.endsWith('.json')) {
          entries++;
          try {
            const stat = await fs.promises.stat(path.join(this.baseDir, f));
            totalSize += stat.size;
          } catch { /* skip */ }
        }
      }
    } catch { /* dir doesn't exist */ }
    return { entries, totalSize };
  }
}

module.exports = { WebSearchEngine };
