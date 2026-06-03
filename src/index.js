#!/usr/bin/env node

/**
 * UTHY OS v2.0 — Terminal-Native AI Operating System
 *
 * The autonomous agentic operating system by uthuman & co.
 * Cyberpunk-inspired terminal UI, 300+ AI providers, skill engine,
 * multi-user auth, encrypted storage, and full customization.
 *
 * Usage:
 *   uthy                    → Interactive REPL (boot + login + shell)
 *   uthy <command> [opts]   → Direct command execution
 *   uthy --help             → Show help
 *   uthy --version          → Show version
 */

'use strict';

const { Command } = require('commander');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Core Architecture ───────────────────────────────────
const { Kernel, EventBus, CommandRouter, ModuleLoader, ProcessManager } = require('./kernel');
const { ModelRouter, PROVIDER_TEMPLATES } = require('./providers');
const { StorageEngine, Vault } = require('./storage');
const { TerminalRenderer, THEMES, SPINNERS, stripAnsi } = require('./engine/renderer');
const { SkillEngine } = require('./modules/skillEngine');

// ── Legacy Modules (preserved from v1.x) ────────────────
const { AuthEngine } = require('./modules/auth');
const { MemoryEngine } = require('./modules/memory');
const { GoalEngine } = require('./modules/goals');
const { CronEngine } = require('./modules/cron');
const { KnowledgeEngine } = require('./modules/knowledge');
const { SessionEngine } = require('./modules/sessions');
const { WebSearchEngine } = require('./modules/websearch');
const { WatchdogEngine } = require('./modules/watchdog');
const { DelegationEngine } = require('./modules/delegation');
const { ConfigManager } = require('./modules/config');
const { GatewayManager } = require('./modules/gateway');
const { MCPManager } = require('./modules/mcp');
const { Animations } = require('./modules/animations');

// ── Legacy UI (for chat rendering) ──────────────────────
const {
  parseAttachments, readAttachedFile, renderChatPrompt,
  renderChatMessage, formatFileSize,
} = require('./modules/chat');

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const VERSION = '2.0.0';
const CONFIG_DIR = path.join(os.homedir(), '.uthy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// ════════════════════════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════════════════════════

let kernel, renderer, storage, models, skillEngine, auth;
let memory, goals, cron, knowledge, sessions, websearch;
let watchdog, delegation, configMgr, gateway, mcp;
let currentUser = 'guest';
let sessionStartTime;
let enginesReady = false;

// ════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {}
  return { theme: 'cyber', compactBanner: false, historySize: 100 };
}

function saveConfig(cfg) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch {}
}

// ════════════════════════════════════════════════════════════
// BOOT SEQUENCE
// ════════════════════════════════════════════════════════════

