'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

const TIMEOUT_MS = 30000;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const PROVIDER_CONFIGS = {
  openai: {
    getConfig(cm) {
      const baseUrl = cm.get('api.openai.baseUrl', 'https://api.openai.com/v1');
      const key = cm.getSecret('api.openai.key');
      return { baseUrl, key };
    },
    buildPingRequest(cfg) {
      const url = new URL(cfg.baseUrl + '/models');
      return { method: 'GET', url, headers: { 'Authorization': `Bearer ${cfg.key}` } };
    },
    buildChatRequest(cfg, messages, options) {
      const url = new URL(cfg.baseUrl + '/chat/completions');
      const body = {
        model: options.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature !== undefined ? options.temperature : 0.7
      };
      if (options.stream !== undefined) body.stream = options.stream;
      return {
        method: 'POST',
        url,
        headers: {
          'Authorization': `Bearer ${cfg.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      };
    },
    parseResponse(data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) return { text: null, error: parsed.error.message || JSON.stringify(parsed.error) };
        if (parsed.choices && parsed.choices.length > 0) {
          return { text: parsed.choices[0].message.content, usage: parsed.usage };
        }
        return { text: null, error: 'No choices in response' };
      } catch (e) {
        return { text: null, error: 'Failed to parse response: ' + e.message };
      }
    }
  },
  anthropic: {
    getConfig(cm) {
      const baseUrl = cm.get('api.anthropic.baseUrl', 'https://api.anthropic.com/v1');
      const key = cm.getSecret('api.anthropic.key');
      return { baseUrl, key };
    },
    buildPingRequest(cfg) {
      // Anthropic doesn't have a simple /models endpoint; use messages with minimal payload
      // We'll just do a GET to the base to check connectivity
      const url = new URL(cfg.baseUrl.replace('/v1', '') + '/');
      return { method: 'GET', url, headers: {} };
    },
    buildChatRequest(cfg, messages, options) {
      const url = new URL(cfg.baseUrl + '/messages');
      // Convert OpenAI-style messages to Anthropic format
      let system = '';
      const anthropicMessages = [];
      for (const msg of messages) {
        if (msg.role === 'system') {
          system += (system ? '\n' : '') + msg.content;
        } else {
          anthropicMessages.push({ role: msg.role, content: msg.content });
        }
      }
      const body = {
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 1024,
        messages: anthropicMessages
      };
      if (system) body.system = system;
      return {
        method: 'POST',
        url,
        headers: {
          'x-api-key': cfg.key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      };
    },
    parseResponse(data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) return { text: null, error: parsed.error.message || JSON.stringify(parsed.error) };
        if (parsed.content && parsed.content.length > 0) {
          const textParts = parsed.content.filter(b => b.type === 'text').map(b => b.text);
          return { text: textParts.join(''), usage: parsed.usage };
        }
        return { text: null, error: 'No content in response' };
      } catch (e) {
        return { text: null, error: 'Failed to parse response: ' + e.message };
      }
    }
  },
  google: {
    getConfig(cm) {
      const key = cm.getSecret('api.google.key');
      return { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', key };
    },
    buildPingRequest(cfg) {
      const url = new URL(cfg.baseUrl + '/models?key=' + cfg.key);
      return { method: 'GET', url, headers: {} };
    },
    buildChatRequest(cfg, messages, options) {
      const model = options.model || 'gemini-2.0-flash';
      const url = new URL(`${cfg.baseUrl}/models/${model}:generateContent?key=${cfg.key}`);
      // Convert to Google format
      const contents = [];
      for (const msg of messages) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: msg.content }] });
      }
      const body = { contents };
      if (options.maxTokens || options.temperature !== undefined) {
        body.generationConfig = {};
        if (options.maxTokens) body.generationConfig.maxOutputTokens = options.maxTokens;
        if (options.temperature !== undefined) body.generationConfig.temperature = options.temperature;
      }
      return {
        method: 'POST',
        url,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      };
    },
    parseResponse(data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) return { text: null, error: parsed.error.message || JSON.stringify(parsed.error) };
        if (parsed.candidates && parsed.candidates.length > 0) {
          const parts = parsed.candidates[0].content.parts;
          const text = parts.map(p => p.text || '').join('');
          return { text, usage: parsed.usageMetadata };
        }
        return { text: null, error: 'No candidates in response' };
      } catch (e) {
        return { text: null, error: 'Failed to parse response: ' + e.message };
      }
    }
  },
  ollama: {
    getConfig(cm) {
      const baseUrl = cm.get('api.ollama.baseUrl', 'http://localhost:11434/v1');
      return { baseUrl, key: '' };
    },
    buildPingRequest(cfg) {
      const url = new URL(cfg.baseUrl + '/models');
      return { method: 'GET', url, headers: {} };
    },
    buildChatRequest(cfg, messages, options) {
      const url = new URL(cfg.baseUrl + '/chat/completions');
      const body = {
        model: options.model || 'llama3',
        messages,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature !== undefined ? options.temperature : 0.7
      };
      return {
        method: 'POST',
        url,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      };
    },
    parseResponse(data) {
      // Ollama uses OpenAI-compatible format
      return PROVIDER_CONFIGS.openai.parseResponse(data);
    }
  }
};

function httpRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: { ...headers },
      timeout: TIMEOUT_MS
    };
    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = lib.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after ' + TIMEOUT_MS + 'ms'));
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

class GatewayManager {
  constructor(configManager) {
    this.config = configManager;
    this._status = {};       // { provider: { connected, latency, lastCheck, error } }
    this._rateLimits = {};   // { provider: { count, windowStart } }
  }

  async init() {
    const providers = Object.keys(PROVIDER_CONFIGS);
    for (const provider of providers) {
      try {
        const cfg = PROVIDER_CONFIGS[provider].getConfig(this.config);
        this._status[provider] = {
          configured: !!(cfg.key || provider === 'ollama'),
          connected: false,
          latency: null,
          lastCheck: null,
          error: null
        };
      } catch (e) {
        this._status[provider] = {
          configured: false,
          connected: false,
          latency: null,
          lastCheck: null,
          error: e.message
        };
      }
    }
    return this._status;
  }

  _checkRateLimit(provider) {
    const now = Date.now();
    if (!this._rateLimits[provider]) {
      this._rateLimits[provider] = { count: 0, windowStart: now };
    }
    const rl = this._rateLimits[provider];
    if (now - rl.windowStart > RATE_LIMIT_WINDOW_MS) {
      rl.count = 0;
      rl.windowStart = now;
    }
    if (rl.count >= RATE_LIMIT_MAX_REQUESTS) {
      const waitMs = RATE_LIMIT_WINDOW_MS - (now - rl.windowStart);
      throw new Error(`Rate limit exceeded for ${provider}. Try again in ${Math.ceil(waitMs / 1000)}s.`);
    }
    rl.count++;
  }

  async testConnection(provider) {
    const providerCfg = PROVIDER_CONFIGS[provider];
    if (!providerCfg) {
      return { status: 'error', latency: null, error: `Unknown provider: ${provider}` };
    }
    const cfg = providerCfg.getConfig(this.config);
    if (!cfg.key && provider !== 'ollama') {
      const result = { status: 'not_configured', latency: null, error: 'No API key set' };
      this._status[provider] = { ...this._status[provider], ...result, lastCheck: new Date().toISOString() };
      return result;
    }
    const req = providerCfg.buildPingRequest(cfg);
    const start = Date.now();
    try {
      const res = await httpRequest(req.method, req.url, req.headers, req.body);
      const latency = Date.now() - start;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        this._status[provider] = {
          configured: true, connected: true, latency,
          lastCheck: new Date().toISOString(), error: null
        };
        return { status: 'connected', latency, error: null };
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        const msg = `Auth failed (${res.statusCode})`;
        this._status[provider] = {
          configured: true, connected: false, latency,
          lastCheck: new Date().toISOString(), error: msg
        };
        return { status: 'auth_error', latency, error: msg };
      } else {
        const msg = `HTTP ${res.statusCode}`;
        this._status[provider] = {
          configured: true, connected: false, latency,
          lastCheck: new Date().toISOString(), error: msg
        };
        return { status: 'error', latency, error: msg };
      }
    } catch (e) {
      const latency = Date.now() - start;
      this._status[provider] = {
        configured: true, connected: false, latency,
        lastCheck: new Date().toISOString(), error: e.message
      };
      return { status: 'error', latency, error: e.message };
    }
  }

  async testAll() {
    const results = {};
    const providers = Object.keys(PROVIDER_CONFIGS);
    const promises = providers.map(async (p) => {
      results[p] = await this.testConnection(p);
    });
    await Promise.all(promises);
    return results;
  }

  async chat(provider, messages, options) {
    options = options || {};
    const providerCfg = PROVIDER_CONFIGS[provider];
    if (!providerCfg) throw new Error(`Unknown provider: ${provider}`);

    this._checkRateLimit(provider);

    const cfg = providerCfg.getConfig(this.config);
    if (!cfg.key && provider !== 'ollama') {
      throw new Error(`No API key configured for ${provider}. Use setApiKey('${provider}', key) first.`);
    }

    const req = providerCfg.buildChatRequest(cfg, messages, options);

    const res = await httpRequest(req.method, req.url, req.headers, req.body);

    // Handle rate limit response
    if (res.statusCode === 429) {
      const retryAfter = res.headers['retry-after'];
      const msg = `Rate limited by ${provider}` + (retryAfter ? `. Retry after ${retryAfter}s` : '');
      const err = new Error(msg);
      err.statusCode = 429;
      err.retryAfter = retryAfter;
      throw err;
    }

    // Handle auth errors
    if (res.statusCode === 401 || res.statusCode === 403) {
      throw new Error(`Authentication failed for ${provider} (HTTP ${res.statusCode})`);
    }

    // Handle server errors
    if (res.statusCode >= 500) {
      throw new Error(`Server error from ${provider} (HTTP ${res.statusCode}): ${res.body.substring(0, 200)}`);
    }

    // Parse response
    const parsed = providerCfg.parseResponse(res.body);
    if (parsed.error) {
      throw new Error(`${provider} API error: ${parsed.error}`);
    }

    return {
      text: parsed.text,
      usage: parsed.usage || null,
      provider,
      statusCode: res.statusCode
    };
  }

  getProviders() {
    const result = [];
    for (const [name, info] of Object.entries(this._status)) {
      result.push({ name, ...info });
    }
    return result;
  }

  getProviderStatus(provider) {
    return this._status[provider] || {
      configured: false, connected: false, latency: null, lastCheck: null, error: null
    };
  }

  setApiKey(provider, key) {
    const keyMap = {
      openai: 'api.openai.key',
      anthropic: 'api.anthropic.key',
      google: 'api.google.key'
    };
    const configKey = keyMap[provider];
    if (!configKey) throw new Error(`Cannot set API key for provider: ${provider}`);
    this.config.setSecret(configKey, key);
    // Update status
    if (this._status[provider]) {
      this._status[provider].configured = true;
    }
  }

  getApiKey(provider) {
    const keyMap = {
      openai: 'api.openai.key',
      anthropic: 'api.anthropic.key',
      google: 'api.google.key'
    };
    const configKey = keyMap[provider];
    if (!configKey) return null;
    return this.config.getSecret(configKey);
  }
}

module.exports = { GatewayManager };
