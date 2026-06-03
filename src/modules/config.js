'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DEFAULTS = {
  theme: { name: 'cyber', font: 'default', fontSize: 14 },
  user: { name: '', email: '' },
  api: {
    openai: { key: '', baseUrl: 'https://api.openai.com/v1' },
    anthropic: { key: '', baseUrl: 'https://api.anthropic.com/v1' },
    google: { key: '' },
    ollama: { baseUrl: 'http://localhost:11434/v1' }
  },
  memory: { enabled: true, maxEntries: 1000 },
  mcp: { servers: [] },
  hud: { enabled: true, position: 'top-right', refreshMs: 1000 },
  chat: { panelEnabled: true, animationsEnabled: true }
};

const REQUIRED_KEYS = [
  'theme.name',
  'user.name',
  'user.email'
];

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepMerge(target, source) {
  const out = deepClone(target);
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], source[key]);
    } else {
      out[key] = deepClone(source[key]);
    }
  }
  return out;
}

function getNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = deepClone(value);
}

function deleteNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current === null || current === undefined || typeof current !== 'object') return false;
    current = current[parts[i]];
  }
  if (current && typeof current === 'object') {
    delete current[parts[parts.length - 1]];
    return true;
  }
  return false;
}

function getAllKeys(obj, prefix) {
  prefix = prefix || '';
  const keys = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath || path.join(os.homedir(), '.uthy', 'config.json');
    this.config = null;
    this._secrets = {};
  }

  // --- Encryption helpers (XOR with hostname, base64) ---

  _getMachineKey() {
    return os.hostname();
  }

  _xorEncrypt(text, key) {
    const buf = Buffer.from(text, 'utf8');
    const keyBuf = Buffer.from(key, 'utf8');
    const result = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length; i++) {
      result[i] = buf[i] ^ keyBuf[i % keyBuf.length];
    }
    return result;
  }

  _encrypt(plaintext) {
    const key = this._getMachineKey();
    const xored = this._xorEncrypt(plaintext, key);
    return xored.toString('base64');
  }

  _decrypt(encoded) {
    const key = this._getMachineKey();
    const buf = Buffer.from(encoded, 'base64');
    const result = Buffer.alloc(buf.length);
    const keyBuf = Buffer.from(key, 'utf8');
    for (let i = 0; i < buf.length; i++) {
      result[i] = buf[i] ^ keyBuf[i % keyBuf.length];
    }
    return result.toString('utf8');
  }

  // --- Core methods ---

  async init() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.configPath)) {
      const raw = fs.readFileSync(this.configPath, 'utf8');
      try {
        this.config = JSON.parse(raw);
      } catch (e) {
        this.config = deepClone(DEFAULTS);
      }
    } else {
      this.config = deepClone(DEFAULTS);
      this._save();
    }
    // Load secrets file if exists
    const secretsPath = this._secretsPath();
    if (fs.existsSync(secretsPath)) {
      try {
        const raw = fs.readFileSync(secretsPath, 'utf8');
        this._secrets = JSON.parse(raw);
      } catch (e) {
        this._secrets = {};
      }
    }
    return this.config;
  }

  _secretsPath() {
    return this.configPath.replace(/\.json$/, '.secrets.json');
  }

  _save() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }

  _saveSecrets() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this._secretsPath(), JSON.stringify(this._secrets, null, 2), 'utf8');
  }

  get(key, defaultValue) {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    if (!key) return deepClone(this.config);
    const val = getNestedValue(this.config, key);
    return val !== undefined ? deepClone(val) : (defaultValue !== undefined ? defaultValue : undefined);
  }

  set(key, value) {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    setNestedValue(this.config, key, value);
    this._save();
    return this;
  }

  has(key) {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    return getNestedValue(this.config, key) !== undefined;
  }

  delete(key) {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    const result = deleteNestedValue(this.config, key);
    if (result) this._save();
    return result;
  }

  getAll() {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    return deepClone(this.config);
  }

  reset(key) {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    if (key) {
      const defaultVal = getNestedValue(DEFAULTS, key);
      if (defaultVal !== undefined) {
        setNestedValue(this.config, key, defaultVal);
      } else {
        deleteNestedValue(this.config, key);
      }
    } else {
      this.config = deepClone(DEFAULTS);
    }
    this._save();
    return this;
  }

  // --- Secrets ---

  setSecret(key, value) {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    const encrypted = this._encrypt(String(value));
    this._secrets[key] = encrypted;
    // Also store encrypted value in config for reference
    setNestedValue(this.config, key, '__ENCRYPTED__');
    this._saveSecrets();
    this._save();
    return this;
  }

  getSecret(key) {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    const encrypted = this._secrets[key];
    if (!encrypted) {
      // Fall back to config value if it's not marked encrypted
      const val = getNestedValue(this.config, key);
      if (val === '__ENCRYPTED__') return undefined;
      return val || undefined;
    }
    return this._decrypt(encrypted);
  }

  // --- Import / Export ---

  export() {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    // Merge secrets (encrypted markers) into export
    const exported = deepClone(this.config);
    return JSON.stringify(exported, null, 2);
  }

  import(jsonStr) {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    let parsed;
    try {
      parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }
    this.config = deepMerge(this.config, parsed);
    this._save();
    return this;
  }

  // --- Validation ---

  validate() {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    const errors = [];
    for (const reqKey of REQUIRED_KEYS) {
      const val = getNestedValue(this.config, reqKey);
      if (val === undefined || val === null || val === '') {
        errors.push(`Missing or empty required key: ${reqKey}`);
      }
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // --- List / Pretty print ---

  list() {
    if (!this.config) throw new Error('Config not initialized. Call init() first.');
    const allKeys = getAllKeys(this.config);
    const secretKeys = Object.keys(this._secrets);
    const lines = [];
    for (const key of allKeys.sort()) {
      const val = getNestedValue(this.config, key);
      if (secretKeys.includes(key) || (typeof val === 'string' && val === '__ENCRYPTED__')) {
        const decrypted = this.getSecret(key);
        const masked = decrypted ? '*'.repeat(Math.min(decrypted.length, 8)) : '(not set)';
        lines.push(`  ${key} = ${masked}`);
      } else if (typeof val === 'object') {
        lines.push(`  ${key} = ${JSON.stringify(val)}`);
      } else {
        lines.push(`  ${key} = ${val}`);
      }
    }
    return lines.join('\n');
  }
}

module.exports = { ConfigManager, DEFAULTS };