async function bootSequence(config, isTTY) {
  const theme = THEMES[config.theme] || THEMES.cyber;

  if (!isTTY) {
    // Non-TTY: skip animation, just init
    await initEngines(config, false);
    return;
  }

  const r = new TerminalRenderer({ theme: config.theme });
  const ESC = '\x1b';
  const reset = `${ESC}[0m`;

  // ── Boot Animation ─────────────────────────────────
  console.clear();

  // Animated gradient loading frame
  const loadSteps = [
    { name: 'Kernel', icon: '⚡', delay: 120 },
    { name: 'Storage', icon: '💾', delay: 100 },
    { name: 'Auth', icon: '🔐', delay: 130 },
    { name: 'Themes', icon: '🎨', delay: 80 },
    { name: 'Memory', icon: '🧠', delay: 100 },
    { name: 'Skills', icon: '⚙️', delay: 110 },
    { name: 'Models', icon: '🤖', delay: 120 },
    { name: 'Goals', icon: '🎯', delay: 80 },
    { name: 'Cron', icon: '⏰', delay: 90 },
    { name: 'Knowledge', icon: '📚', delay: 100 },
    { name: 'Sessions', icon: '📋', delay: 80 },
    { name: 'WebSearch', icon: '🔍', delay: 90 },
    { name: 'Watchdog', icon: '🐕', delay: 70 },
    { name: 'Delegation', icon: '🤝', delay: 80 },
    { name: 'MCP', icon: '🔌', delay: 70 },
    { name: 'Gateway', icon: '🌐', delay: 80 },
    { name: 'UI Engine', icon: '🖥️', delay: 100 },
  ];

  const doneSteps = [];
  let phase = 0;

  // Animated boot frame renderer
  function renderBootFrame(pct, statusText) {
    const W = Math.min(68, (process.stdout.columns || 80) - 4);
    const inner = W - 4;
    const lines = [];
    const g = theme.bannerGradient;

    // 3D shadow
    lines.push(`${ESC}[38;5;234m${'▓'.repeat(W + 2)}${reset}`);

    // Top border
    const header = '╭─ ⟨ UTHY OS v2.0 ⟩ ─────────────────────────╮';
    lines.push(r.gradient(header, g));

    // Status
    const padded = statusText.padEnd(inner).slice(0, inner);
    lines.push(`${ESC}[38;5;240m │${reset} ${theme.primary}${padded}${reset} ${ESC}[38;5;240m│ ▓${reset}`);

    // Progress bar
    const barW = inner - 10;
    const filled = Math.round((pct / 100) * barW);
    const empty = barW - filled;
    const bar = r.progressBar(pct, 100, { style: 'gradient', width: barW, label: '' });
    const pctStr = `${theme.bold}${String(Math.round(pct)).padStart(3)}%${reset}`;
    lines.push(`${ESC}[38;5;240m │${reset}  ${bar} ${pctStr} ${ESC}[38;5;240m│ ▓${reset}`);

    // Engine checklist (2 columns)
    const mid = Math.ceil(loadSteps.length / 2);
    for (let row = 0; row < mid; row++) {
      const left = loadSteps[row];
      const right = loadSteps[row + mid];
      const leftDone = doneSteps.includes(left.name);
      const rightDone = right ? doneSteps.includes(right.name) : false;
      const leftIcon = leftDone ? `${ESC}[38;5;82m✓${reset}` : `${ESC}[38;5;226m◌${reset}`;
      const rightIcon = rightDone ? `${ESC}[38;5;82m✓${reset}` : (right ? `${ESC}[38;5;226m◌${reset}` : ' ');
      const leftText = leftDone ? `${ESC}[38;5;82m${left.icon} ${left.name.padEnd(10)}${reset}` : `${ESC}[38;5;240m${left.icon} ${left.name.padEnd(10)}${reset}`;
      const rightText = right && rightDone ? `${ESC}[38;5;82m${right.icon} ${(right.name).padEnd(10)}${reset}` : (right ? `${ESC}[38;5;240m${right.icon} ${(right.name).padEnd(10)}${reset}` : ' '.repeat(14));
      lines.push(`${ESC}[38;5;240m │${reset}  ${leftIcon} ${leftText}  ${rightIcon} ${rightText} ${ESC}[38;5;240m│ ▓${reset}`);
    }

    // Bottom border
    lines.push(r.gradient('╰─────────────────────────────────────────────╯', g));

    // 3D shadow
    lines.push(`${ESC}[38;5;234m${'▓'.repeat(W + 2)}${reset}`);

    return lines;
  }

  // Print initial space for boot frame
  const frameHeight = 4 + Math.ceil(loadSteps.length / 2) + 2;
  for (let i = 0; i < frameHeight; i++) console.log('');

  // Animation loop
  let bootDone = false;
  const loadTimer = setInterval(() => {
    if (bootDone) return;
    phase = (phase + 0.03) % 1;
    const pct = (doneSteps.length / loadSteps.length) * 100;
    const statusText = doneSteps.length < loadSteps.length
      ? `Initializing ${loadSteps[doneSteps.length]?.name || 'system'}...`
      : 'System ready!';
    const frame = renderBootFrame(pct, statusText);
    process.stdout.write(`\x1b[s`);
    process.stdout.write(`\x1b[${frameHeight}A`);
    for (const line of frame) {
      process.stdout.write(`\x1b[2K${line}\n`);
    }
    process.stdout.write(`\x1b[u`);
  }, 80);

  // Initialize engines sequentially
  for (const step of loadSteps) {
    await new Promise(r => setTimeout(r, step.delay));
    doneSteps.push(step.name);
  }

  await initEngines(config, true);

  bootDone = true;
  clearInterval(loadTimer);

  // Final frame
  const finalFrame = renderBootFrame(100, 'System ready!');
  process.stdout.write(`\x1b[s`);
  process.stdout.write(`\x1b[${frameHeight}A`);
  for (const line of finalFrame) {
    process.stdout.write(`\x1b[2K${line}\n`);
  }
  process.stdout.write(`\x1b[u`);

  await new Promise(r => setTimeout(r, 500));
  console.clear();
}

// ════════════════════════════════════════════════════════════
// ENGINE INITIALIZATION
// ════════════════════════════════════════════════════════════

