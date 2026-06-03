const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const crypto = require('crypto');

class MCPManager {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy', 'mcp');
    this.serversFile = path.join(this.baseDir, 'servers.json');
    this.servers = [];
  }

  async init() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (fs.existsSync(this.serversFile)) {
      try {
        this.servers = JSON.parse(fs.readFileSync(this.serversFile, 'utf8'));
      } catch {
        this.servers = [];
      }
    } else {
      this.servers = [];
      await this._addDefaults();
      this._save();
    }
    return this;
  }

  async _addDefaults() {
    const defaults = [
      {
        name: 'filesystem',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', path.join(os.homedir(), '.uthy')],
        env: {},
      },
      {
        name: 'memory',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
        env: {},
      },
    ];
    for (const d of defaults) {
      const server = this._createServer(d.name, d.type, d);
      this.servers.push(server);
    }
  }

  _createServer(name, type, options = {}) {
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      type,
      command: options.command || null,
      args: options.args || [],
      env: options.env || {},
      url: options.url || null,
      enabled: options.enabled !== undefined ? options.enabled : true,
      status: 'unknown',
      lastCheck: null,
    };
  }

  _save() {
    fs.writeFileSync(this.serversFile, JSON.stringify(this.servers, null, 2), 'utf8');
  }

  addServer(name, type, options = {}) {
    if (!['stdio', 'http', 'sse'].includes(type)) {
      throw new Error(`Invalid server type: ${type}. Must be stdio, http, or sse.`);
    }
    const server = this._createServer(name, type, options);
    this.servers.push(server);
    this._save();
    return server;
  }

  removeServer(id) {
    const idx = this.servers.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.servers.splice(idx, 1);
    this._save();
    return true;
  }

  listServers(options = {}) {
    let list = [...this.servers];
    if (options.type) list = list.filter(s => s.type === options.type);
    if (options.enabled !== undefined) list = list.filter(s => s.enabled === options.enabled);
    if (options.name) list = list.filter(s => s.name.includes(options.name));
    return list;
  }

  getServer(id) {
    return this.servers.find(s => s.id === id) || null;
  }

  updateServer(id, fields) {
    const server = this.getServer(id);
    if (!server) throw new Error(`Server not found: ${id}`);
    const allowed = ['name', 'type', 'command', 'args', 'env', 'url', 'enabled'];
    for (const key of allowed) {
      if (fields[key] !== undefined) server[key] = fields[key];
    }
    this._save();
    return server;
  }

  enableServer(id) {
    return this.updateServer(id, { enabled: true });
  }

  disableServer(id) {
    return this.updateServer(id, { enabled: false });
  }

  async testServer(id) {
    const server = this.getServer(id);
    if (!server) throw new Error(`Server not found: ${id}`);
    const start = Date.now();
    const result = { status: 'error', latency: 0, error: null, tools: [] };

    try {
      if (server.type === 'stdio') {
        await this._testStdio(server, result);
      } else if (server.type === 'http') {
        await this._testHttp(server, result);
      } else if (server.type === 'sse') {
        await this._testSse(server, result);
      }
    } catch (err) {
      result.status = 'error';
      result.error = err.message;
    }

    result.latency = Date.now() - start;
    server.status = result.status;
    server.lastCheck = new Date().toISOString();
    this._save();
    return result;
  }

  async _testStdio(server, result) {
    return new Promise((resolve) => {
      const proc = spawn(server.command, server.args || [], {
        env: { ...process.env, ...server.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      const finish = () => {
        if (resolved) return;
        resolved = true;
        if (proc.exitCode === 0 || proc.exitCode === null) {
          result.status = 'online';
        } else {
          result.status = 'error';
          result.error = stderr || `Exit code: ${proc.exitCode}`;
        }
        resolve();
      };

      proc.on('close', finish);
      proc.on('error', (err) => {
        if (resolved) return;
        resolved = true;
        result.status = 'error';
        result.error = err.message;
        resolve();
      });

      // Send MCP initialize request
      const initReq = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'uthy-test', version: '1.0.0' },
        },
      }) + '\n';

      try {
        proc.stdin.write(initReq);
      } catch {}

      // Timeout after 10s
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { proc.kill(); } catch {}
          result.status = 'timeout';
          result.error = 'Connection timed out after 10s';
          resolve();
        }
      }, 10000);
    });
  }

  async _testHttp(server, result) {
    const url = server.url;
    if (!url) throw new Error('No URL configured for HTTP server');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(url + (url.includes('?') ? '&' : '?') + 'method=initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'uthy-test', version: '1.0.0' },
          },
        }),
        signal: controller.signal,
      });
      result.status = resp.ok ? 'online' : 'error';
      if (!resp.ok) result.error = `HTTP ${resp.status}`;
    } catch (err) {
      result.status = 'error';
      result.error = err.name === 'AbortError' ? 'Connection timed out' : err.message;
    } finally {
      clearTimeout(timeout);
    }
  }

  async _testSse(server, result) {
    // SSE test: just verify we can connect
    const url = server.url;
    if (!url) throw new Error('No URL configured for SSE server');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      result.status = resp.ok ? 'online' : 'error';
      if (!resp.ok) result.error = `HTTP ${resp.status}`;
      // Don't keep the connection open
      try { resp.body && resp.body.cancel(); } catch {}
    } catch (err) {
      result.status = 'error';
      result.error = err.name === 'AbortError' ? 'Connection timed out' : err.message;
    } finally {
      clearTimeout(timeout);
    }
  }

  async testAll() {
    const results = {};
    for (const server of this.servers) {
      if (server.enabled) {
        results[server.id] = await this.testServer(server.id);
      }
    }
    return results;
  }

  async importFromClaude(configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const mcpServers = config.mcpServers || {};
    let count = 0;

    for (const [name, cfg] of Object.entries(mcpServers)) {
      // Check for duplicate names
      if (this.servers.some(s => s.name === name && s.type === 'stdio')) continue;

      const server = this._createServer(name, 'stdio', {
        command: cfg.command,
        args: cfg.args || [],
        env: cfg.env || {},
      });
      this.servers.push(server);
      count++;
    }
    this._save();
    return count;
  }

  export() {
    return JSON.stringify(this.servers, null, 2);
  }

  stats() {
    const total = this.servers.length;
    const enabled = this.servers.filter(s => s.enabled).length;
    const byType = {};
    for (const s of this.servers) {
      byType[s.type] = (byType[s.type] || 0) + 1;
    }
    return { total, enabled, disabled: total - enabled, byType };
  }
}

module.exports = { MCPManager };
