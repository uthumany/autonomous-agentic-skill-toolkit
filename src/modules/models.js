'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_BASE_DIR = path.join(os.homedir(), '.uthy', 'models');

const DEFAULT_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', maxTokens: 128000, costPer1k: 0.005 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', maxTokens: 128000, costPer1k: 0.00015 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', maxTokens: 200000, costPer1k: 0.003 },
      { id: 'claude-haiku', name: 'Claude Haiku', provider: 'anthropic', maxTokens: 200000, costPer1k: 0.00025 },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    apiKeyEnv: 'GOOGLE_API_KEY',
    models: [
      { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', maxTokens: 1000000, costPer1k: 0.00125 },
      { id: 'gemini-flash', name: 'Gemini Flash', provider: 'google', maxTokens: 1000000, costPer1k: 0.000075 },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyEnv: '',
    models: [
      { id: 'llama3', name: 'Llama 3', provider: 'ollama', maxTokens: 8192, costPer1k: 0 },
      { id: 'codellama', name: 'Code Llama', provider: 'ollama', maxTokens: 16384, costPer1k: 0 },
    ],
  },
];

// Task type to model affinity mapping.
// Each entry lists model id substrings / keywords that suit the task.
const TASK_ROUTING = {
  code:      ['codellama', 'gpt-4o', 'claude-sonnet-4', 'gemini-pro'],
  chat:      ['gpt-4o', 'claude-sonnet-4', 'gemini-pro', 'llama3', 'gpt-4o-mini'],
  search:    ['gemini-flash', 'gpt-4o-mini', 'claude-haiku', 'gpt-4o'],
  analysis:  ['claude-sonnet-4', 'gpt-4o', 'gemini-pro', 'gpt-4o-mini'],
};

class ModelRouter {
  /**
   * @param {string} [baseDir] — directory that holds models.json; defaults to ~/.uthy/models/
   */
  constructor(baseDir) {
    this.baseDir = baseDir || DEFAULT_BASE_DIR;
    this.configPath = path.join(this.baseDir, 'models.json');
    this._config = null; // lazy-loaded
    this._usage = {
      entries: [],        // { modelId, inputTokens, outputTokens, cost, timestamp }
      byModel: {},        // modelId → { tokens, cost }
    };
    this._activeModelId = null;
  }

  // ── helpers ──────────────────────────────────────────────────────────

  _ensureLoaded() {
    if (this._config) return;
    if (fs.existsSync(this.configPath)) {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      this._config = JSON.parse(raw);
    } else {
      this._config = { providers: [] };
    }
  }

  _save() {
    fs.writeFileSync(this.configPath, JSON.stringify(this._config, null, 2), 'utf-8');
  }

  // ── lifecycle ────────────────────────────────────────────────────────

  /**
   * Create the config directory and seed it with default providers/models
   * when no config file exists yet.
   */
  init() {
    fs.mkdirSync(this.baseDir, { recursive: true });
    if (!fs.existsSync(this.configPath)) {
      this._config = { providers: DEFAULT_PROVIDERS };
      this._save();
    } else {
      this._ensureLoaded();
    }
    return this;
  }

  // ── providers ────────────────────────────────────────────────────────