async function initEngines(config, isTTY) {
  // Core
  kernel = new Kernel({ configDir: CONFIG_DIR, theme: config.theme });
  storage = new StorageEngine(CONFIG_DIR);
  storage.init();

  // Auth
  auth = new AuthEngine();

  // Renderer
  renderer = new TerminalRenderer({ theme: config.theme });

  // AI Providers
  models = new ModelRouter();
  models.loadFromEnv();

  // Skills
  skillEngine = new SkillEngine({ skillsDir: path.join(CONFIG_DIR, 'skills') });
  await skillEngine.init();

  // Legacy engines
  memory = new MemoryEngine();
  goals = new GoalEngine();
  cron = new CronEngine();
  knowledge = new KnowledgeEngine();
  sessions = new SessionEngine();
  websearch = new WebSearchEngine();
  watchdog = new WatchdogEngine();
  delegation = new DelegationEngine();
  configMgr = new ConfigManager();
  gateway = new GatewayManager(configMgr);
  mcp = new MCPManager();

  // Init legacy engines
  const initList = [
    ['Config', configMgr], ['Memory', memory], ['Goals', goals],
    ['Cron', cron], ['Knowledge', knowledge], ['Sessions', sessions],
    ['WebSearch', websearch], ['Watchdog', watchdog], ['Delegation', delegation],
    ['MCP', mcp], ['Gateway', gateway],
  ];

  for (const [name, engine] of initList) {
    try { await engine.init(); } catch (e) { /* graceful degradation */ }
  }

  // Boot kernel
  await kernel.boot();

  enginesReady = true;
  sessionStartTime = Date.now();
}

// ════════════════════════════════════════════════════════════
// REGISTER COMMANDS
// ════════════════════════════════════════════════════════════

