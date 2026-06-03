'use strict';

/**
 * UTHY OS v2.0 — Encrypted Storage Engine
 * AES-256-GCM encrypted local storage with per-user isolation.
 * API key vault, config management, and data persistence.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// ════════════════════════════════════════════════════════════
// CRYPTO HELPERS
// ════════════════════════════════════════════════════════════

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
}

function encrypt(text, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
}

function decrypt(encryptedBase64, password) {
  const data = Buffer.from(encryptedBase64, 'base64');
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ════════════════════════════════════════════════════════════
// VAULT — Encrypted key-value store
// ════════════════════════════════════════════════════════════

class Vault {
  constructor(vaultPath, password) {
    this.path = vaultPath;
    this.password = password;
    this._cache = null;
  }

  _load() {
    if (this._cache) return this._cache;
    if (!fs.existsSync(this.path)) {
      this._cache = {};
      return this._cache;
    }
    try {
      const raw = fs.readFileSync(this.path, 'utf8');
      const decrypted = decrypt(raw, this.password);
      this._cache = JSON.parse(decrypted);
    } catch {
      this._cache = {};
    }
    return this._cache;
  }

  _save() {
    const data = JSON.stringify(this._cache, null, 2);
    const encrypted = encrypt(data, this.password);
    const dir = path.dirname(this.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.path, encrypted, 'utf8');
  }

  get(key) {
    return this._load()[key];
  }

  set(key, value) {
    this._load();
    this._cache[key] = value;
    this._save();
  }

  delete(key) {
    this._load();
    delete this._cache[key];
    this._save();
  }

  list() {
    return Object.keys(this._load());
  }

  has(key) {
    return key in this._load();
  }

  clear() {
    this._cache = {};
    this._save();
  }
}

// ════════════════════════════════════════════════════════════
// STORAGE ENGINE — Per-user file-based storage
// ════════════════════════════════════════════════════════════

class StorageEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy');
    this.currentUser = null;
    this.userDir = null;
    this.vault = null;
  }

  init() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  setUser(username, password) {
    this.currentUser = username;
    this.userDir = path.join(this.baseDir, 'users', username);
    if (!fs.existsSync(this.userDir)) {
      fs.mkdirSync(this.userDir, { recursive: true });
    }
    // Create user subdirectories
    for (const sub of ['config', 'data', 'skills', 'memory', 'history', 'themes']) {
      const dir = path.join(this.userDir, sub);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    // Initialize vault
    const vaultPath = path.join(this.userDir, 'vault.enc');
    this.vault = new Vault(vaultPath, password);
  }

  // ── Config Management ──────────────────────────────────

  getConfig(key, defaultValue) {
    const configPath = path.join(this.userDir || this.baseDir, 'config', 'settings.json');
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return key ? (config[key] ?? defaultValue) : config;
      }
    } catch {}
    return defaultValue;
  }

  setConfig(key, value) {
    const configPath = path.join(this.userDir || this.baseDir, 'config', 'settings.json');
    let config = {};
    try {
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch {}
    config[key] = value;
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  // ── Data Storage ───────────────────────────────────────

  saveData(name, data) {
    const dataPath = path.join(this.userDir || this.baseDir, 'data', `${name}.json`);
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  }

  loadData(name) {
    const dataPath = path.join(this.userDir || this.baseDir, 'data', `${name}.json`);
    try {
      if (fs.existsSync(dataPath)) {
        return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      }
    } catch {}
    return null;
  }

  // ── History ────────────────────────────────────────────

  appendHistory(entry) {
    const historyPath = path.join(this.userDir || this.baseDir, 'history', 'commands.jsonl');
    const line = JSON.stringify({ ...entry, ts: Date.now() }) + '\n';
    fs.appendFileSync(historyPath, line, 'utf8');
  }

  getHistory(limit = 100) {
    const historyPath = path.join(this.userDir || this.baseDir, 'history', 'commands.jsonl');
    try {
      if (fs.existsSync(historyPath)) {
        const lines = fs.readFileSync(historyPath, 'utf8').trim().split('\n');
        return lines.slice(-limit).map(l => {
          try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);
      }
    } catch {}
    return [];
  }

  // ── Memory ─────────────────────────────────────────────

  saveMemory(key, value) {
    const memPath = path.join(this.userDir || this.baseDir, 'memory', 'memory.json');
    let memory = {};
    try {
      if (fs.existsSync(memPath)) {
        memory = JSON.parse(fs.readFileSync(memPath, 'utf8'));
      }
    } catch {}
    memory[key] = { value, ts: Date.now() };
    fs.writeFileSync(memPath, JSON.stringify(memory, null, 2), 'utf8');
  }

  getMemory(key) {
    const memPath = path.join(this.userDir || this.baseDir, 'memory', 'memory.json');
    try {
      if (fs.existsSync(memPath)) {
        const memory = JSON.parse(fs.readFileSync(memPath, 'utf8'));
        return memory[key]?.value;
      }
    } catch {}
    return null;
  }

  getAllMemory() {
    const memPath = path.join(this.userDir || this.baseDir, 'memory', 'memory.json');
    try {
      if (fs.existsSync(memPath)) {
        return JSON.parse(fs.readFileSync(memPath, 'utf8'));
      }
    } catch {}
    return {};
  }

  // ── API Key Vault ──────────────────────────────────────

  setApiKey(provider, key) {
    if (!this.vault) throw new Error('No user logged in');
    const keys = this.vault.get('api_keys') || {};
    keys[provider] = key;
    this.vault.set('api_keys', keys);
  }

  getApiKey(provider) {
    if (!this.vault) return null;
    const keys = this.vault.get('api_keys') || {};
    return keys[provider];
  }

  listApiKeys() {
    if (!this.vault) return [];
    const keys = this.vault.get('api_keys') || {};
    return Object.keys(keys).map(k => ({
      provider: k,
      masked: keys[k].slice(0, 8) + '...' + keys[k].slice(-4),
    }));
  }

  // ── Import/Export ──────────────────────────────────────

  exportProfile(username) {
    const userDir = path.join(this.baseDir, 'users', username);
    if (!fs.existsSync(userDir)) throw new Error(`User not found: ${username}`);
    const profile = {};
    const walk = (dir, prefix = '') => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        const key = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(fullPath, key);
        } else if (entry.name.endsWith('.json') || entry.name.endsWith('.jsonl')) {
          profile[key] = fs.readFileSync(fullPath, 'utf8');
        }
      }
    };
    walk(userDir);
    return profile;
  }

  importProfile(username, profile) {
    const userDir = path.join(this.baseDir, 'users', username);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    for (const [key, content] of Object.entries(profile)) {
      const filePath = path.join(userDir, key);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  // ── File Operations ────────────────────────────────────

  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch { return null; }
  }

  writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  listDir(dirPath) {
    try {
      return fs.readdirSync(dirPath, { withFileTypes: true }).map(e => ({
        name: e.name,
        isDir: e.isDirectory(),
        path: path.join(dirPath, e.name),
      }));
    } catch { return []; }
  }
}

module.exports = { StorageEngine, Vault, encrypt, decrypt };
