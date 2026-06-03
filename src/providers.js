'use strict';

/**
 * UTHY OS v2.0 — Provider Abstraction Layer
 * Supports 300+ AI model providers through unified interface.
 * OpenAI-compatible, Anthropic, Google, Ollama, OpenRouter, LiteLLM, and custom.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ════════════════════════════════════════════════════════════
// PROVIDER REGISTRY
// ════════════════════════════════════════════════════════════

const PROVIDER_TEMPLATES = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 128000, cost: { input: 0.0025, output: 0.01 } },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 128000, cost: { input: 0.00015, output: 0.0006 } },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 128000, cost: { input: 0.01, output: 0.03 } },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 16385, cost: { input: 0.0005, output: 0.0015 } },
      { id: 'o1', name: 'O1', maxTokens: 200000, cost: { input: 0.015, output: 0.06 } },
      { id: 'o1-mini', name: 'O1 Mini', maxTokens: 128000, cost: { input: 0.003, output: 0.012 } },
      { id: 'o3-mini', name: 'O3 Mini', maxTokens: 200000, cost: { input: 0.0011, output: 0.0044 } },
    ],
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    authHeader: 'x-api-key',
    authPrefix: '',
    format: 'anthropic',
    models: [
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', maxTokens: 200000, cost: { input: 0.003, output: 0.015 } },
      { id: 'claude-haiku', name: 'Claude Haiku', maxTokens: 200000, cost: { input: 0.00025, output: 0.00125 } },
      { id: 'claude-opus-4', name: 'Claude Opus 4', maxTokens: 200000, cost: { input: 0.015, output: 0.075 } },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', maxTokens: 200000, cost: { input: 0.003, output: 0.015 } },
    ],
  },
  google: {
    name: 'Google AI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authHeader: '',
    authPrefix: '',
    authQuery: true,
    format: 'google',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', maxTokens: 1000000, cost: { input: 0.00125, output: 0.005 } },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', maxTokens: 1000000, cost: { input: 0.000075, output: 0.0003 } },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', maxTokens: 1000000, cost: { input: 0.000075, output: 0.0003 } },
    ],
  },
  ollama: {
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    authHeader: '',
    authPrefix: '',
    format: 'openai',
    models: [
      { id: 'llama3', name: 'Llama 3', maxTokens: 8192, cost: { input: 0, output: 0 } },
      { id: 'llama3:70b', name: 'Llama 3 70B', maxTokens: 8192, cost: { input: 0, output: 0 } },
      { id: 'codellama', name: 'Code Llama', maxTokens: 16384, cost: { input: 0, output: 0 } },
      { id: 'mistral', name: 'Mistral', maxTokens: 32768, cost: { input: 0, output: 0 } },
      { id: 'mixtral', name: 'Mixtral', maxTokens: 32768, cost: { input: 0, output: 0 } },
      { id: 'phi3', name: 'Phi-3', maxTokens: 128000, cost: { input: 0, output: 0 } },
      { id: 'qwen2.5', name: 'Qwen 2.5', maxTokens: 131072, cost: { input: 0, output: 0 } },
      { id: 'deepseek-r1', name: 'DeepSeek R1', maxTokens: 65536, cost: { input: 0, output: 0 } },
    ],
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (OR)', maxTokens: 200000, cost: { input: 0.003, output: 0.015 } },
      { id: 'openai/gpt-4o', name: 'GPT-4o (OR)', maxTokens: 128000, cost: { input: 0.0025, output: 0.01 } },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (OR)', maxTokens: 1000000, cost: { input: 0.00125, output: 0.005 } },
      { id: 'meta-llama/llama-3.3-70b', name: 'Llama 3.3 70B (OR)', maxTokens: 131072, cost: { input: 0.0001, output: 0.0001 } },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OR)', maxTokens: 65536, cost: { input: 0.0005, output: 0.002 } },
      { id: 'qwen/qwen-2.5-72b', name: 'Qwen 2.5 72B (OR)', maxTokens: 131072, cost: { input: 0.0001, output: 0.0001 } },
      { id: 'mistralai/mistral-large', name: 'Mistral Large (OR)', maxTokens: 128000, cost: { input: 0.002, output: 0.006 } },
    ],
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', maxTokens: 131072, cost: { input: 0, output: 0 } },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', maxTokens: 131072, cost: { input: 0, output: 0 } },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', maxTokens: 32768, cost: { input: 0, output: 0 } },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', maxTokens: 8192, cost: { input: 0, output: 0 } },
    ],
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B', maxTokens: 130816, cost: { input: 0.0035, output: 0.0035 } },
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', maxTokens: 131072, cost: { input: 0.00088, output: 0.00088 } },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', maxTokens: 32768, cost: { input: 0.0012, output: 0.0012 } },
    ],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', maxTokens: 65536, cost: { input: 0.00014, output: 0.00028 } },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', maxTokens: 65536, cost: { input: 0.00055, output: 0.00219 } },
    ],
  },
  mistral: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', maxTokens: 128000, cost: { input: 0.002, output: 0.006 } },
      { id: 'mistral-small-latest', name: 'Mistral Small', maxTokens: 128000, cost: { input: 0.0002, output: 0.0006 } },
      { id: 'codestral-latest', name: 'Codestral', maxTokens: 32768, cost: { input: 0.001, output: 0.003 } },
    ],
  },
  cohere: {
    name: 'Cohere',
    baseUrl: 'https://api.cohere.com/v2',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'cohere',
    models: [
      { id: 'command-r-plus', name: 'Command R+', maxTokens: 128000, cost: { input: 0.0025, output: 0.01 } },
      { id: 'command-r', name: 'Command R', maxTokens: 128000, cost: { input: 0.00015, output: 0.0006 } },
    ],
  },
  fireworks: {
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B', maxTokens: 131072, cost: { input: 0.0009, output: 0.0009 } },
      { id: 'accounts/firemodels/deepseek-r1', name: 'DeepSeek R1', maxTokens: 65536, cost: { input: 0.0005, output: 0.002 } },
    ],
  },
  perplexity: {
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small', maxTokens: 128000, cost: { input: 0.0002, output: 0.0002 } },
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large', maxTokens: 128000, cost: { input: 0.001, output: 0.001 } },
    ],
  },
  xai: {
    name: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'grok-2', name: 'Grok 2', maxTokens: 131072, cost: { input: 0.002, output: 0.01 } },
      { id: 'grok-2-mini', name: 'Grok 2 Mini', maxTokens: 131072, cost: { input: 0.0003, output: 0.0005 } },
    ],
  },
  cerebras: {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'llama3.3-70b', name: 'Llama 3.3 70B', maxTokens: 8192, cost: { input: 0, output: 0 } },
      { id: 'llama3.1-8b', name: 'Llama 3.1 8B', maxTokens: 8192, cost: { input: 0, output: 0 } },
    ],
  },
  sambanova: {
    name: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    format: 'openai',
    models: [
      { id: 'Meta-Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B', maxTokens: 16384, cost: { input: 0, output: 0 } },
    ],
  },
};

// ════════════════════════════════════════════════════════════
// REQUEST HANDLER — Unified HTTP client
// ════════════════════════════════════════════════════════════

function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ════════════════════════════════════════════════════════════
// MESSAGE FORMATTERS — Per-provider format conversion
// ════════════════════════════════════════════════════════════

function formatOpenAIMessages(messages, systemPrompt) {
  const formatted = [];
  if (systemPrompt) formatted.push({ role: 'system', content: systemPrompt });
  for (const msg of messages) {
    formatted.push({ role: msg.role, content: msg.content });
  }
  return formatted;
}

function formatAnthropicMessages(messages, systemPrompt) {
  const formatted = [];
  for (const msg of messages) {
    if (msg.role === 'system') continue;
    formatted.push({ role: msg.role, content: msg.content });
  }
  return { messages: formatted, system: systemPrompt || undefined };
}

function formatGoogleMessages(messages, systemPrompt) {
  const contents = [];
  for (const msg of messages) {
    if (msg.role === 'system') continue;
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }
  return {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
  };
}

// ════════════════════════════════════════════════════════════
// PROVIDER CLASS
// ════════════════════════════════════════════════════════════

class Provider {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey || '';
    this.format = config.format || 'openai';
    this.authHeader = config.authHeader || '';
    this.authPrefix = config.authPrefix || '';
    this.authQuery = config.authQuery || false;
    this.models = config.models || [];
    this.rateLimitMs = config.rateLimitMs || 0;
    this._lastRequest = 0;
  }

  getModel(modelId) {
    return this.models.find(m => m.id === modelId);
  }

  async chat(messages, opts = {}) {
    // Rate limiting
    if (this.rateLimitMs) {
      const elapsed = Date.now() - this._lastRequest;
      if (elapsed < this.rateLimitMs) {
        await new Promise(r => setTimeout(r, this.rateLimitMs - elapsed));
      }
    }

    const model = opts.model || this.models[0]?.id;
    const maxTokens = opts.maxTokens || 4096;
    const temperature = opts.temperature ?? 0.7;
    const systemPrompt = opts.system;

    let url, body, headers = { 'Content-Type': 'application/json' };

    // Auth
    if (this.authQuery && this.apiKey) {
      url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    } else if (this.apiKey && this.authHeader) {
      headers[this.authHeader] = `${this.authPrefix}${this.apiKey}`;
    }

    // Format request per provider type
    switch (this.format) {
      case 'anthropic': {
        url = url || `${this.baseUrl}/messages`;
        const { messages: msgs, system } = formatAnthropicMessages(messages, systemPrompt);
        headers['anthropic-version'] = '2023-06-01';
        body = { model, max_tokens: maxTokens, messages: msgs, temperature };
        if (system) body.system = system;
        break;
      }
      case 'google': {
        url = url || `${this.baseUrl}/models/${model}:generateContent`;
        const googleBody = formatGoogleMessages(messages, systemPrompt);
        body = {
          ...googleBody,
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        };
        break;
      }
      case 'cohere': {
        url = `${this.baseUrl}/chat`;
        const lastMsg = messages[messages.length - 1];
        const chatHistory = messages.slice(0, -1).map(m => ({
          role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
          message: m.content,
        }));
        body = {
          model,
          message: lastMsg.content,
          chat_history: chatHistory,
          max_tokens: maxTokens,
          temperature,
        };
        if (systemPrompt) body.preamble = systemPrompt;
        break;
      }
      default: {
        // OpenAI-compatible (covers openai, openrouter, groq, together, etc.)
        url = url || `${this.baseUrl}/chat/completions`;
        body = {
          model,
          messages: formatOpenAIMessages(messages, systemPrompt),
          max_tokens: maxTokens,
          temperature,
        };
        break;
      }
    }

    const response = await makeRequest(url, { method: 'POST', headers }, body);
    this._lastRequest = Date.now();

    // Parse response per format
    return this._parseResponse(response);
  }

  async *streamChat(messages, opts = {}) {
    // Streaming variant — yields chunks
    const model = opts.model || this.models[0]?.id;
    const maxTokens = opts.maxTokens || 4096;
    const temperature = opts.temperature ?? 0.7;
    const systemPrompt = opts.system;

    let url, body, headers = { 'Content-Type': 'application/json' };

    if (this.apiKey && this.authHeader) {
      headers[this.authHeader] = `${this.authPrefix}${this.apiKey}`;
    }

    switch (this.format) {
      case 'anthropic': {
        url = `${this.baseUrl}/messages`;
        const { messages: msgs, system } = formatAnthropicMessages(messages, systemPrompt);
        headers['anthropic-version'] = '2023-06-01';
        body = { model, max_tokens: maxTokens, messages: msgs, temperature, stream: true };
        if (system) body.system = system;
        break;
      }
      default: {
        url = url || `${this.baseUrl}/chat/completions`;
        body = {
          model,
          messages: formatOpenAIMessages(messages, systemPrompt),
          max_tokens: maxTokens,
          temperature,
          stream: true,
        };
        break;
      }
    }

    // For streaming, we need to handle SSE
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;

    yield* new Promise((resolve, reject) => {
      const chunks = [];
      const req = transport.request(url, { method: 'POST', headers }, (res) => {
        let buffer = '';
        res.on('data', chunk => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') return;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) chunks.push(content);
              } catch {}
            }
          }
        });
        res.on('end', () => resolve(chunks));
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });

    for (const chunk of chunks) {
      yield chunk;
    }
  }

  _parseResponse(response) {
    // OpenAI format
    if (response.choices) {
      return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        usage: response.usage || {},
        finishReason: response.choices[0]?.finish_reason,
      };
    }
    // Anthropic format
    if (response.content) {
      return {
        content: response.content[0]?.text || '',
        model: response.model,
        usage: response.usage || {},
        finishReason: response.stop_reason,
      };
    }
    // Google format
    if (response.candidates) {
      return {
        content: response.candidates[0]?.content?.parts?.[0]?.text || '',
        model: response.modelVersion,
        usage: response.usageMetadata || {},
        finishReason: response.candidates[0]?.finishReason,
      };
    }
    // Cohere format
    if (response.text) {
      return {
        content: response.text || '',
        model: response.generation_id,
        usage: response.meta?.tokens || {},
        finishReason: response.finish_reason,
      };
    }
    // Fallback
    return { content: JSON.stringify(response), model: 'unknown', usage: {} };
  }
}

// ════════════════════════════════════════════════════════════
// MODEL ROUTER — Multi-provider with fallback & load balancing
// ════════════════════════════════════════════════════════════

class ModelRouter {
  constructor() {
    this.providers = new Map();
    this.fallbackChains = [];
    this.defaultProvider = null;
    this.defaultModel = null;
    this._usageLog = [];
  }

  addProvider(config) {
    const provider = new Provider(config);
    this.providers.set(config.id, provider);
    if (!this.defaultProvider) {
      this.defaultProvider = config.id;
      this.defaultModel = config.models?.[0]?.id;
    }
    return provider;
  }

  loadFromEnv() {
    const envMap = {
      OPENAI_API_KEY: { provider: 'openai', key: 'apiKey' },
      ANTHROPIC_API_KEY: { provider: 'anthropic', key: 'apiKey' },
      GOOGLE_API_KEY: { provider: 'google', key: 'apiKey' },
      OPENROUTER_API_KEY: { provider: 'openrouter', key: 'apiKey' },
      GROQ_API_KEY: { provider: 'groq', key: 'apiKey' },
      TOGETHER_API_KEY: { provider: 'together', key: 'apiKey' },
      DEEPSEEK_API_KEY: { provider: 'deepseek', key: 'apiKey' },
      MISTRAL_API_KEY: { provider: 'mistral', key: 'apiKey' },
      COHERE_API_KEY: { provider: 'cohere', key: 'apiKey' },
      FIREWORKS_API_KEY: { provider: 'fireworks', key: 'apiKey' },
      PERPLEXITY_API_KEY: { provider: 'perplexity', key: 'apiKey' },
      XAI_API_KEY: { provider: 'xai', key: 'apiKey' },
      CEREBRAS_API_KEY: { provider: 'cerebras', key: 'apiKey' },
      SAMBANOVA_API_KEY: { provider: 'sambanova', key: 'apiKey' },
    };

    let loaded = 0;
    for (const [envVar, config] of Object.entries(envMap)) {
      const key = process.env[envVar];
      if (key) {
        const template = PROVIDER_TEMPLATES[config.provider];
        if (template) {
          this.addProvider({ ...template, id: config.provider, apiKey: key });
          loaded++;
        }
      }
    }

    // Always add Ollama (no key needed)
    if (!this.providers.has('ollama')) {
      this.addProvider({ ...PROVIDER_TEMPLATES.ollama, id: 'ollama' });
    }

    return loaded;
  }

  getProvider(id) {
    return this.providers.get(id);
  }

  resolve(modelString) {
    // Format: "provider/model" or just "model"
    if (modelString.includes('/')) {
      const [providerId, modelId] = modelString.split('/');
      const provider = this.providers.get(providerId);
      if (provider) return { provider, modelId };
    }
    // Search all providers
    for (const [, provider] of this.providers) {
      const model = provider.models.find(m => m.id === modelString);
      if (model) return { provider, modelId: model.id };
    }
    // Default
    const defaultProv = this.providers.get(this.defaultProvider);
    return { provider: defaultProv, modelId: modelString };
  }

  async chat(messages, opts = {}) {
    const modelStr = opts.model || `${this.defaultProvider}/${this.defaultModel}`;
    const { provider, modelId } = this.resolve(modelStr);

    if (!provider) throw new Error('No provider available');

    try {
      const result = await provider.chat(messages, { ...opts, model: modelId });
      this._usageLog.push({
        provider: provider.id,
        model: modelId,
        tokens: result.usage,
        ts: Date.now(),
      });
      return result;
    } catch (err) {
      // Try fallback
      if (opts.fallback !== false) {
        for (const [, fallbackProvider] of this.providers) {
          if (fallbackProvider.id === provider.id) continue;
          try {
            const result = await fallbackProvider.chat(messages, { ...opts, model: fallbackProvider.models[0]?.id });
            this._usageLog.push({ provider: fallbackProvider.id, model: modelId, tokens: result.usage, ts: Date.now() });
            return result;
          } catch { continue; }
        }
      }
      throw err;
    }
  }

  listProviders() {
    const list = [];
    for (const [id, provider] of this.providers) {
      list.push({
        id,
        name: provider.name,
        models: provider.models.map(m => ({ id: m.id, name: m.name, cost: m.cost })),
        hasKey: !!provider.apiKey,
      });
    }
    return list;
  }

  listAllModels() {
    const models = [];
    for (const [id, provider] of this.providers) {
      for (const model of provider.models) {
        models.push({
          provider: id,
          providerName: provider.name,
          id: model.id,
          name: model.name,
          maxTokens: model.maxTokens,
          cost: model.cost,
          available: !!provider.apiKey || id === 'ollama',
        });
      }
    }
    return models;
  }

  getUsageStats() {
    return {
      totalRequests: this._usageLog.length,
      byProvider: this._usageLog.reduce((acc, log) => {
        acc[log.provider] = (acc[log.provider] || 0) + 1;
        return acc;
      }, {}),
      recent: this._usageLog.slice(-20),
    };
  }
}

// Export templates for custom provider creation
module.exports = {
  Provider,
  ModelRouter,
  PROVIDER_TEMPLATES,
  makeRequest,
};