function registerCommands(router) {
  const theme = THEMES[kernel.theme] || THEMES.cyber;
  const reset = '\x1b[0m';

  // ── Help ─────────────────────────────────────────────
  router.register('help', (args, ctx) => {
    const commands = router.listCommands();
    return { type: 'help', commands };
  }, {
    description: 'Show available commands',
    aliases: ['h', '?'],
    category: 'core',
  });

  // ── Version ─────────────────────────────────────────
  router.register('version', () => {
    return { type: 'text', content: `Uthy OS v${VERSION} — Terminal-Native AI Operating System` };
  }, {
    description: 'Show version',
    aliases: ['v'],
    category: 'core',
  });

  // ── Status ──────────────────────────────────────────
  router.register('status', () => {
    const uptime = kernel.getUptime();
    const mem = process.memoryUsage();
    const providerList = models.listProviders();
    const skillStats = skillEngine.getStats();
    return {
      type: 'status',
      data: {
        version: VERSION,
        uptime,
        user: currentUser,
        theme: typeof kernel.theme === 'string' ? kernel.theme : (kernel.theme?.name || 'cyber'),
        memoryMB: Math.round(mem.heapUsed / 1024 / 1024),
        providers: providerList.length,
        providerNames: providerList.map(p => p.name).join(', '),
        skills: skillStats.total,
        skillsEnabled: skillStats.enabled,
        modules: loader_list().length,
      },
    };
  }, {
    description: 'Show system status',
    aliases: ['st', 'info'],
    category: 'core',
  });

  // ── Theme ───────────────────────────────────────────
  router.register('theme', (args) => {
    if (args[0] === 'list') {
      const themes = renderer.listThemes();
      return { type: 'themes', themes };
    }
    if (args[0] && THEMES[args[0]]) {
      kernel.theme = args[0];
      renderer.setTheme(args[0]);
      const cfg = loadConfig();
      cfg.theme = args[0];
      saveConfig(cfg);
      return { type: 'text', content: `Theme changed to: ${args[0]}` };
    }
    return { type: 'text', content: `Current: ${kernel.theme}. Usage: /theme <name> or /theme list` };
  }, {
    description: 'Change or list themes',
    category: 'customization',
    autocomplete: () => Object.keys(THEMES),
  });

  // ── Providers ───────────────────────────────────────
  router.register('providers', (args) => {
    if (args[0] === 'list' || !args[0]) {
      const list = models.listProviders();
      return { type: 'providers', providers: list };
    }
    if (args[0] === 'models') {
      const allModels = models.listAllModels();
      return { type: 'models', models: allModels };
    }
    if (args[0] === 'set-key' && args[1] && args[2]) {
      storage.setApiKey(args[1], args[2]);
      // Also set env var for runtime
      process.env[`${args[1].toUpperCase()}_API_KEY`] = args[2];
      // Reload providers
      models = new ModelRouter();
      models.loadFromEnv();
      return { type: 'text', content: `API key set for ${args[1]}` };
    }
    if (args[0] === 'usage') {
      return { type: 'text', content: JSON.stringify(models.getUsageStats(), null, 2) };
    }
    return { type: 'text', content: 'Usage: /providers [list|models|set-key|usage]' };
  }, {
    description: 'Manage AI providers and API keys',
    aliases: ['prov', 'models'],
    category: 'ai',
  });

  // ── Chat with AI ────────────────────────────────────
  router.register('chat', async (args, ctx) => {
    const input = args.join(' ');
    if (!input) return { type: 'text', content: 'Usage: /chat <message> or just type naturally' };

    try {
      const result = await models.chat([{ role: 'user', content: input }], {
        system: `You are Uthy OS, a terminal-native AI assistant. Be helpful, concise, and direct. Current user: ${currentUser}`,
      });
      return { type: 'ai-response', content: result.content, model: result.model, usage: result.usage };
    } catch (err) {
      return { type: 'error', content: `AI Error: ${err.message}. Set an API key with /providers set-key <provider> <key>` };
    }
  }, {
    description: 'Chat with AI (natural language input)',
    aliases: ['ask', 'ai'],
    category: 'ai',
  });

  // ── Skills ──────────────────────────────────────────
  router.register('skills', (args) => {
    if (args[0] === 'list' || !args[0]) {
      const category = args[1] || null;
      const skills = skillEngine.list({ category });
      return { type: 'skills', skills };
    }
    if (args[0] === 'enable' && args[1]) {
      skillEngine.enable(args[1]);
      return { type: 'text', content: `Skill enabled: ${args[1]}` };
    }
    if (args[0] === 'disable' && args[1]) {
      skillEngine.disable(args[1]);
      return { type: 'text', content: `Skill disabled: ${args[1]}` };
    }
    if (args[0] === 'generate' && args.length > 1) {
      const skill = skillEngine.generateSkill(args.slice(1).join(' '));
      return { type: 'text', content: `Generated skill: ${skill.name}` };
    }
    if (args[0] === 'stats') {
      return { type: 'text', content: JSON.stringify(skillEngine.getStats(), null, 2) };
    }
    if (args[0] === 'search' && args[1]) {
      const results = skillEngine.list({ query: args.slice(1).join(' ') });
      return { type: 'skills', skills: results };
    }
    return { type: 'text', content: 'Usage: /skills [list|enable|disable|generate|stats|search]' };
  }, {
    description: 'Manage skills',
    aliases: ['skill', 'sk'],
    category: 'skills',
  });

  // ── Memory ──────────────────────────────────────────
  router.register('memory', (args) => {
    if (args[0] === 'save' && args[1] && args[2]) {
      storage.saveMemory(args[1], args.slice(2).join(' '));
      return { type: 'text', content: `Memory saved: ${args[1]}` };
    }
    if (args[0] === 'get' && args[1]) {
      const val = storage.getMemory(args[1]);
      return { type: 'text', content: val ? `${args[1]}: ${val}` : `No memory found for: ${args[1]}` };
    }
    if (args[0] === 'list') {
      const all = storage.getAllMemory();
      return { type: 'text', content: JSON.stringify(all, null, 2) };
    }
    if (args[0] === 'stats') {
      try { return { type: 'text', content: JSON.stringify(memory.stats(), null, 2) }; }
      catch { return { type: 'text', content: 'Memory engine not ready' }; }
    }
    return { type: 'text', content: 'Usage: /memory [save|get|list|stats]' };
  }, {
    description: 'Manage persistent memory',
    aliases: ['mem', 'remember'],
    category: 'ai',
  });

  // ── Goals ───────────────────────────────────────────
  router.register('goals', async (args) => {
    try {
      if (args[0] === 'list' || !args[0]) {
        const list = goals.list ? goals.list() : [];
        return { type: 'text', content: list.length ? JSON.stringify(list, null, 2) : 'No goals set' };
      }
      if (args[0] === 'add' && args.length > 1) {
        goals.add ? goals.add(args.slice(1).join(' ')) : null;
        return { type: 'text', content: `Goal added: ${args.slice(1).join(' ')}` };
      }
    } catch {}
    return { type: 'text', content: 'Usage: /goals [list|add <text>]' };
  }, {
    description: 'Manage goals',
    category: 'ai',
  });

  // ── Sessions ────────────────────────────────────────
  router.register('sessions', (args) => {
    try {
      if (args[0] === 'list' || !args[0]) {
        const list = sessions.list ? sessions.list() : [];
        return { type: 'text', content: list.length ? JSON.stringify(list, null, 2) : 'No sessions' };
      }
    } catch {}
    return { type: 'text', content: 'Usage: /sessions [list]' };
  }, {
    description: 'Manage sessions',
    aliases: ['sess'],
    category: 'core',
  });

  // ── Cron ────────────────────────────────────────────
  router.register('cron', (args) => {
    try {
      if (args[0] === 'list' || !args[0]) {
        const list = cron.list ? cron.list() : [];
        return { type: 'text', content: list.length ? JSON.stringify(list, null, 2) : 'No cron jobs' };
      }
    } catch {}
    return { type: 'text', content: 'Usage: /cron [list]' };
  }, {
    description: 'Manage scheduled tasks',
    category: 'automation',
  });

  // ── Config ──────────────────────────────────────────
  router.register('config', (args) => {
    if (args[0] === 'get' && args[1]) {
      const val = storage.getConfig(args[1]);
      return { type: 'text', content: `${args[1]}: ${JSON.stringify(val)}` };
    }
    if (args[0] === 'set' && args[1] && args[2]) {
      try {
        storage.setConfig(args[1], JSON.parse(args.slice(2).join(' ')));
      } catch {
        storage.setConfig(args[1], args.slice(2).join(' '));
      }
      return { type: 'text', content: `Config set: ${args[1]}` };
    }
    if (args[0] === 'list' || !args[0]) {
      const cfg = storage.getConfig(null, {});
      return { type: 'text', content: JSON.stringify(cfg, null, 2) };
    }
    return { type: 'text', content: 'Usage: /config [get|set|list]' };
  }, {
    description: 'Manage configuration',
    aliases: ['cfg'],
    category: 'core',
  });

  // ── System ──────────────────────────────────────────
  router.register('system', (args) => {
    if (args[0] === 'info' || !args[0]) {
      const mem = process.memoryUsage();
      const info = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
        uptime: `${Math.round(process.uptime())}s`,
        memory: `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.rss / 1024 / 1024)}MB`,
        cpus: os.cpus().length,
        hostname: os.hostname(),
        homedir: os.homedir(),
        configDir: CONFIG_DIR,
      };
      return { type: 'text', content: JSON.stringify(info, null, 2) };
    }
    if (args[0] === 'env' && args[1]) {
      return { type: 'text', content: `${args[1]}=${process.env[args[1]] || '(not set)'}` };
    }
    return { type: 'text', content: 'Usage: /system [info|env <var>]' };
  }, {
    description: 'System information',
    aliases: ['sys'],
    category: 'system',
  });

  // ── History ─────────────────────────────────────────
  router.register('history', (args) => {
    const limit = parseInt(args[0]) || 20;
    const hist = storage.getHistory(limit);
    return { type: 'text', content: hist.length ? hist.map(h => `  ${h.input}`).join('\n') : 'No history' };
  }, {
    description: 'Show command history',
    aliases: ['hist'],
    category: 'core',
  });

  // ── Export/Import Profile ───────────────────────────
  router.register('profile', (args) => {
    if (args[0] === 'export') {
      const profile = storage.exportProfile(currentUser);
      const exportPath = path.join(CONFIG_DIR, `${currentUser}-profile.json`);
      fs.writeFileSync(exportPath, JSON.stringify(profile, null, 2));
      return { type: 'text', content: `Profile exported to: ${exportPath}` };
    }
    if (args[0] === 'import' && args[1]) {
      try {
        const data = JSON.parse(fs.readFileSync(args[1], 'utf8'));
        storage.importProfile(currentUser, data);
        return { type: 'text', content: 'Profile imported successfully' };
      } catch (e) {
        return { type: 'error', content: `Import failed: ${e.message}` };
      }
    }
    return { type: 'text', content: 'Usage: /profile [export|import <path>]' };
  }, {
    description: 'Export/import user profile',
    category: 'core',
  });

  // ── Watchdog ────────────────────────────────────────
  router.register('watchdog', (args) => {
    try {
      const status = watchdog.status ? watchdog.status() : { running: false };
      return { type: 'text', content: JSON.stringify(status, null, 2) };
    } catch {
      return { type: 'text', content: 'Watchdog not active' };
    }
  }, {
    description: 'Watchdog status',
    category: 'system',
  });

  // ── Gateway ─────────────────────────────────────────
  router.register('gateway', (args) => {
    try {
      const status = gateway.status ? gateway.status() : { running: false };
      return { type: 'text', content: JSON.stringify(status, null, 2) };
    } catch {
      return { type: 'text', content: 'Gateway not active' };
    }
  }, {
    description: 'Gateway status',
    category: 'system',
  });

  // ── MCP ─────────────────────────────────────────────
  router.register('mcp', (args) => {
    try {
      const status = mcp.status ? mcp.status() : { servers: [] };
      return { type: 'text', content: JSON.stringify(status, null, 2) };
    } catch {
      return { type: 'text', content: 'MCP not active' };
    }
  }, {
    description: 'MCP server status',
    category: 'system',
  });

  // ── Animation Demo ──────────────────────────────────
  router.register('animate', async (args) => {
    if (!process.stdout.isTTY) return { type: 'text', content: 'Animations require a TTY terminal' };
    const style = args[0] || 'wave';
    const text = args.slice(1).join(' ') || 'Uthy OS v2.0 — Terminal-Native AI Operating System';

    if (style === 'wave') {
      for (let frame = 0; frame < 60; frame++) {
        process.stdout.write('\r' + renderer.waveEffect(text, frame));
        await new Promise(r => setTimeout(r, 50));
      }
      process.stdout.write('\n');
    } else if (style === 'glitch') {
      for (let frame = 0; frame < 30; frame++) {
        process.stdout.write('\r' + renderer.glitchEffect(text, 0.15));
        await new Promise(r => setTimeout(r, 80));
      }
      process.stdout.write('\n');
    } else if (style === 'gradient') {
      for (let frame = 0; frame < 40; frame++) {
        const phase = frame / 40;
        const g = renderer.theme.bannerGradient;
        const colors = g.map((c, i) => g[(i + Math.floor(frame / 5)) % g.length]);
        process.stdout.write('\r' + renderer.gradient(text, colors));
        await new Promise(r => setTimeout(r, 80));
      }
      process.stdout.write('\n');
    }
    return null;
  }, {
    description: 'Demo animations (wave|glitch|gradient)',
    category: 'fun',
  });

  // ── Clear ───────────────────────────────────────────
  router.register('clear', () => {
    console.clear();
    return null;
  }, {
    description: 'Clear screen',
    aliases: ['cls'],
    category: 'core',
  });

  // ── Quit ────────────────────────────────────────────
  router.register('quit', async () => {
    return { type: 'quit' };
  }, {
    description: 'Exit Uthy OS',
    aliases: ['exit', 'q', 'bye'],
    category: 'core',
  });
}