  listProviders() {
    this._ensureLoaded();
    return this._config.providers.map(p => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      apiKeyEnv: p.apiKeyEnv,
      modelCount: p.models.length,
    }));
  }

  getProvider(id) {
    this._ensureLoaded();
    return this._config.providers.find(p => p.id === id) || null;
  }

  addProvider(id, name, baseUrl, apiKeyEnv) {
    this._ensureLoaded();
    if (this._config.providers.some(p => p.id === id)) {
      throw new Error(`Provider "${id}" already exists`);
    }
    const provider = { id, name, baseUrl, apiKeyEnv: apiKeyEnv || '', models: [] };
    this._config.providers.push(provider);
    this._save();
    return { ...provider };
  }

  removeProvider(id) {
    this._ensureLoaded();
    const idx = this._config.providers.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this._config.providers.splice(idx, 1);
    this._save();
    return true;
  }

  // ── models ───────────────────────────────────────────────────────────

  listModels(providerId) {
    this._ensureLoaded();
    const models = [];
    for (const p of this._config.providers) {
      if (providerId && p.id !== providerId) continue;
      for (const m of p.models) {
        models.push({ ...m });
      }
    }
    return models;
  }

  getModel(id) {
    this._ensureLoaded();
    for (const p of this._config.providers) {
      const m = p.models.find(m => m.id === id);
      if (m) return { ...m };
    }
    return null;
  }

  addModel(providerId, modelId, name, maxTokens, costPer1k) {
    this._ensureLoaded();
    const provider = this._config.providers.find(p => p.id === providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found`);
    if (provider.models.some(m => m.id === modelId)) {
      throw new Error(`Model "${modelId}" already exists in provider "${providerId}"`);
    }
    const model = {
      id: modelId,
      name,
      provider: providerId,
      maxTokens: maxTokens || 4096,
      costPer1k: costPer1k || 0,
    };
    provider.models.push(model);
    this._save();
    return { ...model };
  }

  removeModel(providerId, modelId) {
    this._ensureLoaded();
    const provider = this._config.providers.find(p => p.id === providerId);
    if (!provider) return false;
    const idx = provider.models.findIndex(m => m.id === modelId);
    if (idx === -1) return false;
    provider.models.splice(idx, 1);
    this._save();
    return true;
  }

  // ── routing ──────────────────────────────────────────────────────────

  /**
   * Pick the best available model for a given task type.
   * Supported taskTypes: code, chat, search, analysis
   * Returns the model config object or null if none match.
   */
  route(taskType) {
    this._ensureLoaded();
    const allModels = this.listModels();
    if (allModels.length === 0) return null;

    const key = (taskType || 'chat').toLowerCase();
    const preferred = TASK_ROUTING[key] || TASK_ROUTING.chat;

    // Walk the preference list; return the first model whose id appears in available models.
    for (const pref of preferred) {
      const found = allModels.find(m => m.id === pref);
      if (found) return found;
    }

    // Fallback: substring match (e.g. "code" task picks any model with "code" in its id)
    const partial = allModels.find(m => m.id.toLowerCase().includes(key));
    if (partial) return partial;

    // Last resort: first model available
    return allModels[0];
  }

  // ── active model ─────────────────────────────────────────────────────

  setActive(modelId) {
    const model = this.getModel(modelId);
    if (!model) throw new Error(`Model "${modelId}" not found`);
    this._activeModelId = modelId;
    return model;
  }

  getActive() {
    if (!this._activeModelId) return null;
    return this.getModel(this._activeModelId);
  }

  // ── usage tracking ───────────────────────────────────────────────────

  trackUsage(modelId, inputTokens, outputTokens) {
    const model = this.getModel(modelId);
    const totalTokens = (inputTokens || 0) + (outputTokens || 0);
    const costPer1k = model ? model.costPer1k : 0;
    const cost = (totalTokens / 1000) * costPer1k;

    const entry = {
      modelId,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      totalTokens,
      cost: Math.round(cost * 1000000) / 1000000, // 6-decimal precision
      timestamp: Date.now(),
    };
    this._usage.entries.push(entry);

    if (!this._usage.byModel[modelId]) {
      this._usage.byModel[modelId] = { tokens: 0, cost: 0 };
    }
    this._usage.byModel[modelId].tokens += totalTokens;
    this._usage.byModel[modelId].cost += entry.cost;

    return entry;
  }

  getUsage() {
    let totalTokens = 0;
    let totalCost = 0;
    for (const e of this._usage.entries) {
      totalTokens += e.totalTokens;
      totalCost += e.cost;
    }
    return {
      totalTokens,
      totalCost: Math.round(totalCost * 1000000) / 1000000,
      byModel: { ...this._usage.byModel },
    };
  }

  resetUsage() {
    this._usage = { entries: [], byModel: {} };
  }

  // ── stats ────────────────────────────────────────────────────────────

  stats() {
    this._ensureLoaded();
    return {
      providers: this._config.providers.length,
      models: this.listModels().length,
      activeModel: this._activeModelId,
      usage: this.getUsage(),
    };
  }
}

module.exports = { ModelRouter };
