'use strict';

/**
 * UTHY OS v2.0 — Core Kernel
 * Event-driven command router, module lifecycle manager, and system bus.
 * This is the heart of Uthy OS — all modules communicate through the kernel.
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ════════════════════════════════════════════════════════════
// EVENT BUS — System-wide pub/sub
// ════════════════════════════════════════════════════════════

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this._history = [];
    this._maxHistory = 500;
  }

  emit(event, ...args) {
    this._history.push({ event, args, ts: Date.now() });
    if (this._history.length > this._maxHistory) {
      this._history = this._history.slice(-this._maxHistory);
    }
    return super.emit(event, ...args);
  }

  getHistory(filter) {
    if (!filter) return [...this._history];
    return this._history.filter(e => e.event.startsWith(filter));
  }
}

// ════════════════════════════════════════════════════════════
// COMMAND ROUTER — Slash commands, aliases, NL dispatch
// ════════════════════════════════════════════════════════════

class CommandRouter {
  constructor(kernel) {
    this.kernel = kernel;
    this.commands = new Map();
    this.aliases = new Map();
    this.middleware = [];
    this.history = [];
    this.macros = new Map();
  }

  register(name, handler, opts = {}) {
    this.commands.set(name, {
      handler,
      description: opts.description || '',
      usage: opts.usage || '',
      category: opts.category || 'general',
      permissions: opts.permissions || [],
      hidden: opts.hidden || false,
      autocomplete: opts.autocomplete || null,
    });
    if (opts.aliases) {
      for (const alias of opts.aliases) {
        this.aliases.set(alias, name);
      }
    }
  }

  use(fn) {
    this.middleware.push(fn);
  }

  async execute(input, context = {}) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Record history
    this.history.push({ input: trimmed, ts: Date.now(), user: context.user });
    if (this.history.length > 1000) this.history = this.history.slice(-1000);

    // Parse command
    let commandName, args;
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/);
      commandName = parts[0];
      args = parts.slice(1);
    } else if (trimmed.startsWith(':')) {
      // Macro execution
      const macroName = trimmed.slice(1).split(/\s+/)[0];
      return this.executeMacro(macroName, context);
    } else {
      // Natural language — route to AI
      commandName = 'chat';
      args = [trimmed];
    }

    // Resolve alias
    const resolved = this.aliases.get(commandName) || commandName;
    const cmd = this.commands.get(resolved);

    if (!cmd) {
      // Try fuzzy match
      const suggestion = this._fuzzyMatch(resolved);
      if (suggestion) {
        return { type: 'suggestion', message: `Did you mean /${suggestion}?`, suggestion };
      }
      return { type: 'error', message: `Unknown command: ${resolved}. Type /help for available commands.` };
    }

    // Run middleware
    for (const mw of this.middleware) {
      const result = await mw(resolved, args, context);
      if (result === false) return null;
    }

    // Execute
    try {
      this.kernel.bus.emit('command:before', { name: resolved, args });
      const result = await cmd.handler(args, context);
      this.kernel.bus.emit('command:after', { name: resolved, result });
      return result;
    } catch (err) {
      this.kernel.bus.emit('command:error', { name: resolved, error: err });
      return { type: 'error', message: err.message };
    }
  }

  _fuzzyMatch(input) {
    const all = [...this.commands.keys(), ...this.aliases.keys()];
    let best = null, bestDist = Infinity;
    for (const name of all) {
      const dist = this._levenshtein(input, name);
      if (dist < bestDist && dist <= 3) {
        bestDist = dist;
        best = this.aliases.get(name) || name;
      }
    }
    return best;
  }

  _levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[m][n];
  }

  registerMacro(name, steps) {
    this.macros.set(name, steps);
  }

  async executeMacro(name, context) {
    const steps = this.macros.get(name);
    if (!steps) return { type: 'error', message: `Macro not found: ${name}` };
    const results = [];
    for (const step of steps) {
      const result = await this.execute(step, context);
      results.push(result);
    }
    return { type: 'macro', name, results };
  }

  getCompletions(partial) {
    const results = [];
    for (const [name, cmd] of this.commands) {
      if (cmd.hidden) continue;
      if (name.startsWith(partial)) {
        results.push({ name, description: cmd.description, category: cmd.category });
      }
    }
    return results;
  }

  listCommands(category) {
    const list = [];
    for (const [name, cmd] of this.commands) {
      if (cmd.hidden) continue;
      if (category && cmd.category !== category) continue;
      list.push({ name, ...cmd });
    }
    return list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }
}

// ════════════════════════════════════════════════════════════
// MODULE LOADER — Plugin lifecycle management
// ════════════════════════════════════════════════════════════

class ModuleLoader {
  constructor(kernel) {
    this.kernel = kernel;
    this.modules = new Map();
    this.loadOrder = [];
  }

  register(name, moduleFactory, opts = {}) {
    this.modules.set(name, {
      factory: moduleFactory,
      dependencies: opts.dependencies || [],
      priority: opts.priority || 100,
      singleton: opts.singleton !== false,
      instance: null,
      state: 'registered',
    });
  }

  async load(name) {
    const mod = this.modules.get(name);
    if (!mod) throw new Error(`Module not found: ${name}`);
    if (mod.state === 'loaded' && mod.singleton) return mod.instance;

    // Load dependencies first
    for (const dep of mod.dependencies) {
      if (!this.modules.get(dep)?.instance) {
        await this.load(dep);
      }
    }

    // Instantiate
    const deps = {};
    for (const dep of mod.dependencies) {
      deps[dep] = this.modules.get(dep).instance;
    }

    mod.instance = mod.factory(this.kernel, deps);
    if (typeof mod.instance.init === 'function') {
      await mod.instance.init();
    }

    mod.state = 'loaded';
    this.loadOrder.push(name);
    this.kernel.bus.emit('module:loaded', { name });
    return mod.instance;
  }

  async loadAll() {
    const sorted = [...this.modules.entries()]
      .sort((a, b) => a[1].priority - b[1].priority);
    for (const [name] of sorted) {
      try {
        await this.load(name);
      } catch (err) {
        this.kernel.bus.emit('module:error', { name, error: err });
      }
    }
  }

  async unload(name) {
    const mod = this.modules.get(name);
    if (!mod || !mod.instance) return;
    if (typeof mod.instance.destroy === 'function') {
      await mod.instance.destroy();
    }
    mod.instance = null;
    mod.state = 'unloaded';
    this.kernel.bus.emit('module:unloaded', { name });
  }

  get(name) {
    return this.modules.get(name)?.instance || null;
  }

  list() {
    return [...this.modules.entries()].map(([name, mod]) => ({
      name,
      state: mod.state,
      priority: mod.priority,
      dependencies: mod.dependencies,
    }));
  }
}

// ════════════════════════════════════════════════════════════
// PROCESS MANAGER — Background tasks & jobs
// ════════════════════════════════════════════════════════════

class ProcessManager {
  constructor(kernel) {
    this.kernel = kernel;
    this.processes = new Map();
    this._nextId = 1;
  }

  spawn(name, fn, opts = {}) {
    const id = `proc_${this._nextId++}`;
    const proc = {
      id,
      name,
      state: 'running',
      startedAt: Date.now(),
      output: [],
      opts,
    };

    this.processes.set(id, proc);
    this.kernel.bus.emit('process:spawned', { id, name });

    // Run async
    (async () => {
      try {
        const result = await fn((data) => {
          proc.output.push(data);
          this.kernel.bus.emit('process:output', { id, data });
        });
        proc.state = 'completed';
        proc.result = result;
        proc.endedAt = Date.now();
        this.kernel.bus.emit('process:completed', { id, result });
      } catch (err) {
        proc.state = 'failed';
        proc.error = err.message;
        proc.endedAt = Date.now();
        this.kernel.bus.emit('process:failed', { id, error: err });
      }
    })();

    return id;
  }

  kill(id) {
    const proc = this.processes.get(id);
    if (proc && proc.state === 'running') {
      proc.state = 'killed';
      proc.endedAt = Date.now();
      this.kernel.bus.emit('process:killed', { id });
    }
  }

  get(id) {
    return this.processes.get(id);
  }

  list(filter) {
    const procs = [...this.processes.values()];
    if (filter) return procs.filter(p => p.state === filter);
    return procs;
  }
}

// ════════════════════════════════════════════════════════════
// KERNEL — The OS core
// ════════════════════════════════════════════════════════════

class Kernel {
  constructor(opts = {}) {
    this.version = '2.0.0';
    this.startTime = Date.now();
    this.configDir = opts.configDir || path.join(os.homedir(), '.uthy');
    this.bus = new EventBus();
    this.router = new CommandRouter(this);
    this.loader = new ModuleLoader(this);
    this.processes = new ProcessManager(this);
    this.state = 'booting';
    this.user = null;
    this.theme = opts.theme || 'cyber';
  }

  async boot() {
    this.state = 'booting';
    this.bus.emit('kernel:boot');

    // Ensure config directory
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Load all registered modules
    await this.loader.loadAll();

    this.state = 'running';
    this.bus.emit('kernel:ready', { version: this.version, uptime: 0 });

    return this;
  }

  async shutdown() {
    this.state = 'shutting down';
    this.bus.emit('kernel:shutdown');

    // Unload modules in reverse order
    const modules = this.loader.list().reverse();
    for (const mod of modules) {
      await this.loader.unload(mod.name);
    }

    this.state = 'stopped';
    this.bus.emit('kernel:stopped');
  }

  getUptime() {
    return Date.now() - this.startTime;
  }

  getStatus() {
    return {
      version: this.version,
      state: this.state,
      uptime: this.getUptime(),
      user: this.user,
      theme: this.theme,
      modules: this.loader.list(),
      processes: this.processes.list(),
    };
  }
}

module.exports = { Kernel, EventBus, CommandRouter, ModuleLoader, ProcessManager };