// ════════════════════════════════════════════════════════════
// RESULT RENDERER — Display command results beautifully
// ════════════════════════════════════════════════════════════

function renderResult(result, renderer) {
  if (!result) return;
  const theme = renderer.theme;
  const reset = '\x1b[0m';

  switch (result.type) {
    case 'text':
      console.log(result.content);
      break;

    case 'error':
      console.log(`${theme.error}✖ ${result.content || result.message}${reset}`);
      break;

    case 'help':
      console.log(renderer.renderHelp(result.commands));
      break;

    case 'status': {
      const d = result.data;
      console.log('');
      console.log(renderer.renderBox(
        [
          `Version:  ${theme.accent}v${d.version}${reset}`,
          `Uptime:   ${theme.accent}${renderer.formatUptime(d.uptime)}${reset}`,
          `User:     ${theme.accent}${d.user}${reset}`,
          `Theme:    ${theme.accent}${d.theme}${reset}`,
          `Memory:   ${theme.accent}${d.memoryMB}MB${reset}`,
          `Providers:${theme.accent} ${d.providers} (${d.providerNames})${reset}`,
          `Skills:   ${theme.accent} ${d.skills} (${d.skillsEnabled} enabled)${reset}`,
          `Modules:  ${theme.accent} ${d.modules}${reset}`,
        ].join('\n'),
        { title: '⚡ System Status', style: 'double', color: theme.primary }
      ));
      console.log('');
      break;
    }

    case 'themes': {
      const rows = result.themes.map(t => [t.id, t.name, t.id === renderer.themeName ? '● active' : '']);
      console.log('');
      console.log(renderer.renderTable(['ID', 'Name', 'Status'], rows, { color: theme.primary }));
      console.log('');
      break;
    }

    case 'providers': {
      const rows = result.providers.map(p => [
        p.id, p.name, p.hasKey ? '✓ configured' : '✗ no key',
        p.models.length + ' models',
      ]);
      console.log('');
      console.log(renderer.renderTable(['Provider', 'Name', 'Status', 'Models'], rows, { color: theme.primary }));
      console.log('');
      break;
    }

    case 'models': {
      const rows = result.models.map(m => [
        m.provider, m.name, m.available ? '✓' : '✗',
        m.cost ? `$${m.cost.input}/$${m.cost.output}` : 'free',
      ]);
      console.log('');
      console.log(renderer.renderTable(['Provider', 'Model', 'Available', 'Cost (in/out per 1k)'], rows, { color: theme.primary }));
      console.log('');
      break;
    }

    case 'skills': {
      const rows = result.skills.map(s => [
        s.name, s.category, s.version, s.enabled ? '✓' : '✗',
      ]);
      console.log('');
      console.log(renderer.renderTable(['Skill', 'Category', 'Version', 'Enabled'], rows, { color: theme.primary }));
      console.log('');
      break;
    }

    case 'ai-response':
      console.log('');
      console.log(renderer.renderChatMessage('assistant', result.content, { model: result.model }));
      if (result.usage) {
        console.log(theme.muted + `  tokens: ${result.usage.prompt_tokens || '?'}→${result.usage.completion_tokens || '?'}` + reset);
      }
      break;

    case 'suggestion':
      console.log(`${theme.warn}💡 ${result.message}${reset}`);
      break;

    case 'quit':
      return 'quit';

    default:
      if (result.message) console.log(result.message);
      if (result.content) console.log(result.content);
  }
  return null;
}

// ════════════════════════════════════════════════════════════
// MAIN REPL
// ════════════════════════════════════════════════════════════

async function startRepl(config) {
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;
  const theme = THEMES[config.theme] || THEMES.cyber;

  // ── Boot ────────────────────────────────────────────
  await bootSequence(config, isTTY);

  // ── Auth ────────────────────────────────────────────
  let loggedInUser = 'guest';
  try {
    const authResult = auth.init();
    if (authResult.autoLogin) {
      loggedInUser = authResult.username;
    } else if (isTTY) {
      // Login prompt
      const loginRl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const ask = (q) => new Promise(resolve => loginRl.question(q, resolve));

      console.log('');
      console.log(theme.primary + '  ╔═══════════════════════════════════════╗' + '\x1b[0m');
      console.log(theme.primary + '  ║     UTHY OS — Login Required         ║' + '\x1b[0m');
      console.log(theme.primary + '  ╚═══════════════════════════════════════╝' + '\x1b[0m');
      console.log('');

      const username = await ask(theme.accent + '  Username: ' + '\x1b[0m');
      if (username && username.trim()) {
        const password = await ask(theme.accent + '  Password: ' + '\x1b[0m');
        try {
          if (auth.createUser) {
            // Try login first, create if doesn't exist
            const loginResult = auth.login ? auth.login(username.trim(), password) : null;
            if (loginResult && loginResult.success) {
              loggedInUser = username.trim();
            } else {
              // Create new user
              if (auth.createUser) {
                auth.createUser(username.trim(), password);
                loggedInUser = username.trim();
              }
            }
          }
        } catch (e) {
          // Auth failed, use guest
        }
      }
      loginRl.close();
    }

    // Set user in storage
    currentUser = loggedInUser;
    storage.setUser(loggedInUser, loggedInUser === 'guest' ? 'guest' : loggedInUser);
    kernel.user = loggedInUser;
  } catch (e) {
    // Auth module not available, use guest
  }

  console.clear();

  // ── Show Banner ─────────────────────────────────────
  if (isTTY) {
    console.log(renderer.renderBanner(VERSION));
    console.log('');
    console.log(theme.muted + `  Welcome ${theme.accent}${loggedInUser}${reset}${theme.muted} to Uthy OS — Type /help for commands` + '\x1b[0m');
    console.log(theme.muted + `  Providers: ${models.listProviders().length} | Skills: ${skillEngine.getStats().total} | Theme: ${config.theme}` + '\x1b[0m');
    console.log('');
  } else {
    console.log(`Uthy OS v${VERSION} — Welcome ${loggedInUser}`);
  }

  // ── Register Commands ───────────────────────────────
  registerCommands(kernel.router);

  // ── Status Bar Animation ────────────────────────────
  if (isTTY) {
    const drawStatusBar = () => {
      const mem = process.memoryUsage();
      const state = {
        user: currentUser,
        theme: typeof kernel.theme === 'string' ? kernel.theme : (kernel.theme?.name || 'cyber'),
        uptime: kernel.getUptime(),
        modules: loader_list().length,
        model: models.defaultProvider || 'local',
        memoryUsed: Math.round(mem.heapUsed / 1024 / 1024),
        memoryTotal: Math.round(mem.rss / 1024 / 1024),
      };
      process.stdout.write('\x1b[s'); // save cursor
      process.stdout.write('\x1b[1;1H'); // move to top
      process.stdout.write(renderer.renderStatusBar(state));
      process.stdout.write('\x1b[u'); // restore cursor
    };

    // Status bar refresh every 2s
    const statusTimer = setInterval(drawStatusBar, 2000);
    setTimeout(drawStatusBar, 100); // initial draw

    // Cleanup on exit
    process.on('SIGINT', () => {
      clearInterval(statusTimer);
      renderer.destroy();
      process.exit(0);
    });
  }

  // ── REPL Loop ───────────────────────────────────────
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: renderer.renderPrompt(loggedInUser),
    historySize: config.historySize || 100,
    completer: (line) => {
      const commands = kernel.router.getCompletions(line.startsWith('/') ? line.slice(1) : line);
      if (commands.length) {
        return [commands.map(c => '/' + c.name), line];
      }
      return [[], line];
    },
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const trimmed = input.trim();
    if (!trimmed) { rl.prompt(); return; }

    // Save to history
    storage.appendHistory({ input: trimmed, user: currentUser });

    // Execute command
    try {
      const result = await kernel.router.execute(trimmed, { user: currentUser });
      if (result) {
        const quit = renderResult(result, renderer);
        if (quit === 'quit') {
          console.log(theme.accent + '\n  Goodbye! 👋' + '\x1b[0m\n');
          await kernel.shutdown();
          renderer.destroy();
          rl.close();
          process.exit(0);
        }
      }
    } catch (err) {
      console.log(`${theme.error}✖ Error: ${err.message}\x1b[0m`);
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    await kernel.shutdown();
    renderer.destroy();
    process.exit(0);
  });
}

// ════════════════════════════════════════════════════════════
// UTILITY
// ════════════════════════════════════════════════════════════

function loader_list() {
  try {
    return kernel ? kernel.loader.list() : [];
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════
// CLI ENTRY POINT (commander.js)
// ════════════════════════════════════════════════════════════

const program = new Command();

program
  .name('uthy')
  .description('UTHY OS — Terminal-Native AI Operating System')
  .version(VERSION);

program
  .command('shell')
  .description('Start interactive REPL')
  .action(() => startRepl(loadConfig()));

program
  .command('theme <name>')
  .description('Set theme')
  .action((name) => {
    const cfg = loadConfig();
    cfg.theme = name;
    saveConfig(cfg);
    console.log(`Theme set to: ${name}`);
  });

program
  .command('providers')
  .description('List available AI providers')
  .action(() => {
    const router = new ModelRouter();
    router.loadFromEnv();
    const list = router.listProviders();
    console.log('\nAvailable Providers:');
    for (const p of list) {
      console.log(`  ${p.hasKey ? '✓' : '✗'} ${p.name} (${p.models.length} models)`);
    }
    console.log(`\nTotal: ${list.length} providers, ${router.listAllModels().length} models`);
  });

program
  .command('skills')
  .description('List available skills')
  .action(async () => {
    const engine = new SkillEngine();
    await engine.init();
    const skills = engine.list();
    console.log('\nAvailable Skills:');
    for (const s of skills) {
      console.log(`  ${s.enabled ? '✓' : '✗'} ${s.name} (${s.category}) — ${s.description}`);
    }
    console.log(`\nTotal: ${skills.length} skills`);
  });

program
  .command('themes')
  .description('List available themes')
  .action(() => {
    const r = new TerminalRenderer();
    const themes = r.listThemes();
    console.log('\nAvailable Themes:');
    for (const t of themes) {
      console.log(`  ● ${t.id} — ${t.name}`);
    }
    console.log(`\nTotal: ${themes.length} themes`);
  });

program
  .command('info')
  .description('Show system information')
  .action(() => {
    const mem = process.memoryUsage();
    console.log(`
Uthy OS v${VERSION} — System Information
${'─'.repeat(50)}
Platform:    ${process.platform}
Arch:        ${process.arch}
Node:        ${process.version}
PID:         ${process.pid}
Memory:      ${Math.round(mem.heapUsed / 1024 / 1024)}MB heap, ${Math.round(mem.rss / 1024 / 1024)}MB RSS
CPUs:        ${os.cpus().length}
Hostname:    ${os.hostname()}
Config Dir:  ${CONFIG_DIR}
`);
  });

// Default: interactive REPL
program
  .action(() => startRepl(loadConfig()));

program.parse(process.argv);

// If no args, start REPL
if (!process.argv.slice(2).length) {
  startRepl(loadConfig());
}
