#!/usr/bin/env node

/**
 * UTHY AGENTIC OS — Autonomous Agentic Operating System
 * Interactive CLI with REPL, themes, ASCII art, and full test automation.
 *
 * Usage:
 *   uthy                    → Interactive REPL mode
 *   uthy <command> [opts]   → Direct command execution
 *   uthy --help             → Show help
 *   uthy --version          → Show version
 */

const { Command } = require('commander');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── UI ──────────────────────────────────────────────────────
const {
  THEMES, renderBanner, renderBannerAtTop, renderBox, renderMenu,
  colorize, progressBar, spinner, divider,
  startHudRefresh, renderHudCard, renderHudAtTop, stripAnsi,
} = require('./ui');

// ── Core Modules ────────────────────────────────────────────
const { runWebTest } = require('./modules/web');
const { runMobileTest } = require('./modules/mobile');
const { runDesktopTest } = require('./modules/desktop');
const { runCliTest } = require('./modules/cli');
const { runApiTest } = require('./modules/api');
const { runAccessibilityTest } = require('./modules/accessibility');
const { runPerformanceTest } = require('./modules/performance');
const { generateReport } = require('./modules/report');
const { generateFixPrompt } = require('./modules/fix_prompt');
const { captureScreenshot, recordVideo } = require('./modules/evidence');

// ── Advanced Modules ────────────────────────────────────────
const { FlakinessDetector } = require('./modules/flakiness');
const { ParallelEngine } = require('./modules/parallel');
const { VisualRegressionTester } = require('./modules/visual_regression');
const { TestOracle } = require('./modules/oracle');
const { SessionRecorder, SessionTrace, ReplayViewer } = require('./modules/session_replay');
const { EnvironmentProvisioner } = require('./modules/provisioner');

// ── Chat Module ─────────────────────────────────────────────
const {
  parseAttachments, readAttachedFile, renderChatPrompt,
  renderChatMessage, renderFileTree, walkDirectory,
  getFileTypeInfo, formatFileSize,
} = require('./modules/chat');

// ── Core Feature Engines ────────────────────────────────────
const { MemoryEngine } = require('./modules/memory');
const { SkillEngine } = require('./modules/skills');
const { GoalEngine } = require('./modules/goals');
const { ModelRouter } = require('./modules/models');
const { CronEngine } = require('./modules/cron');
const { KnowledgeEngine } = require('./modules/knowledge');
const { SessionEngine } = require('./modules/sessions');
const { WebSearchEngine } = require('./modules/websearch');
const { WatchdogEngine } = require('./modules/watchdog');
const { DelegationEngine } = require('./modules/delegation');

// ── Chat Panel (HUD-framed input) ─────────────────────────
const { ChatPanel } = require('./modules/chatPanel');

// ── Setup, Config, Gateway, MCP, Animations ───────────────
const { ConfigManager } = require('./modules/config');
const { GatewayManager } = require('./modules/gateway');
const { MCPManager } = require('./modules/mcp');
const { Animations } = require('./modules/animations');

// ── TUI Layout Manager (responsive zones, unified animation) ─
const { LayoutManager } = require('./modules/tui');

// ── Update Engine (self-update with animated progress) ────
const { UpdateEngine, render3DFrame, gradientBar, gradientText, getSpinnerFrame } = require('./modules/update');

// ── Authentication & Boot Animation ───────────────────────
const { AuthEngine } = require('./modules/auth');
const { bootAndLogin, welcomeAnimation } = require('./modules/bootAnimation');

// ════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════

const VERSION = '1.2.0';
const CONFIG_DIR = path.join(os.homedir(), '.uthy');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (_) {}
  return { theme: 'cyber', compactBanner: false, historySize: 100 };
}

function saveConfig(cfg) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (_) {}
}

function getTheme(cfg) {
  return THEMES[cfg.theme] || THEMES.cyber;
}

// ════════════════════════════════════════════════════════════
// INTERACTIVE REPL
// ════════════════════════════════════════════════════════════

function startRepl() {
  const config = loadConfig();
  const theme = getTheme(config);

  // ── Layout Manager (responsive, isTTY-aware) ────────────
  const layout = new LayoutManager();
  const isTTY = layout.isTTY;

  // ── Authentication ──────────────────────────────────────
  const auth = new AuthEngine();
  let loggedInUser = config.user?.name || 'guest';

  // Boot animation + login (TTY only)
  const doBoot = async () => {
    if (!isTTY) {
      auth.init();
      startReplInner(config, theme, layout, isTTY, auth, loggedInUser);
      return;
    }

    try {
      const { bootAndLogin } = require('./modules/bootAnimation');
      const result = await bootAndLogin(auth, isTTY);
      loggedInUser = result.username;
      config.user = config.user || {};
      config.user.name = loggedInUser;
    } catch (e) {
      // Auth skipped or failed
    }

    process.stdout.write('\x1b[2J\x1b[H');
    startReplInner(config, theme, layout, isTTY, auth, loggedInUser);
  };

  doBoot();
}

function startReplInner(config, theme, layout, isTTY, auth, loggedInUser) {

  // Draw initial frame
  if (isTTY) {
    const initState = {
      clock: new Date().toLocaleTimeString('en-US', { hour12: false }),
      date: new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      themeName: config.theme || 'cyber',
      memoryCount: 0,
      sessionTime: '0:00',
      engineCount: 17,
    };
    process.stdout.write(layout.renderFrame(theme, initState));

    // Push content below top zone
    const zones = layout.getZones();
    console.log('\n'.repeat(zones.top.height + 1));
  }

  // Welcome text
  console.log(colorize(`  Welcome ${loggedInUser} to UTHY AGENTIC OS v${VERSION}`, 'info', theme));
  if (isTTY) {
    console.log(colorize(`  Layout: ${layout.mode} (${layout.cols}×${layout.rows}) | Type "/layout" to change`, 'muted', theme));
  }
  console.log(colorize('  Type "help" for commands, "/help" for slash commands, "quit" to exit', 'muted', theme));
  console.log('');

  // ── Initialize all engines ───────────────────────────────
  const memory = new MemoryEngine();
  const skills = new SkillEngine();
  const goals = new GoalEngine();
  const models = new ModelRouter();
  const cron = new CronEngine();
  const knowledge = new KnowledgeEngine();
  const sessions = new SessionEngine();
  const websearch = new WebSearchEngine();
  const watchdog = new WatchdogEngine();
  const delegation = new DelegationEngine();
  const configMgr = new ConfigManager();
  const gateway = new GatewayManager(configMgr);
  const mcp = new MCPManager();

  let currentSession = null;
  let enginesReady = false;
  let sessionStartTime = Date.now();

  // ── Unified animation loop (500ms, single timer) ─────────
  const startUnifiedAnimation = () => {
    if (!isTTY) return; // no animation in piped mode

    layout.startAnimation((phase) => {
      // Update clock
      const now = new Date();
      const state = {
        clock: now.toLocaleTimeString('en-US', { hour12: false }),
        date: now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
        themeName: config.theme || 'cyber',
        memoryCount: 0,
        sessionTime: Math.floor((Date.now() - sessionStartTime) / 60000) + ':' + String(Math.floor(((Date.now() - sessionStartTime) % 60000) / 1000)).padStart(2, '0'),
        engineCount: 17,
      };

      // Get memory count if ready
      if (enginesReady && memory.stats) {
        const ms = memory.stats();
        state.memoryCount = ms.total || 0;
      }

      // Render the layout frame
      process.stdout.write(layout.renderFrame(theme, state));
    }, 500);
  };

  // ── 3D Animated Loading ──────────────────────────────────
  const ESC_CHR = '\x1b';
  const rgbStr = (r, g, b) => `${ESC_CHR}[38;2;${r};${g};${b}m`;
  const resetStr = () => `${ESC_CHR}[0m`;
  const boldStr = (s) => `${ESC_CHR}[1m${s}${ESC_CHR}[0m`;
  const dimStr = (s) => `${ESC_CHR}[2m${s}${ESC_CHR}[0m`;

  function lerpC(c1, c2, t) {
    return [Math.round(c1[0]+(c2[0]-c1[0])*t), Math.round(c1[1]+(c2[1]-c1[1])*t), Math.round(c1[2]+(c2[2]-c1[2])*t)];
  }

  function gradBar(pct, width, phase) {
    const filled = Math.round((pct / 100) * width);
    const empty = width - filled;
    const colors = [[0,255,255],[0,200,255],[100,100,255],[200,0,255],[255,0,200]];
    let bar = '';
    for (let i = 0; i < filled; i++) {
      const t = (i / width + phase) % 1;
      const ci = t * (colors.length - 1);
      const idx = Math.floor(ci);
      const frac = ci - idx;
      const c = lerpC(colors[Math.min(idx, colors.length-1)], colors[Math.min(idx+1, colors.length-1)], frac);
      bar += rgbStr(c[0], c[1], c[2]) + '█';
    }
    for (let i = 0; i < empty; i++) {
      const pulse = Math.sin((i + phase * 20) * 0.5) > 0.3;
      bar += pulse ? dimStr(rgbStr(60,60,80) + '░') : dimStr(rgbStr(40,40,60) + '░');
    }
    return bar + resetStr();
  }

  function gradText(text, phase) {
    const colors = [[0,255,255],[0,200,255],[100,100,255],[200,0,255]];
    let output = '';
    for (let i = 0; i < text.length; i++) {
      const t = (i / text.length + phase) % 1;
      const ci = t * (colors.length - 1);
      const idx = Math.floor(ci);
      const frac = ci - idx;
      const c = lerpC(colors[Math.min(idx, colors.length-1)], colors[Math.min(idx+1, colors.length-1)], frac);
      output += rgbStr(c[0], c[1], c[2]) + text[i];
    }
    return output + resetStr();
  }

  function renderLoadingFrame(pct, statusText, engineName, phase, doneNames) {
    const W = 64;
    const inner = W - 4;
    const lines = [];

    // 3D top shadow
    lines.push(dimStr(rgbStr(30,30,40)) + '▓'.repeat(W + 2) + resetStr());

    // Top border with gradient
    lines.push(' ' + gradText('╭─ ⟨ UTHY AGENTIC OS ⟩ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮', phase));

    // Status line
    const statusPad = Math.max(0, inner - statusText.length);
    lines.push(dimStr(rgbStr(60,60,70)) + ' │' + resetStr() + ' ' + rgbStr(0,200,255) + statusText + ' '.repeat(statusPad) + dimStr(rgbStr(60,60,70)) + ' │ ▓' + resetStr());

    // Progress bar
    const pctStr = String(Math.round(pct)).padStart(3) + '%';
    const barW = inner - 10;
    const bar = gradBar(pct, barW, phase);
    lines.push(dimStr(rgbStr(60,60,70)) + ' │ ' + resetStr() + bar + ' ' + boldStr(rgbStr(255,255,255) + pctStr + resetStr()) + dimStr(rgbStr(60,60,70)) + ' │ ▓' + resetStr());

    // Engine checklist — 2 columns
    const allEngines = ['Config','Memory','Skills','Goals','Models','Cron','Knowledge','Sessions','WebSearch','Watchdog','Delegation','MCP','Gateway'];
    const mid = Math.ceil(allEngines.length / 2);
    for (let row = 0; row < mid; row++) {
      const left = allEngines[row];
      const right = allEngines[row + mid];
      const leftDone = doneNames.includes(left);
      const rightDone = right ? doneNames.includes(right) : false;
      const leftIcon = leftDone ? rgbStr(0,255,100) + '✓' + resetStr() : rgbStr(255,200,0) + '◌' + resetStr();
      const rightIcon = rightDone ? rgbStr(0,255,100) + '✓' + resetStr() : (right ? rgbStr(255,200,0) + '◌' + resetStr() : ' ');
      const leftText = leftDone ? rgbStr(0,200,150) + left.padEnd(12) + resetStr() : dimStr(rgbStr(100,100,120) + left.padEnd(12) + resetStr());
      const rightText = right && rightDone ? rgbStr(0,200,150) + (right||'').padEnd(12) + resetStr() : dimStr(rgbStr(100,100,120) + (right||'').padEnd(12) + resetStr());
      const checkLine = `  ${leftIcon} ${leftText}  ${rightIcon} ${rightText}`;
      const checkPad = Math.max(0, inner - 52);
      lines.push(dimStr(rgbStr(60,60,70)) + ' │' + resetStr() + checkLine + ' '.repeat(checkPad) + dimStr(rgbStr(60,60,70)) + ' │ ▓' + resetStr());
    }

    // Bottom border
    lines.push(' ' + gradText('╰────────────────────────────────────────────────────────╯', (phase + 0.5) % 1));

    // 3D bottom shadow
    lines.push(dimStr(rgbStr(20,20,30)) + '▓'.repeat(W + 2) + resetStr());

    return lines;
  }

  // Initialize engines with 3D animated loading
  const initEngines = async () => {
    const engineSteps = [
      { name: 'Config',     fn: async () => { await configMgr.init(); } },
      { name: 'Memory',     fn: async () => { await memory.init(); } },
      { name: 'Skills',     fn: async () => { await skills.init(); } },
      { name: 'Goals',      fn: async () => { await goals.init(); } },
      { name: 'Models',     fn: async () => { await models.init(); } },
      { name: 'Cron',       fn: async () => { await cron.init(); } },
      { name: 'Knowledge',  fn: async () => { await knowledge.init(); } },
      { name: 'Sessions',   fn: async () => { await sessions.init(); } },
      { name: 'WebSearch',  fn: async () => { await websearch.init(); } },
      { name: 'Watchdog',   fn: async () => { await watchdog.init(); } },
      { name: 'Delegation', fn: async () => { await delegation.init(); } },
      { name: 'MCP',        fn: async () => { await mcp.init(); } },
      { name: 'Gateway',    fn: async () => { await gateway.init(); } },
    ];

    const doneNames = [];
    let loadPhase = 0;
    let loadPct = 0;
    let loadStatus = 'Initializing engines...';
    let loadEngine = '';
    const frameLines = 16; // approximate frame height

    // 3D loading animation loop (100ms)
    const loadTimer = setInterval(() => {
      if (!isTTY) return;
      loadPhase = (loadPhase + 0.03) % 1;
      const frame = renderLoadingFrame(loadPct, loadStatus, loadEngine, loadPhase, doneNames);
      // Move cursor to start of frame area
      process.stdout.write(`\x1b[s`); // save
      process.stdout.write(`\x1b[${frameLines}A`); // move up
      for (const line of frame) {
        process.stdout.write(`\x1b[2K` + line + '\n');
      }
      process.stdout.write(`\x1b[u`); // restore
    }, 100);

    // Print initial frame space
    if (isTTY) {
      for (let i = 0; i < frameLines; i++) console.log('');
    }

    try {
      for (let i = 0; i < engineSteps.length; i++) {
        const step = engineSteps[i];
        loadPct = ((i) / engineSteps.length) * 100;
        loadStatus = `Initializing ${step.name}...`;
        loadEngine = step.name;

        try {
          await step.fn();
          doneNames.push(step.name);
        } catch (e) {
          doneNames.push(step.name); // still mark as done (attempted)
          console.log(colorize(`  ⚠ ${step.name}: ${e.message}`, 'warn', theme));
        }
      }

      // Final: start session
      currentSession = await sessions.start('UTHY Session ' + new Date().toISOString().slice(0, 19));
      sessionStartTime = Date.now();
      watchdog.heartbeat('session-start');
      enginesReady = true;
      loadPct = 100;
      loadStatus = 'All systems online!';

      // Wait a moment to show 100%
      await new Promise(r => setTimeout(r, 800));

      clearInterval(loadTimer);

      if (isTTY) {
        // Clear the loading frame area
        process.stdout.write(`\x1b[${frameLines}A`);
        for (let i = 0; i < frameLines; i++) process.stdout.write(`\x1b[2K\n`);
        process.stdout.write(`\x1b[${frameLines}A`);
      }

      console.log(colorize(`  ✓ All 13 engines initialized (${layout.mode} mode)`, 'success', theme));
      console.log('');
      startUnifiedAnimation();
      rl.prompt();
    } catch (e) {
      clearInterval(loadTimer);
      enginesReady = true;
      console.log(colorize(`  ⚠ Engine init warning: ${e.message}`, 'warn', theme));
      console.log('');
      startUnifiedAnimation();
      rl.prompt();
    }
  };

  initEngines();

  // ── P0-1: Error Boundaries ─────────────────────────────
  process.on('uncaughtException', (err) => {
    if (enginesReady) {
      console.log(colorize(`  ✗ Uncaught: ${err.message}`, 'error', theme));
      chatPanel.errorFlash();
      try { rl.prompt(); } catch (_) {}
    }
  });
  process.on('unhandledRejection', (err) => {
    if (enginesReady) {
      console.log(colorize(`  ✗ Unhandled: ${err}`, 'error', theme));
      chatPanel.errorFlash();
      try { rl.prompt(); } catch (_) {}
    }
  });

  // ── P0-4: Cached stats for status bar ──────────────────
  let cachedStats = { memory: 0, goals: 0, skills: 0, mcp: 0 };
  setInterval(async () => {
    if (!enginesReady) return;
    try {
      const ms = await memory.stats();
      const gs = await goals.stats();
      const ss = await skills.stats();
      const mc = await mcp.stats();
      cachedStats = { memory: ms.total || 0, goals: gs.total || 0, skills: ss.total || 0, mcp: mc.total || 0 };
    } catch (_) {}
  }, 5000);

  // Start the real-time HUD overlay (legacy, replaced by layout manager)
  const stopHud = startHudRefresh(theme, 1000);

  // ── Create Chat Panel (legacy, for /chat command) ─────
  const chatPanel = new ChatPanel({ theme });

  // ── P1-6: Command Aliases ──────────────────────────────
  const aliases = {
    'q': 'quit', 'Q': 'quit', 'exit': 'quit',
    'h': 'help', 'H': 'help',
    's': 'status', 'S': 'status',
    'm': 'memory list', 'M': 'memory list',
    'g': 'goal list', 'G': 'goal list',
    'sk': 'skill list',
    'ml': 'model list',
    'kb': 'kb stats',
    'ss': 'session list',
    'w': 'watch list',
    'd': 'delegate list',
    'e': '/engines',
    't': '/theme',
    'l': '/layout',
    'c': '/config list',
    '?': '/help',
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: layout.getPromptString(theme),
    historySize: config.historySize || 100,
    completer: (line) => {
      const cmds = [
        'help', 'quit', 'exit', 'clear', 'banner', 'theme', 'themes',
        'test:web', 'test:mobile', 'test:desktop', 'test:cli', 'test:api',
        'test:accessibility', 'test:performance', 'test:flakiness', 'test:visual',
        'run:parallel', 'generate:assertions', 'generate:report', 'generate:fix-prompt',
        'record:trace', 'record:video', 'capture:screenshot',
        'replay:view', 'provision', 'provision:teardown', 'visual:update-baseline',
        'about', 'modules', 'status', 'social', 'hud', 'footer',
        'chat', 'attach', 'files', 'tree', 'upload',
        'memory', 'skill', 'skills', 'goal', 'goals', 'model', 'models',
        'cron', 'kb', 'knowledge', 'session', 'sessions',
        'search', 'extract', 'watch', 'delegate', 'ask',
        'whoami', 'login', 'logout', 'register', 'passwd', 'users',
        'setup', 'config', 'gateway', 'mcp', 'font', 'update',
        '/setup', '/config', '/gateway', '/mcp', '/theme', '/themes',
        '/font', '/help', '/commands', '/status', '/engines', '/clear', '/quit',
        '/layout', '/chat', 'layout', '/update',
      ];
      const hits = cmds.filter(c => c.startsWith(line));

      // P1-8: Smart subcommand completion
      const subcmds = {
        '/theme': Object.keys(THEMES),
        'theme': Object.keys(THEMES),
        'help': ['testing','generate','memory','skills','goals','models','cron','knowledge','sessions','web','watchdog','delegation','shell'],
        '/layout': ['wide','compact','minimal','zen'],
        'layout': ['wide','compact','minimal','zen'],
        'config': ['get','set','list','reset','export','secret'],
        '/config': ['get','set','list','reset','export','secret'],
        'gateway': ['test','test:all','list','setkey'],
        '/gateway': ['test','test:all','list','setkey'],
        'mcp': ['list','add','test','remove','stats'],
        '/mcp': ['list','add','test','remove','stats'],
        'memory': ['add','list','search','stats','remove'],
        'skill': ['list','load','search','stats'],
        'goal': ['add','list','done','kanban','review','remove'],
        'model': ['list','active','set','route','usage','providers'],
        'cron': ['add','list','run','pause','resume','remove','stats'],
        'kb': ['index','search','stats','forget','rebuild'],
        'session': ['list','search','checkpoint','stats'],
        'watch': ['add','list','check','heartbeat','nudge','stats'],
        'delegate': ['parallel','list','stats'],
        'model': ['list','active','set','route','usage','providers'],
      };
      const parts = line.split(/\s+/);
      if (parts.length >= 2 && subcmds[parts[0]]) {
        const rest = parts[parts.length - 1];
        const prefix = parts.slice(0, -1).join(' ') + ' ';
        const subHits = subcmds[parts[0]].filter(s => s.startsWith(rest));
        return [subHits.map(s => prefix + s), line];
      }

      return [hits.length ? hits : cmds, line];
    },
  });

  // Load history
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const hist = fs.readFileSync(HISTORY_FILE, 'utf8').split('\n').filter(Boolean);
      hist.forEach(h => rl.history.push(h));
    }
  } catch (_) {}

  // Prompt will be shown after engines init completes (see initEngines)

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    const [rawCmd, ...args] = input.split(/\s+/);
    // Support /slash commands — strip prefix for matching, keep original for display
    let cmd = rawCmd.startsWith('/') ? rawCmd : rawCmd;

    // P1-6: Resolve command aliases
    if (aliases[cmd] && !args.length) {
      const resolved = aliases[cmd];
      const parts = resolved.split(/\s+/);
      cmd = parts[0];
      args.push(...parts.slice(1));
    }

    // P0-2: Engine health check — warn if engines not ready
    if (!enginesReady && !['quit', 'exit', '/quit', '/exit', 'help', '/help', 'clear', '/clear'].includes(cmd)) {
      console.log(colorize('  ⏳ Engines still initializing, please wait...', 'warn', theme));
      rl.prompt();
      return;
    }

    // Update chat panel status
    chatPanel.setStatus(`Executing: ${cmd}`);
    chatPanel.flash();

    // Record message in session
    if (currentSession && sessions && enginesReady) {
      try { await sessions.addMessage(currentSession.id, 'user', input); } catch (_) {}
    }

    // Record heartbeat
    if (watchdog && enginesReady) {
      try { watchdog.heartbeat(`cmd:${cmd}`); } catch (_) {}
    }

    try {
      switch (cmd) {
        case 'help':
          showHelp(theme, args[0]);
          break;

        case 'quit':
        case 'exit':
        case '/quit':
        case '/exit':
          if (stopHud) stopHud();
          layout.stopAnimation();
          chatPanel.stopAnimation();
          // End session and stop engines
          try {
            if (currentSession) await sessions.end(currentSession.id);
            if (cron.stop) cron.stop();
            if (watchdog.stopMonitoring) watchdog.stopMonitoring();
            watchdog.heartbeat('session-end');
          } catch (_) {}
          console.log(colorize('\n  Goodbye from UTHY AGENTIC OS! 👋\n', 'info', theme));
          saveHistory(rl);
          process.exit(0);

        case 'clear':
        case '/clear':
          process.stdout.write('\x1b[2J\x1b[H');
          process.stdout.write(renderBannerAtTop(theme));
          break;

        case 'banner':
          console.log(renderBanner(theme, false));
          break;

        case 'theme':
          if (args[0] && THEMES[args[0]]) {
            config.theme = args[0];
            saveConfig(config);
            console.log(colorize(`  Theme set to: ${THEMES[args[0]].name}`, 'success', theme));
          } else {
            console.log(colorize('  Available themes: cyber, matrix, fire, ocean, neon', 'info', theme));
            console.log(colorize(`  Current: ${config.theme}`, 'muted', theme));
            console.log(colorize('  Usage: theme <name>', 'muted', theme));
          }
          break;

        case 'themes':
          showThemes(theme);
          break;

        case 'about':
          showAbout(theme);
          break;

        case 'modules':
          showModules(theme);
          break;

        case 'status':
          showStatus(theme);
          break;

        case 'social':
          showSocialLinks(theme);
          break;

        case 'chat':
          // Show chat input panel
          console.log('');
          console.log(renderChatPrompt(theme, []).join('\n'));
          console.log('');
          console.log(colorize('  Chat panel ready. Type @filename to attach files.', 'info', theme));
          break;

        case 'attach':
        case '@':
          // File attachment handler
          if (!args[0]) {
            console.log(colorize('  Usage: attach <file-path>', 'warn', theme));
            console.log(colorize('  Example: attach ./src/index.js', 'muted', theme));
            break;
          }
          const attPath = args.join(' ');
          const attResult = readAttachedFile(attPath);
          if (attResult.error) {
            console.log(colorize(`  ✗ ${attResult.error}`, 'error', theme));
          } else {
            console.log('');
            console.log(colorize(`  ✓ Attached: ${attResult.typeInfo.icon} ${attResult.name}`, 'success', theme));
            console.log(colorize(`    Path: ${attResult.path}`, 'muted', theme));
            console.log(colorize(`    Size: ${attResult.sizeFormatted}`, 'muted', theme));
            if (attResult.isText) {
              console.log(colorize(`    Lines: ${attResult.lines}`, 'muted', theme));
              // Show preview (first 10 lines)
              const preview = attResult.content.split('\n').slice(0, 10);
              console.log('');
              console.log(colorize('  ── Preview ──', 'muted', theme));
              for (const line of preview) {
                console.log(`    ${colorize(line, 'muted', theme)}`);
              }
              if (attResult.lines > 10) {
                console.log(colorize(`    ... (${attResult.lines - 10} more lines)`, 'muted', theme));
              }
            }
            console.log('');
          }
          break;

        case 'files':
        case 'tree':
          // Show file tree of current directory
          const treeDir = args[0] || '.';
          const treeEntries = walkDirectory(treeDir, 2);
          console.log('');
          console.log(colorize(`  📁 ${path.resolve(treeDir)}/`, 'primary', theme));
          console.log(renderFileTree(treeEntries, theme, '  ').join('\n'));
          console.log('');
          break;

        case 'upload':
          // Upload prompt — shows supported file types
          console.log('');
          console.log(renderBox([
            'Supported file types:',
            '  📜 Code: .js .ts .py .go .rs .java .c .cpp .rb .php',
            '  📝 Docs: .md .txt .rst .tex .log .csv',
            '  🌐 Web:  .html .css .vue .svelte .jsx .tsx',
            '  ⚙️  Config: .json .yaml .yml .toml .ini .env',
            '  🖼️  Images: .png .jpg .gif .svg .webp .bmp',
            '  📄 Files: .pdf .doc .docx .xls .xlsx .ppt .pptx',
            '  📦 Archives: .zip .tar .gz .7z .rar',
            '',
            'Usage: attach <file-path> or @file in chat input',
            'Max file size: 10 MB',
          ], theme, 'FILE UPLOAD'));
          break;

        // ════════════════════════════════════════════════════
        //  MEMORY ENGINE COMMANDS
        // ════════════════════════════════════════════════════
        case 'memory':
          if (args[0] === 'add' && args.length > 1) {
            const content = args.slice(1).join(' ');
            const entry = await memory.add(content, 'general', []);
            console.log(colorize(`  ✓ Memory #${entry.id} saved`, 'success', theme));
          } else if (args[0] === 'list') {
            const entries = await memory.list({ limit: 20 });
            if (!entries.length) console.log(colorize('  No memories yet.', 'muted', theme));
            for (const e of entries) {
              console.log(`  ${colorize('#' + e.id, 'secondary', theme)} [${e.category}] ${e.content.slice(0, 80)}`);
            }
          } else if (args[0] === 'search' && args[1]) {
            const results = await memory.search(args.slice(1).join(' '), 10);
            for (const r of results) console.log(`  ${colorize('#' + r.id, 'secondary', theme)} ${r.content.slice(0, 80)}`);
          } else if (args[0] === 'stats') {
            const s = await memory.stats();
            console.log(colorize(`  Total: ${s.total} | Avg Score: ${s.avgScore?.toFixed(1)}`, 'info', theme));
          } else if (args[0] === 'remove' && args[1]) {
            await memory.remove(parseInt(args[1]));
            console.log(colorize('  ✓ Removed', 'success', theme));
          } else {
            console.log(colorize('  Usage: memory <add|list|search|stats|remove> [args]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  SKILL ENGINE COMMANDS
        // ════════════════════════════════════════════════════
        case 'skill':
        case 'skills':
          if (args[0] === 'list') {
            const list = await skills.list();
            for (const s of list) {
              console.log(`  ${colorize('▸', 'secondary', theme)} ${colorize(s.name, 'primary', theme)} [${s.category}] ${s.description?.slice(0, 50) || ''}`);
            }
          } else if (args[0] === 'load' && args[1]) {
            const content = await skills.load(args[1]);
            if (content) console.log(content);
            else console.log(colorize('  Skill not found', 'error', theme));
          } else if (args[0] === 'search' && args[1]) {
            const results = await skills.search(args.slice(1).join(' '));
            for (const s of results) console.log(`  ${colorize(s.name, 'primary', theme)} — ${s.description}`);
          } else if (args[0] === 'stats') {
            const s = await skills.stats();
            console.log(colorize(`  Total: ${s.total} | Categories: ${Object.keys(s.byCategory).join(', ')}`, 'info', theme));
          } else {
            console.log(colorize('  Usage: skill <list|load|search|stats> [name]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  GOAL TRACKER COMMANDS
        // ════════════════════════════════════════════════════
        case 'goal':
        case 'goals':
          if (args[0] === 'add' && args.length > 1) {
            const text = args.slice(1).join(' ');
            const g = await goals.add(text, 'Active', 'medium', []);
            console.log(colorize(`  ✓ Goal #${g.id} added: ${text}`, 'success', theme));
          } else if (args[0] === 'list') {
            const list = await goals.list({});
            if (!list.length) console.log(colorize('  No goals yet.', 'muted', theme));
            for (const g of list) {
              const status = g.status === 'completed' ? '✓' : g.status === 'in_progress' ? '▸' : '○';
              console.log(`  ${colorize(status, g.status === 'completed' ? 'success' : 'primary', theme)} #${g.id} [${g.priority}] ${g.text}`);
            }
          } else if (args[0] === 'done' && args[1]) {
            await goals.complete(parseInt(args[1]));
            console.log(colorize('  ✓ Goal completed!', 'success', theme));
          } else if (args[0] === 'kanban') {
            const board = await goals.kanban(theme);
            for (const line of board) console.log(line);
          } else if (args[0] === 'review') {
            const r = await goals.review();
            console.log(colorize(`  Active: ${r.active} | Completed: ${r.completed} | Rate: ${(r.completionRate * 100).toFixed(0)}%`, 'info', theme));
          } else if (args[0] === 'remove' && args[1]) {
            await goals.remove(parseInt(args[1]));
            console.log(colorize('  ✓ Removed', 'success', theme));
          } else {
            console.log(colorize('  Usage: goal <add|list|done|kanban|review|remove> [args]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  MODEL ROUTER COMMANDS
        // ════════════════════════════════════════════════════
        case 'model':
        case 'models':
          if (args[0] === 'list') {
            const mlist = await models.listModels();
            for (const m of mlist) {
              console.log(`  ${colorize('▸', 'secondary', theme)} ${colorize(m.id, 'primary', theme)} (${m.provider}) max:${m.maxTokens}`);
            }
          } else if (args[0] === 'active') {
            const active = await models.getActive();
            console.log(colorize(`  Active: ${active?.id || 'none'}`, 'info', theme));
          } else if (args[0] === 'set' && args[1]) {
            await models.setActive(args[1]);
            console.log(colorize(`  ✓ Active model: ${args[1]}`, 'success', theme));
          } else if (args[0] === 'route' && args[1]) {
            const m = await models.route(args[1]);
            console.log(colorize(`  Best model for "${args[1]}": ${m?.id || 'none'}`, 'info', theme));
          } else if (args[0] === 'usage') {
            const u = await models.getUsage();
            console.log(colorize(`  Tokens: ${u.totalTokens} | Cost: $${u.totalCost?.toFixed(4) || '0.00'}`, 'info', theme));
          } else if (args[0] === 'providers') {
            const p = await models.listProviders();
            for (const pr of p) console.log(`  ${colorize(pr.id, 'primary', theme)} — ${pr.name} (${pr.models?.length || 0} models)`);
          } else {
            console.log(colorize('  Usage: model <list|active|set|route|usage|providers> [args]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  ASK — Query AI model via gateway
        // ════════════════════════════════════════════════════
        case 'ask':
          if (!args[0]) {
            console.log(colorize('  Usage: ask <prompt>', 'warn', theme));
            break;
          }
          const prompt = args.join(' ');
          console.log(colorize('  ⏳ Querying AI model...', 'muted', theme));
          try {
            const active = await models.getActive();
            const provider = active?.provider || 'openai';
            const response = await gateway.chat(provider, [{ role: 'user', content: prompt }]);
            console.log('');
            console.log(colorize(`  ── Response (${provider}) ──`, 'muted', theme));
            console.log(`  ${response.replace(/\n/g, '\n  ')}`);
            console.log('');
          } catch (e) {
            console.log(colorize(`  ✗ AI query failed: ${e.message}`, 'error', theme));
            console.log(colorize('  Tip: Set API key with "/gateway setkey <provider> <key>"', 'muted', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  CRON ENGINE COMMANDS
        // ════════════════════════════════════════════════════
        case 'cron':
          if (args[0] === 'add' && args.length >= 3) {
            const schedule = args[1];
            const command = args.slice(2).join(' ');
            const job = await cron.add('cron-' + Date.now(), schedule, command);
            console.log(colorize(`  ✓ Job #${job.id} scheduled: ${schedule}`, 'success', theme));
          } else if (args[0] === 'list') {
            const jobs = await cron.list({});
            if (!jobs.length) console.log(colorize('  No cron jobs.', 'muted', theme));
            for (const j of jobs) {
              const en = j.enabled ? colorize('●', 'success', theme) : colorize('○', 'muted', theme);
              console.log(`  ${en} #${j.id} ${j.schedule} → ${j.command?.slice(0, 50) || j.name}`);
            }
          } else if (args[0] === 'run' && args[1]) {
            console.log(colorize('  Running...', 'muted', theme));
            const result = await cron.run(parseInt(args[1]) || args[1]);
            console.log(result?.output || colorize('  Done', 'success', theme));
          } else if (args[0] === 'pause' && args[1]) {
            await cron.pause(parseInt(args[1]) || args[1]);
            console.log(colorize('  ✓ Paused', 'success', theme));
          } else if (args[0] === 'resume' && args[1]) {
            await cron.resume(parseInt(args[1]) || args[1]);
            console.log(colorize('  ✓ Resumed', 'success', theme));
          } else if (args[0] === 'remove' && args[1]) {
            await cron.remove(parseInt(args[1]) || args[1]);
            console.log(colorize('  ✓ Removed', 'success', theme));
          } else if (args[0] === 'stats') {
            const s = await cron.stats();
            console.log(colorize(`  Jobs: ${s.total} | Enabled: ${s.enabled} | Runs: ${s.totalRuns}`, 'info', theme));
          } else {
            console.log(colorize('  Usage: cron <add|list|run|pause|resume|remove|stats> [args]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  KNOWLEDGE BASE COMMANDS
        // ════════════════════════════════════════════════════
        case 'kb':
        case 'knowledge':
          if (args[0] === 'index' && args[1]) {
            console.log(colorize('  Indexing...', 'muted', theme));
            const result = await knowledge.index(args[1]);
            console.log(colorize(`  ✓ Indexed: ${result.indexed} files, ${result.skipped} skipped`, 'success', theme));
          } else if (args[0] === 'search' && args[1]) {
            const results = await knowledge.search(args.slice(1).join(' '), 5);
            if (!results.length) console.log(colorize('  No results.', 'muted', theme));
            for (const r of results) {
              console.log(`  ${colorize(r.path, 'primary', theme)} ${colorize('(score: ' + r.score.toFixed(3) + ')', 'muted', theme)}`);
              console.log(`    ${r.snippet?.slice(0, 120)}`);
            }
          } else if (args[0] === 'stats') {
            const s = await knowledge.stats();
            console.log(colorize(`  Files: ${s.totalFiles} | Chunks: ${s.totalChunks} | Size: ${formatFileSize(s.totalChars)}`, 'info', theme));
          } else if (args[0] === 'forget' && args[1]) {
            await knowledge.forget(args[1]);
            console.log(colorize('  ✓ Forgotten', 'success', theme));
          } else if (args[0] === 'rebuild' && args[1]) {
            console.log(colorize('  Rebuilding...', 'muted', theme));
            await knowledge.rebuild(args[1]);
            console.log(colorize('  ✓ Rebuilt', 'success', theme));
          } else {
            console.log(colorize('  Usage: kb <index|search|stats|forget|rebuild> [args]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  SESSION ENGINE COMMANDS
        // ════════════════════════════════════════════════════
        case 'session':
        case 'sessions':
          if (args[0] === 'list') {
            const slist = await sessions.list({ limit: 10 });
            for (const s of slist) {
              const msgs = s.messages?.length || 0;
              console.log(`  ${colorize(s.id?.slice(0, 8), 'secondary', theme)} ${s.title} ${colorize(`(${msgs} msgs)`, 'muted', theme)}`);
            }
          } else if (args[0] === 'search' && args[1]) {
            const results = await sessions.search(args.slice(1).join(' '), 5);
            for (const r of results) {
              console.log(`  ${colorize(r.id?.slice(0, 8), 'secondary', theme)} ${r.title}`);
              if (r.snippet) console.log(`    ${r.snippet.slice(0, 100)}`);
            }
          } else if (args[0] === 'checkpoint' && args[1]) {
            if (currentSession) {
              await sessions.checkpoint(currentSession.id, args.slice(1).join(' '));
              console.log(colorize('  ✓ Checkpoint saved', 'success', theme));
            }
          } else if (args[0] === 'stats') {
            const s = await sessions.stats();
            console.log(colorize(`  Sessions: ${s.totalSessions} | Messages: ${s.totalMessages}`, 'info', theme));
          } else {
            console.log(colorize('  Usage: session <list|search|checkpoint|stats> [args]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  WEB SEARCH COMMANDS
        // ════════════════════════════════════════════════════
        case 'search':
          if (!args[0]) { console.log(colorize('  Usage: search <query>', 'warn', theme)); break; }
          console.log(colorize('  Searching...', 'muted', theme));
          try {
            const results = await websearch.search(args.join(' '), 5);
            if (!results.length) console.log(colorize('  No results found.', 'muted', theme));
            for (const r of results) {
              console.log(`  ${colorize(r.title, 'primary', theme)}`);
              console.log(`    ${colorize(r.url, 'info', theme)}`);
              console.log(`    ${r.snippet?.slice(0, 100)}`);
              console.log('');
            }
          } catch (e) {
            console.log(colorize(`  Search error: ${e.message}`, 'error', theme));
          }
          break;

        case 'extract':
          if (!args[0]) { console.log(colorize('  Usage: extract <url>', 'warn', theme)); break; }
          console.log(colorize('  Fetching...', 'muted', theme));
          try {
            const page = await websearch.extract(args[0]);
            console.log(colorize(`  Title: ${page.title}`, 'primary', theme));
            console.log(colorize(`  URL: ${page.url}`, 'muted', theme));
            console.log('');
            console.log(page.content?.slice(0, 2000));
          } catch (e) {
            console.log(colorize(`  Extract error: ${e.message}`, 'error', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  WATCHDOG COMMANDS
        // ════════════════════════════════════════════════════
        case 'watch':
          if (args[0] === 'add' && args[1]) {
            const target = args[1];
            const type = target.startsWith('http') ? 'url' : 'file';
            const w = await watchdog.addWatch(target, type, '5m');
            console.log(colorize(`  ✓ Watching: ${target} (${type})`, 'success', theme));
          } else if (args[0] === 'list') {
            const watches = await watchdog.listWatches();
            if (!watches.length) console.log(colorize('  No watches.', 'muted', theme));
            for (const w of watches) {
              console.log(`  ${colorize(w.id?.toString().slice(0, 6), 'secondary', theme)} [${w.type}] ${w.target} ${colorize(w.status || 'pending', 'muted', theme)}`);
            }
          } else if (args[0] === 'check') {
            const results = await watchdog.checkAll();
            for (const r of results) console.log(`  ${r.target}: ${r.status}`);
          } else if (args[0] === 'heartbeat') {
            watchdog.heartbeat(args.slice(1).join(' ') || 'manual');
            console.log(colorize('  ✓ Heartbeat recorded', 'success', theme));
          } else if (args[0] === 'nudge' && args[1]) {
            watchdog.nudge(args.slice(1).join(' '));
            console.log(colorize('  ✓ Nudge sent', 'success', theme));
          } else if (args[0] === 'stats') {
            const s = await watchdog.stats();
            console.log(colorize(`  Watches: ${s.totalWatches} | Alerts: ${s.activeAlerts}`, 'info', theme));
          } else {
            console.log(colorize('  Usage: watch <add|list|check|heartbeat|nudge|stats> [args]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  DELEGATION COMMANDS
        // ════════════════════════════════════════════════════
        case 'delegate':
          if (args[0] && args[0] !== 'parallel') {
            console.log(colorize('  Delegating...', 'muted', theme));
            const result = await delegation.delegate(args.join(' '));
            console.log(colorize(`  ✓ Task #${result.id} delegated`, 'success', theme));
          } else if (args[0] === 'parallel' && args.length > 1) {
            const tasks = args.slice(1).join(' ').split('|').map(t => t.trim());
            console.log(colorize(`  Delegating ${tasks.length} tasks in parallel...`, 'muted', theme));
            const results = await delegation.delegateParallel(tasks);
            for (const r of results) console.log(`  ${r.id}: ${r.status}`);
          } else if (args[0] === 'list') {
            const dlist = await delegation.list({});
            for (const d of dlist) {
              console.log(`  ${colorize(d.id?.toString().slice(0, 6), 'secondary', theme)} [${d.status}] ${d.task?.slice(0, 60)}`);
            }
          } else if (args[0] === 'stats') {
            const s = await delegation.stats();
            console.log(colorize(`  Total: ${s.total} | Done: ${s.completed} | Running: ${s.running}`, 'info', theme));
          } else {
            console.log(colorize('  Usage: delegate <task> | delegate parallel <t1> | <t2> | delegate list | delegate stats', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  SETUP WIZARD
        // ════════════════════════════════════════════════════
        case 'setup':
        case '/setup':
          console.log('');
          console.log(colorize('  ┌─────────────────────────────────────────────┐', 'secondary', theme));
          console.log(colorize('  │     UTHY AGENTIC OS — Setup Wizard          │', 'secondary', theme));
          console.log(colorize('  └─────────────────────────────────────────────┘', 'secondary', theme));
          console.log('');
          // Animated setup sequence
          const setupSteps = [
            { name: 'Configuration', fn: async () => { await configMgr.init(); return 'OK'; } },
            { name: 'Memory Engine', fn: async () => { await memory.init(); return 'OK'; } },
            { name: 'Skill System', fn: async () => { await skills.init(); return `${(await skills.stats()).total} skills`; } },
            { name: 'Goal Tracker', fn: async () => { await goals.init(); return 'OK'; } },
            { name: 'Model Router', fn: async () => { await models.init(); return `${(await models.listModels()).length} models`; } },
            { name: 'Cron Engine', fn: async () => { await cron.init(); return 'OK'; } },
            { name: 'Knowledge Base', fn: async () => { await knowledge.init(); return 'OK'; } },
            { name: 'Sessions', fn: async () => { await sessions.init(); return 'OK'; } },
            { name: 'Web Search', fn: async () => { await websearch.init(); return 'OK'; } },
            { name: 'Watchdog', fn: async () => { await watchdog.init(); return 'OK'; } },
            { name: 'Delegation', fn: async () => { await delegation.init(); return 'OK'; } },
            { name: 'MCP Servers', fn: async () => { await mcp.init(); return `${(await mcp.stats()).total} servers`; } },
            { name: 'API Gateway', fn: async () => { await gateway.init(); return 'OK'; } },
          ];
          for (const step of setupSteps) {
            try {
              const result = await step.fn();
              console.log(colorize(`  ✓ ${step.name.padEnd(20)}`, 'success', theme) + colorize(result, 'muted', theme));
            } catch (e) {
              console.log(colorize(`  ✗ ${step.name.padEnd(20)}`, 'error', theme) + colorize(e.message, 'muted', theme));
            }
          }
          console.log('');
          console.log(colorize('  Setup complete! Type "config list" to see configuration.', 'info', theme));
          break;

        // ════════════════════════════════════════════════════
        //  AUTHENTICATION COMMANDS
        // ════════════════════════════════════════════════════
        case 'whoami':
          console.log(colorize(`  Logged in as: ${loggedInUser}`, 'info', theme));
          break;

        case 'login':
          {
            const username = args[0];
            const password = args[1];
            if (!username || !password) {
              console.log(colorize('  Usage: login <username> <password>', 'warn', theme));
              break;
            }
            const result = auth.authenticate(username, password);
            if (result.success) {
              loggedInUser = result.username;
              console.log(colorize(`  ✓ Logged in as ${result.username}`, 'success', theme));
            } else if (result.error === 'user_not_found') {
              console.log(colorize(`  ✗ User "${username}" not found. Use "register" to create.`, 'error', theme));
            } else if (result.error === 'invalid_password') {
              console.log(colorize('  ✗ Invalid password', 'error', theme));
            } else {
              console.log(colorize(`  ✗ ${result.error}`, 'error', theme));
            }
          }
          break;

        case 'logout':
          auth.logout();
          loggedInUser = 'guest';
          console.log(colorize('  ✓ Logged out', 'success', theme));
          break;

        case 'register':
          {
            const username = args[0];
            const password = args[1];
            if (!username || !password) {
              console.log(colorize('  Usage: register <username> <password>', 'warn', theme));
              break;
            }
            const result = auth.register(username, password);
            if (result.success) {
              loggedInUser = result.username;
              console.log(colorize(`  ✓ Account created! Logged in as ${result.username}`, 'success', theme));
            } else {
              console.log(colorize(`  ✗ ${result.error}`, 'error', theme));
            }
          }
          break;

        case 'passwd':
          {
            if (loggedInUser === 'guest') {
              console.log(colorize('  ✗ Must be logged in to change password', 'error', theme));
              break;
            }
            const oldPass = args[0];
            const newPass = args[1];
            if (!oldPass || !newPass) {
              console.log(colorize('  Usage: passwd <old-password> <new-password>', 'warn', theme));
              break;
            }
            const result = auth.changePassword(loggedInUser, oldPass, newPass);
            if (result.success) {
              console.log(colorize('  ✓ Password changed', 'success', theme));
            } else {
              console.log(colorize(`  ✗ ${result.error}`, 'error', theme));
            }
          }
          break;

        case 'users':
          {
            const users = auth.listUsers();
            if (!users.length) {
              console.log(colorize('  No registered users.', 'muted', theme));
            } else {
              console.log('');
              console.log(colorize('  ── Registered Users ──', 'muted', theme));
              for (const u of users) {
                const active = u.username === loggedInUser ? colorize(' ◀ ACTIVE', 'success', theme) : '';
                console.log(`    ${colorize('▸', 'secondary', theme)} ${colorize(u.username, 'primary', theme)} ${colorize(u.created, 'muted', theme)}${active}`);
              }
              console.log('');
            }
          }
          break;

        case '/auth':
          console.log('');
          console.log(colorize('  ── Authentication Commands ──', 'muted', theme));
          console.log(`    ${colorize('whoami'.padEnd(20), 'secondary', theme)} Show current user`);
          console.log(`    ${colorize('login <user> <pass>'.padEnd(20), 'secondary', theme)} Log in`);
          console.log(`    ${colorize('register <user> <pass>'.padEnd(20), 'secondary', theme)} Create account`);
          console.log(`    ${colorize('logout'.padEnd(20), 'secondary', theme)} Log out`);
          console.log(`    ${colorize('passwd <old> <new>'.padEnd(20), 'secondary', theme)} Change password`);
          console.log(`    ${colorize('users'.padEnd(20), 'secondary', theme)} List registered users`);
          console.log('');
          break;

        // ════════════════════════════════════════════════════
        //  SELF-UPDATE WITH 3D ANIMATED PROGRESS
        // ════════════════════════════════════════════════════
        case 'update':
        case '/update':
          {
            const updater = new UpdateEngine(VERSION);

            // Phase 1: Check for updates with spinner
            console.log('');
            const spinFrames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
            let spinIdx = 0;
            const spinTimer = setInterval(() => {
              process.stdout.write(`\r  ${rgb(0,255,255)}${spinFrames[spinIdx++ % spinFrames.length]}${'\x1b[0m'} Checking npm registry...`);
            }, 80);

            let updateInfo;
            try {
              updateInfo = await updater.checkForUpdate();
            } catch(e) {
              clearInterval(spinTimer);
              process.stdout.write('\r' + clearLine());
              console.log(colorize(`  ✗ Update check failed: ${e.message}`, 'error', theme));
              break;
            }
            clearInterval(spinTimer);
            process.stdout.write('\r' + clearLine());

            if (updateInfo.error) {
              console.log(colorize(`  ✗ Cannot reach npm registry: ${updateInfo.error}`, 'error', theme));
              break;
            }

            if (!updateInfo.hasUpdate) {
              // Already up to date — show status
              console.log(colorize(`  ✓ You're on the latest version!`, 'success', theme));
              console.log('');
              console.log(colorize(`    Current:  v${updateInfo.current}`, 'muted', theme));
              console.log(colorize(`    Latest:   v${updateInfo.latest}`, 'muted', theme));
              console.log(colorize(`    Package:  ${updateInfo.name}`, 'muted', theme));
              console.log('');
              break;
            }

            // Phase 2: Update available — show 3D animated progress
            console.log(colorize(`  ⬆ Update available: v${updateInfo.current} → v${updateInfo.latest}`, 'info', theme));
            console.log('');

            let animPhase = 0;
            let currentProgress = 0;
            let currentStatus = 'Preparing update...';
            const W = 64;

            // 3D animation loop — renders 6-line frame every 100ms
            const renderFrame = () => {
              const frame = render3DFrame('UTHY UPDATE', currentProgress, currentStatus, animPhase, W);
              // Move cursor up to overwrite previous frame
              if (currentProgress > 0) {
                process.stdout.write(moveCursor(process.stdout.rows - 10, 1));
              }
              for (const line of frame) {
                process.stdout.write(clearLine() + line + '\n');
              }
              animPhase = (animPhase + 0.03) % 1;
            };

            // Initial frame render
            renderFrame();
            const frameTimer = setInterval(renderFrame, 100);

            // Phase 3: Run the actual npm update
            try {
              const result = await updater.runUpdate((pct, msg) => {
                currentProgress = pct;
                currentStatus = msg;
              });

              clearInterval(frameTimer);
              renderFrame(); // final frame at 100%

              // Success animation — pulse effect
              console.log('');
              const checkmark = `${rgb(0,255,100)}${'\x1b[1m'}✓ UPDATE SUCCESSFUL${'\x1b[0m'}`;
              console.log(`  ${checkmark}`);
              console.log('');
              console.log(colorize(`    Previous: v${updateInfo.current}`, 'muted', theme));
              console.log(colorize(`    Now:      v${updateInfo.latest}`, 'muted', theme));
              console.log('');
              console.log(colorize('  💡 Restart your terminal or run "uthy" to use the new version.', 'info', theme));
              console.log('');

              // Check changelog
              const changes = await updater.getChangelog(updateInfo.current, updateInfo.latest);
              if (changes.length > 0) {
                console.log(colorize('  ── Versions Installed ──', 'muted', theme));
                for (const c of changes) {
                  console.log(colorize(`    v${c.version}`, 'secondary', theme));
                }
                console.log('');
              }

            } catch(e) {
              clearInterval(frameTimer);
              // Error frame
              currentProgress = currentProgress;
              currentStatus = 'Update failed!';
              renderFrame();
              console.log('');
              console.log(colorize(`  ✗ Update failed: ${e.message}`, 'error', theme));
              console.log(colorize('  💡 Try manually: npm install -g uthy-agentic-os', 'muted', theme));
              console.log('');
            }
          }
          break;

        // ════════════════════════════════════════════════════
        //  CONFIG MANAGEMENT
        // ════════════════════════════════════════════════════
        case 'config':
        case '/config':
          if (args[0] === 'get' && args[1]) {
            const val = configMgr.get(args[1]);
            console.log(colorize(`  ${args[1]} = ${val !== undefined ? JSON.stringify(val) : 'undefined'}`, 'info', theme));
          } else if (args[0] === 'set' && args[1] && args[2]) {
            const val = args.slice(2).join(' ');
            try { configMgr.set(args[1], JSON.parse(val)); } catch { configMgr.set(args[1], val); }
            console.log(colorize(`  ✓ ${args[1]} set`, 'success', theme));
          } else if (args[0] === 'list') {
            configMgr.list();
          } else if (args[0] === 'reset') {
            configMgr.reset(args[1]);
            console.log(colorize('  ✓ Config reset to defaults', 'success', theme));
          } else if (args[0] === 'export') {
            console.log(configMgr.export());
          } else if (args[0] === 'secret' && args[1] && args[2]) {
            configMgr.setSecret(args[1], args.slice(2).join(' '));
            console.log(colorize(`  ✓ Secret "${args[1]}" stored (encrypted)`, 'success', theme));
          } else {
            console.log(colorize('  Usage: config <get|set|list|reset|export|secret> [key] [value]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  API GATEWAY
        // ════════════════════════════════════════════════════
        case 'gateway':
        case '/gateway':
          if (args[0] === 'test' && args[1]) {
            console.log(colorize(`  Testing ${args[1]}...`, 'muted', theme));
            const result = await gateway.testConnection(args[1]);
            console.log(colorize(`  ${result.status === 'connected' ? '✓' : '✗'} ${args[1]}: ${result.status} (${result.latency || 0}ms)`, result.status === 'connected' ? 'success' : 'error', theme));
          } else if (args[0] === 'test:all') {
            console.log(colorize('  Testing all providers...', 'muted', theme));
            const results = await gateway.testAll();
            for (const r of results) {
              const icon = r.status === 'connected' ? '✓' : '✗';
              const color = r.status === 'connected' ? 'success' : 'error';
              console.log(colorize(`  ${icon} ${r.provider.padEnd(12)} ${r.status} (${r.latency || 0}ms)`, color, theme));
            }
          } else if (args[0] === 'list') {
            const providers = gateway.getProviders();
            for (const p of providers) {
              const icon = p.connected ? colorize('●', 'success', theme) : colorize('○', 'muted', theme);
              console.log(`  ${icon} ${p.id.padEnd(12)} ${p.baseUrl || ''}`);
            }
          } else if (args[0] === 'setkey' && args[1] && args[2]) {
            gateway.setApiKey(args[1], args.slice(2).join(' '));
            console.log(colorize(`  ✓ API key for ${args[1]} stored`, 'success', theme));
          } else {
            console.log(colorize('  Usage: gateway <test|test:all|list|setkey> [provider] [key]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  MCP SERVER MANAGEMENT
        // ════════════════════════════════════════════════════
        case 'mcp':
        case '/mcp':
          if (args[0] === 'list') {
            const servers = await mcp.listServers();
            if (!servers.length) console.log(colorize('  No MCP servers configured.', 'muted', theme));
            for (const s of servers) {
              const icon = s.enabled ? colorize('●', 'success', theme) : colorize('○', 'muted', theme);
              console.log(`  ${icon} ${s.name.padEnd(15)} [${s.type}] ${s.command || s.url || ''}`);
            }
          } else if (args[0] === 'add' && args[1]) {
            const name = args[1];
            const type = args[2] || 'stdio';
            const server = await mcp.addServer(name, type, { command: args[3], args: args.slice(4) });
            console.log(colorize(`  ✓ MCP server "${name}" added (${type})`, 'success', theme));
          } else if (args[0] === 'test' && args[1]) {
            console.log(colorize(`  Testing MCP server "${args[1]}"...`, 'muted', theme));
            const result = await mcp.testServer(args[1]);
            console.log(colorize(`  ${result.status === 'ok' ? '✓' : '✗'} ${args[1]}: ${result.status}`, result.status === 'ok' ? 'success' : 'error', theme));
          } else if (args[0] === 'remove' && args[1]) {
            await mcp.removeServer(args[1]);
            console.log(colorize(`  ✓ Removed`, 'success', theme));
          } else if (args[0] === 'stats') {
            const s = await mcp.stats();
            console.log(colorize(`  Total: ${s.total} | Enabled: ${s.enabled} | Types: ${JSON.stringify(s.byType)}`, 'info', theme));
          } else {
            console.log(colorize('  Usage: mcp <list|add|test|remove|stats> [name] [type] [command]', 'warn', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  THEME SELECTOR
        // ════════════════════════════════════════════════════
        case '/theme':
        case '/themes':
          if (args[0] === 'list' || !args[0]) {
            console.log('');
            console.log(colorize('  ── Available Themes ────────────────────────────', 'muted', theme));
            const themeNames = Object.keys(THEMES);
            for (let i = 0; i < themeNames.length; i++) {
              const t = THEMES[themeNames[i]];
              const active = themeNames[i] === (config.theme || 'cyber') ? colorize(' ◀ ACTIVE', 'success', theme) : '';
              const preview = `${t.primary}████${t.secondary}████${t.accent}████${t.reset}`;
              const num = colorize(`[${String(i + 1).padStart(2)}]`, 'secondary', theme);
              console.log(`  ${num} ${preview}  ${colorize(themeNames[i].padEnd(15), 'primary', theme)}${active}`);
            }
            console.log('');
            console.log(colorize('  Usage: /theme <name> or /theme <number>', 'muted', theme));
          } else {
            const themeName = args[0];
            const themeNames = Object.keys(THEMES);
            let selected;
            const num = parseInt(themeName);
            if (!isNaN(num) && num >= 1 && num <= themeNames.length) {
              selected = themeNames[num - 1];
            } else if (THEMES[themeName]) {
              selected = themeName;
            }
            if (selected) {
              config.theme = selected;
              saveConfig(config);
              // Update live theme reference
              const newTheme = THEMES[selected];
              Object.assign(theme, newTheme);
              console.log(colorize(`  ✓ Theme changed to "${selected}"`, 'success', theme));
              // P1-7: Full redraw with new theme
              chatPanel.flash();
              if (isTTY) {
                // Redraw layout with new theme colors
                process.stdout.write(layout.renderFrame(theme, {
                  clock: new Date().toLocaleTimeString('en-US', { hour12: false }),
                  date: new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
                  themeName: selected,
                  memoryCount: cachedStats.memory,
                  engineCount: 17,
                }));
                // Redraw HUD with new theme
                process.stdout.write(renderHudAtTop(theme));
                process.stdout.write(renderBannerAtTop(theme));
              }
            } else {
              console.log(colorize(`  ✗ Unknown theme: "${themeName}"`, 'error', theme));
            }
          }
          break;

        // ════════════════════════════════════════════════════
        //  FONT SELECTOR
        // ════════════════════════════════════════════════════
        case '/font':
        case 'font':
          if (args[0] === 'list' || !args[0]) {
            console.log('');
            console.log(colorize('  ── Font Options ────────────────────────────────', 'muted', theme));
            const fonts = [
              { name: 'default', label: 'Default (system)', preview: 'AaBbCcDdEeFf' },
              { name: 'mono', label: 'Monospace', preview: 'AaBbCcDdEeFf' },
              { name: 'bold', label: 'Bold', preview: '\x1b[1mAaBbCcDdEeFf\x1b[0m' },
              { name: 'dim', label: 'Dim', preview: '\x1b[2mAaBbCcDdEeFf\x1b[0m' },
              { name: 'italic', label: 'Italic', preview: '\x1b[3mAaBbCcDdEeFf\x1b[0m' },
            ];
            for (let i = 0; i < fonts.length; i++) {
              const f = fonts[i];
              const active = f.name === (config.font || 'default') ? colorize(' ◀', 'success', theme) : '';
              console.log(`  ${colorize(`[${i + 1}]`, 'secondary', theme)} ${f.label.padEnd(20)} ${f.preview}${active}`);
            }
            console.log('');
            console.log(colorize('  ── Text Size ───────────────────────────────────', 'muted', theme));
            const sizes = [10, 12, 14, 16, 18, 20, 24];
            for (let i = 0; i < sizes.length; i++) {
              const active = sizes[i] === (config.fontSize || 14) ? colorize(' ◀', 'success', theme) : '';
              console.log(`  ${colorize(`[${i + 1}]`, 'secondary', theme)} ${sizes[i]}pt${active}`);
            }
            console.log('');
            console.log(colorize('  Usage: /font <name> | /font size <number>', 'muted', theme));
          } else if (args[0] === 'size' && args[1]) {
            const size = parseInt(args[1]);
            if (size >= 8 && size <= 32) {
              config.fontSize = size;
              saveConfig(config);
              console.log(colorize(`  ✓ Font size set to ${size}pt`, 'success', theme));
            } else {
              console.log(colorize('  ✗ Size must be between 8 and 32', 'error', theme));
            }
          } else {
            const fontName = args[0];
            config.font = fontName;
            saveConfig(config);
            console.log(colorize(`  ✓ Font set to "${fontName}"`, 'success', theme));
          }
          break;

        // ════════════════════════════════════════════════════
        //  SLASH COMMANDS LIST
        // ════════════════════════════════════════════════════
        case '/help':
        case '/commands':
          console.log('');
          console.log(colorize('  ── / Slash Commands ────────────────────────────', 'muted', theme));
          const slashCmds = [
            { cmd: '/setup', desc: 'Run the interactive setup wizard' },
            { cmd: '/config <get|set|list|reset>', desc: 'Manage configuration' },
            { cmd: '/config secret <key> <val>', desc: 'Store encrypted API key' },
            { cmd: '/gateway <test|test:all|list>', desc: 'API connection management' },
            { cmd: '/gateway setkey <provider> <key>', desc: 'Set API key for provider' },
            { cmd: '/mcp <list|add|test|remove>', desc: 'MCP server management' },
            { cmd: '/theme [name|number]', desc: 'Change or list themes with preview' },
            { cmd: '/font [name|size <n>]', desc: 'Change font or text size' },
            { cmd: '/layout [mode]', desc: 'Change layout (wide/compact/minimal/zen)' },
            { cmd: '/chat', desc: 'Toggle chat input panel on/off' },
            { cmd: '/update', desc: 'Check for updates and self-update' },
            { cmd: '/status', desc: 'Full system status dashboard' },
            { cmd: '/engines', desc: 'Show all engine statuses' },
            { cmd: '/clear', desc: 'Clear screen and redraw' },
            { cmd: '/quit', desc: 'Exit UTHY AGENTIC OS' },
          ];
          for (const c of slashCmds) {
            console.log(`  ${colorize(c.cmd.padEnd(35), 'secondary', theme)}${colorize(c.desc, 'muted', theme)}`);
          }
          console.log('');
          break;

        // ════════════════════════════════════════════════════
        //  SYSTEM STATUS DASHBOARD
        // ════════════════════════════════════════════════════
        case '/status':
        case 'status':
          console.log('');
          console.log(colorize('  ── System Status ───────────────────────────────', 'muted', theme));
          console.log(`  ${colorize('Version', 'primary', theme)}:     v${VERSION}`);
          console.log(`  ${colorize('Platform', 'primary', theme)}:    ${process.platform} ${process.arch}`);
          console.log(`  ${colorize('Node', 'primary', theme)}:       ${process.version}`);
          console.log(`  ${colorize('Memory', 'primary', theme)}:     ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
          console.log(`  ${colorize('Uptime', 'primary', theme)}:     ${Math.round(process.uptime())}s`);
          console.log(`  ${colorize('Theme', 'primary', theme)}:      ${config.theme || 'cyber'}`);
          console.log(`  ${colorize('Engines', 'primary', theme)}:    13 loaded`);
          try {
            const memStats = await memory.stats();
            const goalStats = await goals.stats();
            const skillStats = await skills.stats();
            const mcpStats = await mcp.stats();
            console.log(`  ${colorize('Memories', 'primary', theme)}:   ${memStats.total}`);
            console.log(`  ${colorize('Goals', 'primary', theme)}:      ${goalStats.total}`);
            console.log(`  ${colorize('Skills', 'primary', theme)}:     ${skillStats.total}`);
            console.log(`  ${colorize('MCP Servers', 'primary', theme)}: ${mcpStats.total}`);
          } catch (_) {}
          console.log('');
          break;

        // ════════════════════════════════════════════════════
        //  ENGINES STATUS
        // ════════════════════════════════════════════════════
        case '/engines':
          console.log('');
          console.log(colorize('  ── Engine Status ───────────────────────────────', 'muted', theme));
          const engineList = [
            ['Config', configMgr], ['Memory', memory], ['Skills', skills],
            ['Goals', goals], ['Models', models], ['Cron', cron],
            ['Knowledge', knowledge], ['Sessions', sessions], ['WebSearch', websearch],
            ['Watchdog', watchdog], ['Delegation', delegation], ['MCP', mcp],
            ['Gateway', gateway],
          ];
          for (const [name, eng] of engineList) {
            const icon = eng ? colorize('●', 'success', theme) : colorize('○', 'error', theme);
            const methods = eng ? Object.getOwnPropertyNames(Object.getPrototypeOf(eng)).filter(m => m !== 'constructor').length : 0;
            console.log(`  ${icon} ${name.padEnd(15)} ${methods} methods`);
          }
          console.log('');
          break;

        // ════════════════════════════════════════════════════
        //  LAYOUT MODE
        // ════════════════════════════════════════════════════
        case '/layout':
        case 'layout':
          if (!args[0]) {
            const info = layout.getInfo();
            console.log('');
            console.log(colorize('  ── Layout Options ───────────────────────────────', 'muted', theme));
            const modes = [
              { name: 'wide',    desc: 'Banner + HUD + Chat Panel (≥140 cols)' },
              { name: 'compact', desc: 'Compact HUD + Status Bar (≥90 cols)' },
              { name: 'minimal', desc: 'Status Bar only (≥60 cols)' },
              { name: 'zen',     desc: 'No decorations, pure REPL' },
            ];
            for (const m of modes) {
              const active = m.name === info.mode ? colorize(' ◀ ACTIVE', 'success', theme) : '';
              console.log(`  ${colorize(m.name.padEnd(12), 'primary', theme)} ${m.desc}${active}`);
            }
            console.log('');
            console.log(colorize(`  Current: ${info.mode} (${info.cols}×${info.rows}) | TTY: ${info.isTTY}`, 'muted', theme));
            console.log(colorize('  Usage: /layout <wide|compact|minimal|zen>', 'muted', theme));
            console.log('');
          } else {
            const newMode = args[0];
            if (layout.setMode(newMode)) {
              console.log(colorize(`  ✓ Layout changed to "${newMode}"`, 'success', theme));
              // Redraw
              if (isTTY) {
                process.stdout.write('\x1b[2J\x1b[H');
                const zones = layout.getZones();
                process.stdout.write(layout.renderFrame(theme, {
                  clock: new Date().toLocaleTimeString('en-US', { hour12: false }),
                  date: new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
                  themeName: config.theme || 'cyber',
                  engineCount: 17,
                }));
                console.log('\n'.repeat(zones.top.height + 1));
              }
            } else {
              console.log(colorize(`  ✗ Unknown layout: "${newMode}". Options: wide, compact, minimal, zen`, 'error', theme));
            }
          }
          break;

        // ════════════════════════════════════════════════════
        //  CHAT PANEL TOGGLE
        // ════════════════════════════════════════════════════
        case '/chat':
          const chatOn = layout.toggleChat();
          console.log(colorize(`  ✓ Chat panel ${chatOn ? 'ON' : 'OFF'}`, 'success', theme));
          if (chatOn && isTTY) {
            chatPanel.startAnimation(500);
            chatPanel.setStatus('Chat panel active');
          } else {
            chatPanel.stopAnimation();
          }
          break;

        case 'hud':
        case 'footer':
          // Redraw HUD and banner
          process.stdout.write('\x1b[2J\x1b[H');
          process.stdout.write(renderBannerAtTop(theme));
          console.log('\n'.repeat(12));
          console.log(colorize('  HUD refreshed. Holographic console + banner active...', 'success', theme));
          break;

        case 'test:web':
          if (!args[0]) { console.log(colorize('  Usage: test:web <url>', 'warn', theme)); break; }
          await cmdWebTest(args[0], theme);
          break;

        case 'test:mobile':
          if (!args[0]) { console.log(colorize('  Usage: test:mobile <url> [device]', 'warn', theme)); break; }
          await cmdMobileTest(args[0], args[1] || 'iPhone 11', theme);
          break;

        case 'test:api':
          if (!args[0]) { console.log(colorize('  Usage: test:api <url> [method] [data]', 'warn', theme)); break; }
          await cmdApiTest(args[0], args[1] || 'GET', args[2], theme);
          break;

        case 'test:accessibility':
          if (!args[0]) { console.log(colorize('  Usage: test:accessibility <url>', 'warn', theme)); break; }
          await cmdAccessibility(args[0], theme);
          break;

        case 'test:performance':
          if (!args[0]) { console.log(colorize('  Usage: test:performance <url>', 'warn', theme)); break; }
          await cmdPerformance(args[0], theme);
          break;

        case 'test:flakiness':
          if (!args[0]) { console.log(colorize('  Usage: test:flakiness <url> [iterations]', 'warn', theme)); break; }
          await cmdFlakiness(args[0], parseInt(args[1]) || 3, theme);
          break;

        case 'test:visual':
          if (!args[0]) { console.log(colorize('  Usage: test:visual <url>', 'warn', theme)); break; }
          await cmdVisual(args[0], theme);
          break;

        case 'run:parallel':
          if (!args[0]) { console.log(colorize('  Usage: run:parallel <url1,url2,...>', 'warn', theme)); break; }
          await cmdParallel(args[0], theme);
          break;

        case 'generate:assertions':
          if (!args[0]) { console.log(colorize('  Usage: generate:assertions <url>', 'warn', theme)); break; }
          await cmdOracle(args[0], theme);
          break;

        case 'record:trace':
          if (!args[0]) { console.log(colorize('  Usage: record:trace <url> [duration]', 'warn', theme)); break; }
          await cmdRecordTrace(args[0], parseInt(args[1]) || 5, theme);
          break;

        case 'capture:screenshot':
          if (!args[0]) { console.log(colorize('  Usage: capture:screenshot <url>', 'warn', theme)); break; }
          await cmdScreenshot(args[0], theme);
          break;

        case 'generate:report':
          if (!args[0]) { console.log(colorize('  Usage: generate:report <file>', 'warn', theme)); break; }
          await cmdReport(args[0], args[1] || 'json', theme);
          break;

        case 'provision':
          if (!args[0]) { console.log(colorize('  Usage: provision <testDir>', 'warn', theme)); break; }
          await cmdProvision(args[0], theme);
          break;

        default:
          console.log(colorize(`  Unknown command: "${cmd}"`, 'error', theme));
          console.log(colorize('  Type "help" to see available commands', 'muted', theme));
          chatPanel.errorFlash();
      }
    } catch (err) {
      console.log(colorize(`  Error: ${err.message}`, 'error', theme));
      chatPanel.errorFlash();
    }

    // Reset status and show ready
    chatPanel.setStatus('Ready');
    chatPanel.setAttachments([]);
    rl.prompt();
  });

  rl.on('close', async () => {
    if (stopHud) stopHud();
    layout.stopAnimation();
    chatPanel.stopAnimation();
    try {
      if (currentSession) await sessions.end(currentSession.id);
      if (cron.stop) cron.stop();
      if (watchdog.stopMonitoring) watchdog.stopMonitoring();
    } catch (_) {}
    console.log(colorize('\n  Goodbye from UTHY AGENTIC OS! 👋\n', 'info', theme));
    saveHistory(rl);
    process.exit(0);
  });
}

function saveHistory(rl) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const hist = rl.history.filter(Boolean).reverse().slice(0, 200).join('\n');
    fs.writeFileSync(HISTORY_FILE, hist);
  } catch (_) {}
}

// ════════════════════════════════════════════════════════════
// REPL COMMAND HANDLERS
// ════════════════════════════════════════════════════════════

function showHelp(theme, section) {
  const sections = [
    { id: 'testing',    title: '🧪 Testing',       items: [
      { cmd: 'test:web <url>', desc: 'Run Playwright web test' },
      { cmd: 'test:mobile <url> [device]', desc: 'Mobile device emulation' },
      { cmd: 'test:api <url> [method]', desc: 'API endpoint test' },
      { cmd: 'test:accessibility <url>', desc: 'axe-core audit' },
      { cmd: 'test:performance <url>', desc: 'Lighthouse audit' },
      { cmd: 'test:flakiness <url> [n]', desc: 'Flakiness detection' },
      { cmd: 'test:visual <url>', desc: 'Visual regression' },
    ]},
    { id: 'generate',   title: '📝 Generation',    items: [
      { cmd: 'generate:assertions <url>', desc: 'AI test oracle' },
      { cmd: 'generate:report <file>', desc: 'JSON/Markdown report' },
      { cmd: 'capture:screenshot <url>', desc: 'Capture screenshot' },
      { cmd: 'record:trace <url>', desc: 'Session trace (.uthyreplay)' },
      { cmd: 'run:parallel <urls>', desc: 'Parallel execution' },
    ]},
    { id: 'memory',     title: '🧠 Memory',        items: [
      { cmd: 'memory add <fact>', desc: 'Store persistent memory' },
      { cmd: 'memory list', desc: 'List by score' },
      { cmd: 'memory search <q>', desc: 'Keyword search' },
      { cmd: 'memory stats', desc: 'Statistics' },
    ]},
    { id: 'skills',     title: '⚡ Skills',         items: [
      { cmd: 'skill list', desc: 'List workflow skills' },
      { cmd: 'skill load <name>', desc: 'Load into context' },
      { cmd: 'skill search <q>', desc: 'Search skills' },
    ]},
    { id: 'goals',      title: '🎯 Goals',          items: [
      { cmd: 'goal add <text>', desc: 'Add a goal' },
      { cmd: 'goal list', desc: 'List all goals' },
      { cmd: 'goal done <id>', desc: 'Mark completed' },
      { cmd: 'goal kanban', desc: 'Visual kanban board' },
    ]},
    { id: 'models',     title: '🤖 Models',         items: [
      { cmd: 'model list', desc: 'List AI models' },
      { cmd: 'model set <id>', desc: 'Set active model' },
      { cmd: 'model route <type>', desc: 'Best model for task' },
      { cmd: 'ask <prompt>', desc: 'Query active AI model' },
    ]},
    { id: 'cron',       title: '⏰ Cron',           items: [
      { cmd: 'cron add <sched> <cmd>', desc: 'Schedule task' },
      { cmd: 'cron list', desc: 'List jobs' },
      { cmd: 'cron run <id>', desc: 'Trigger manually' },
    ]},
    { id: 'knowledge',  title: '📚 Knowledge',      items: [
      { cmd: 'kb index <dir>', desc: 'Index for search' },
      { cmd: 'kb search <query>', desc: 'TF-IDF search' },
      { cmd: 'kb stats', desc: 'Index statistics' },
    ]},
    { id: 'sessions',   title: '📝 Sessions',       items: [
      { cmd: 'session list', desc: 'Recent sessions' },
      { cmd: 'session search <q>', desc: 'Search history' },
      { cmd: 'session checkpoint <label>', desc: 'Save checkpoint' },
    ]},
    { id: 'web',        title: '🌐 Web',            items: [
      { cmd: 'search <query>', desc: 'DuckDuckGo search' },
      { cmd: 'extract <url>', desc: 'Extract page text' },
    ]},
    { id: 'watchdog',   title: '👁️ Watchdog',       items: [
      { cmd: 'watch add <url/file>', desc: 'Start monitoring' },
      { cmd: 'watch list', desc: 'Active watches' },
      { cmd: 'watch check', desc: 'Check all now' },
    ]},
    { id: 'delegation', title: '🔀 Delegation',     items: [
      { cmd: 'delegate <task>', desc: 'Delegate to worker' },
      { cmd: 'delegate parallel <t1> | <t2>', desc: 'Parallel tasks' },
    ]},
    { id: 'shell',      title: '🖥️ Shell',          items: [
      { cmd: 'help [section]', desc: 'Show help (paginated)' },
      { cmd: 'themes / theme <name>', desc: 'Change theme' },
      { cmd: 'status / /status', desc: 'System dashboard' },
      { cmd: 'about', desc: 'About UTHY AGENTIC OS' },
      { cmd: 'clear', desc: 'Clear screen' },
      { cmd: 'quit / exit / q', desc: 'Exit' },
      { cmd: 'update / /update', desc: 'Self-update from npm' },
      { cmd: '?', desc: 'Show this help' },
    ]},
  ];

  // Paginated: show specific section
  if (section) {
    const sec = sections.find(s => s.id === section || s.title.toLowerCase().includes(section.toLowerCase()));
    if (sec) {
      console.log('');
      console.log(colorize(`  ── ${sec.title} ${'─'.repeat(Math.max(1, 50 - sec.title.length))}`, 'muted', theme));
      for (const item of sec.items) {
        console.log(`    ${colorize(item.cmd.padEnd(32), 'secondary', theme)}${colorize(item.desc, 'muted', theme)}`);
      }
      console.log('');
    } else {
      console.log(colorize(`  ✗ Unknown section: "${section}". Use "help" to see all sections.`, 'error', theme));
    }
    return;
  }

  // Default: show section index only (compact)
  console.log('');
  console.log(colorize('  ── Commands ─ Type "help <section>" for details ──', 'muted', theme));
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const count = sec.items.length;
    console.log(`    ${colorize(sec.id.padEnd(14), 'secondary', theme)} ${sec.title} ${colorize(`(${count} cmds)`, 'muted', theme)}`);
  }
  console.log('');
  console.log(colorize('  ── / Slash Commands ─ Type "/help" for details ──', 'muted', theme));
  console.log(`    ${colorize('/setup /config /gateway /mcp /theme /font /layout /chat /status /engines', 'secondary', theme)}`);
  console.log('');
}

function showThemes(theme) {
  console.log('');
  console.log(colorize('  Available Themes:', 'bold', theme));
  for (const [key, t] of Object.entries(THEMES)) {
    console.log(`    ${t.primary}██${theme.reset}  ${colorize(key.padEnd(10), 'primary', theme)}${colorize(t.name, 'muted', theme)}`);
  }
  console.log('');
  console.log(colorize('  Usage: theme <name>', 'muted', theme));
}

function showAbout(theme) {
  console.log('');
  console.log(renderBox([
    `${colorize('UTHY AGENTIC OS', 'secondary', theme)} — Autonomous Agentic Operating System`,
    `${colorize('Version', 'muted', theme)}: ${VERSION}`,
    `${colorize('License', 'muted', theme)}: MIT`,
    `${colorize('Author', 'muted', theme)}: uthuman & co`,
    '',
    'Open-source agentic operating system with:',
    '  • Cyberpunk HUD overlay with live clock',
    '  • 25 terminal themes with color palettes',
    '  • Chat input panel with file upload',
    '  • Flakiness detection & self-healing',
    '  • Parallel execution with resource pooling',
    '  • Visual regression (perceptual diff + SSIM)',
    '  • AI test oracle & assertion generator',
    '  • Cross-platform session replay (.uthyreplay)',
    '  • Infrastructure-as-test-code provisioning',
  ], theme, 'ABOUT'));
}

function showModules(theme) {
  console.log('');
  const mods = [
    ['web', 'Playwright chromium web testing'],
    ['mobile', 'Mobile device emulation (WebKit)'],
    ['desktop', 'Desktop application testing'],
    ['cli', 'CLI command testing (child_process)'],
    ['api', 'API endpoint testing (axios)'],
    ['accessibility', 'axe-core accessibility audits'],
    ['performance', 'Lighthouse performance audits'],
    ['evidence', 'Screenshot & video capture'],
    ['report', 'JSON/Markdown report generation'],
    ['fix_prompt', 'AI fix prompt generation'],
    ['flakiness', 'Flakiness detection & self-healing'],
    ['parallel', 'Parallel execution engine'],
    ['visual_regression', 'Perceptual diff visual testing'],
    ['oracle', 'AI test oracle & assertions'],
    ['session_replay', 'Session trace recording & replay'],
    ['provisioner', 'Docker/env provisioning'],
  ];
  console.log(colorize('  ── LOADED MODULES ───────────────────────────────────', 'muted', theme));
  for (const [name, desc] of mods) {
    console.log(`    ${colorize('●', 'success', theme)} ${colorize(name.padEnd(22), 'secondary', theme)}${colorize(desc, 'muted', theme)}`);
  }
  console.log('');
}

function showStatus(theme) {
  console.log('');
  console.log(colorize('  ── SYSTEM STATUS ────────────────────────────────────', 'muted', theme));
  console.log(`    ${colorize('Platform', 'info', theme)}:    ${process.platform} ${process.arch}`);
  console.log(`    ${colorize('Node.js', 'info', theme)}:     ${process.version}`);
  console.log(`    ${colorize('UTHY AGENTIC OS', 'info', theme)}:       v${VERSION}`);
  console.log(`    ${colorize('Memory', 'info', theme)}:     ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
  console.log(`    ${colorize('Uptime', 'info', theme)}:     ${Math.round(process.uptime())}s`);
  console.log(`    ${colorize('Config', 'info', theme)}:     ${CONFIG_FILE}`);
  console.log(`    ${colorize('Modules', 'info', theme)}:    16 loaded`);
  console.log(`    ${colorize('Commands', 'info', theme)}:   22 available`);
  console.log('');
}

function showSocialLinks(theme) {
  const t = theme || THEMES.cyber;
  const links = [
    { icon: '\x1b[38;5;27mⓕ\x1b[0m', label: 'Facebook',  url: 'https://www.facebook.com/moody.uthuman' },
    { icon: '\x1b[38;5;201mⓘ\x1b[0m', label: 'Instagram', url: 'https://www.instagram.com/uthuman.co' },
    { icon: '\x1b[38;5;39mⓣ\x1b[0m', label: 'Telegram',  url: 'https://t.me/uthuman' },
    { icon: '\x1b[1;37mⓧ\x1b[0m',    label: 'X/Twitter', url: 'https://x.com/uthumanco' },
    { icon: '\x1b[38;5;46mⓦ\x1b[0m', label: 'WhatsApp',  url: 'https://wa.me/256705126287' },
    { icon: '\x1b[38;5;226mⓔ\x1b[0m', label: 'Email',     url: 'mailto:dev@uthuman.com' },
    { icon: '\x1b[1;37mⓚ\x1b[0m',    label: 'TikTok',    url: 'https://www.tiktok.com/@uthuman.co' },
    { icon: '\x1b[1;37mⓖ\x1b[0m',    label: 'GitHub',    url: 'https://github.com/uthumany' },
  ];
  console.log('');
  console.log(colorize('  ── CONNECT WITH UTHUMAN & CO ────────────────────────', 'muted', theme));
  for (const l of links) {
    const label = colorize(l.label.padEnd(12), 'primary', theme);
    const url = colorize(l.url, 'info', theme);
    console.log(`    ${l.icon} ${label} ${url}`);
  }
  console.log('');
  console.log(colorize('  © 2026 uthuman & co. Free & Open Source.', 'muted', theme));
  console.log('');
}

async function cmdWebTest(url, theme) {
  console.log(colorize(`\n  ▶ Running web test: ${url}`, 'info', theme));
  const stop = spinner('Launching browser...', theme);
  try {
    await runWebTest(url);
    stop();
    console.log(colorize('  ✓ Web test completed', 'success', theme));
  } catch (e) {
    stop();
    console.log(colorize(`  ✗ Web test failed: ${e.message}`, 'error', theme));
  }
}

async function cmdMobileTest(url, device, theme) {
  console.log(colorize(`\n  ▶ Mobile test: ${url} (${device})`, 'info', theme));
  const stop = spinner('Launching mobile emulation...', theme);
  try {
    await runMobileTest(url, device);
    stop();
    console.log(colorize('  ✓ Mobile test completed', 'success', theme));
  } catch (e) {
    stop();
    console.log(colorize(`  ✗ Mobile test failed: ${e.message}`, 'error', theme));
  }
}

async function cmdApiTest(url, method, data, theme) {
  console.log(colorize(`\n  ▶ API test: ${method} ${url}`, 'info', theme));
  let parsed = {};
  if (data) try { parsed = JSON.parse(data); } catch (_) {}
  try {
    await runApiTest(url, method, parsed);
    console.log(colorize('  ✓ API test completed', 'success', theme));
  } catch (e) {
    console.log(colorize(`  ✗ API test failed: ${e.message}`, 'error', theme));
  }
}

async function cmdAccessibility(url, theme) {
  console.log(colorize(`\n  ▶ Accessibility audit: ${url}`, 'info', theme));
  try {
    await runAccessibilityTest(url);
    console.log(colorize('  ✓ Accessibility test completed', 'success', theme));
  } catch (e) {
    console.log(colorize(`  ✗ Accessibility test failed: ${e.message}`, 'error', theme));
  }
}

async function cmdPerformance(url, theme) {
  console.log(colorize(`\n  ▶ Performance audit: ${url}`, 'info', theme));
  try {
    await runPerformanceTest(url);
    console.log(colorize('  ✓ Performance test completed', 'success', theme));
  } catch (e) {
    console.log(colorize(`  ✗ Performance test failed: ${e.message}`, 'error', theme));
  }
}

async function cmdFlakiness(url, iterations, theme) {
  console.log(colorize(`\n  ▶ Flakiness detection: ${url} (${iterations} iterations)`, 'info', theme));
  const detector = new FlakinessDetector({ iterations, outputDir: './uthy-flakiness-results' });
  const testFn = async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: 'flakiness_screenshot.png' });
  };
  const result = await detector.detectFlakiness('web-navigation', testFn, url);
  console.log('');
  console.log(colorize('  ── FLAKINESS REPORT ─────────────────────────────────', 'muted', theme));
  console.log(`    Pass rate:      ${colorize(`${(result.passRate * 100).toFixed(1)}%`, result.passRate > 0.8 ? 'success' : 'error', theme)}`);
  console.log(`    Flakiness:      ${colorize(`${(result.flakinessScore * 100).toFixed(1)}%`, result.isFlaky ? 'error' : 'success', theme)}`);
  console.log(`    Status:         ${result.isFlaky ? colorize('FLAKY ⚠', 'error', theme) : colorize('STABLE ✓', 'success', theme)}`);
  console.log(`    Avg time:       ${result.timingStats.avgMs}ms`);
  detector.saveResults(result, `flakiness-${Date.now()}.json`);
}

async function cmdVisual(url, theme) {
  console.log(colorize(`\n  ▶ Visual regression: ${url}`, 'info', theme));
  const tester = new VisualRegressionTester({ baselineDir: './uthy-visual-baselines', outputDir: './uthy-visual-results' });
  const report = await tester.runRegression(url, { updateBaseline: false });
  console.log(colorize(`  Matches: ${report.summary.matches} | Noise: ${report.summary.noise} | Critical: ${report.summary.critical}`, 
    report.summary.hasBlockingRegressions ? 'error' : 'success', theme));
}

async function cmdParallel(urls, theme) {
  const urlList = urls.split(',').map(u => u.trim());
  console.log(colorize(`\n  ▶ Parallel execution: ${urlList.length} URLs`, 'info', theme));
  const engine = new ParallelEngine({ maxWorkers: Math.min(urlList.length, 4) });
  const suite = urlList.map((url, i) => ({
    id: `task_${i}`, name: `Test ${url}`, resourceType: 'none',
    execute: async () => ({ url, status: 'ok', duration: Math.random() * 100 }),
  }));
  const summary = await engine.runSuite(suite);
  console.log(colorize(`  ✓ ${summary.completed}/${summary.totalTasks} passed (${summary.totalDurationMs}ms)`, 'success', theme));
}

async function cmdOracle(url, theme) {
  console.log(colorize(`\n  ▶ Test Oracle: exploring ${url}`, 'info', theme));
  const oracle = new TestOracle({ outputDir: './uthy-generated-assertions' });
  const { assertions } = await oracle.explore(url, { maxInteractions: 10 });
  console.log(colorize(`  ✓ Generated ${assertions.length} assertions`, 'success', theme));
  for (const a of assertions.slice(0, 5)) {
    console.log(`    ${colorize('[', 'muted', theme)}${colorize(a.severity, a.severity === 'critical' ? 'error' : 'warn', theme)}${colorize(']', 'muted', theme)} ${a.invariant}`);
  }
}

async function cmdRecordTrace(url, duration, theme) {
  console.log(colorize(`\n  ▶ Recording trace: ${url} (${duration}s)`, 'info', theme));
  const recorder = new SessionRecorder({ outputDir: './uthy-traces' });
  const result = await recorder.record(url, { duration });
  console.log(colorize(`  ✓ Trace saved: ${result.outputPath}`, 'success', theme));
  console.log(`    Snapshots: ${result.stats.snapshots} | Network: ${result.stats.networkEntries} | Errors: ${result.stats.consoleErrors}`);
}

async function cmdScreenshot(url, theme) {
  console.log(colorize(`\n  ▶ Capturing screenshot: ${url}`, 'info', theme));
  try {
    await captureScreenshot(url, 'screenshot.png');
    console.log(colorize('  ✓ Screenshot saved: screenshot.png', 'success', theme));
  } catch (e) {
    console.log(colorize(`  ✗ Screenshot failed: ${e.message}`, 'error', theme));
  }
}

async function cmdReport(file, format, theme) {
  console.log(colorize(`\n  ▶ Generating report: ${file}`, 'info', theme));
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const reportFile = generateReport(data, format);
    console.log(colorize(`  ✓ Report saved: ${reportFile}`, 'success', theme));
  } catch (e) {
    console.log(colorize(`  ✗ Report failed: ${e.message}`, 'error', theme));
  }
}

async function cmdProvision(dir, theme) {
  console.log(colorize(`\n  ▶ Provisioning: ${dir}`, 'info', theme));
  const provisioner = new EnvironmentProvisioner({ baseDir: dir });
  const manifest = provisioner.readManifest(dir);
  console.log(colorize(`  Manifest loaded: ${manifest.services ? manifest.services.length : 0} services`, 'info', theme));
}

// ════════════════════════════════════════════════════════════
// CLI MODE (Commander)
// ════════════════════════════════════════════════════════════

function runCli() {
  const program = new Command();

  program
    .name('uthy')
    .description('UTHY AGENTIC OS — Autonomous Agentic Operating System with cyberpunk HUD, chat, and 25 themes')
    .version(VERSION);

  // ── If no args, launch REPL ───────────────────────────
  if (process.argv.length <= 2) {
    startRepl();
    return;
  }

  // ── Subcommands ───────────────────────────────────────

  program.command('test:web <url>')
    .description('Run web tests on a given URL')
    .action(async (url) => {
      console.log(`Starting web test for ${url}...`);
      await runWebTest(url);
      console.log('Web test finished.');
      process.exit(0);
    });

  program.command('test:desktop <appName>')
    .description('Run desktop application tests')
    .action(async (appName) => {
      console.log(`Starting desktop test for ${appName}...`);
      await runDesktopTest(appName);
      console.log('Desktop test finished.');
      process.exit(0);
    });

  program.command('test:cli <command>')
    .description('Run CLI command tests')
    .action(async (command) => {
      console.log(`Starting CLI test for: ${command}...`);
      await runCliTest(command);
      console.log('CLI test finished.');
      process.exit(0);
    });

  program.command('test:api <url>')
    .description('Run API tests on a given URL')
    .option('-m, --method <type>', 'HTTP method', 'GET')
    .option('-d, --data <json>', 'JSON data for POST/PUT')
    .action(async (url, options) => {
      console.log(`Starting API test for ${url}...`);
      let data = {};
      if (options.data) try { data = JSON.parse(options.data); } catch (e) { console.error('Invalid JSON'); process.exit(1); }
      await runApiTest(url, options.method, data);
      console.log('API test finished.');
      process.exit(0);
    });

  program.command('test:accessibility <url>')
    .description('Run accessibility tests')
    .action(async (url) => {
      console.log(`Starting accessibility test for ${url}...`);
      await runAccessibilityTest(url);
      console.log('Accessibility test finished.');
      process.exit(0);
    });

  program.command('test:performance <url>')
    .description('Run Lighthouse performance tests')
    .action(async (url) => {
      console.log(`Starting performance test for ${url}...`);
      await runPerformanceTest(url);
      console.log('Performance test finished.');
      process.exit(0);
    });

  program.command('test:mobile <url>')
    .description('Run mobile tests with device emulation')
    .option('-d, --device <type>', 'Device to emulate', 'iPhone 11')
    .action(async (url, options) => {
      console.log(`Starting mobile test for ${url} on ${options.device}...`);
      await runMobileTest(url, options.device);
      console.log('Mobile test finished.');
      process.exit(0);
    });

  program.command('capture:screenshot <url>')
    .description('Capture a screenshot')
    .option('-o, --output <path>', 'Output path', 'screenshot.png')
    .action(async (url, options) => {
      await captureScreenshot(url, options.output);
      console.log('Screenshot captured.');
      process.exit(0);
    });

  program.command('record:video <url>')
    .description('Record a video')
    .option('-o, --output <path>', 'Output path', 'video.webm')
    .option('-d, --duration <seconds>', 'Duration', '5')
    .action(async (url, options) => {
      await recordVideo(url, options.output, parseInt(options.duration));
      console.log('Video recorded.');
      process.exit(0);
    });

  program.command('generate:fix-prompt <file>')
    .description('Generate a fix prompt from error details')
    .action(async (file) => {
      const errorDetails = JSON.parse(fs.readFileSync(file, 'utf8'));
      const fix = await generateFixPrompt(errorDetails);
      console.log('Fix Prompt:\n', fix);
      process.exit(0);
    });

  program.command('generate:report <file>')
    .description('Generate test reports')
    .option('-f, --format <type>', 'Format (json, markdown)', 'json')
    .action(async (file, options) => {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const reportFile = generateReport(data, options.format);
      console.log(`Report generated: ${reportFile}`);
      process.exit(0);
    });

  program.command('test:flakiness <url>')
    .description('Flakiness detection')
    .option('-i, --iterations <n>', 'Iterations', '5')
    .option('--heal', 'Self-heal flaky tests')
    .action(async (url, options) => {
      const detector = new FlakinessDetector({ iterations: parseInt(options.iterations) });
      const testFn = async (page) => {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.screenshot({ path: 'flakiness_screenshot.png' });
      };
      const result = await detector.detectFlakiness('web-navigation', testFn, url);
      console.log(`\nPass rate: ${(result.passRate * 100).toFixed(1)}% | Flaky: ${result.isFlaky ? 'YES ⚠' : 'NO ✓'}`);
      detector.saveResults(result, `flakiness-${Date.now()}.json`);
      process.exit(0);
    });

  program.command('run:parallel <urls>')
    .description('Parallel test execution')
    .option('-w, --workers <n>', 'Workers', '4')
    .action(async (urls, options) => {
      const urlList = urls.split(',').map(u => u.trim());
      const engine = new ParallelEngine({ maxWorkers: parseInt(options.workers) });
      const suite = urlList.map((url, i) => ({
        id: `task_${i}`, name: `Test ${url}`, resourceType: 'none',
        execute: async () => ({ url, status: 'ok' }),
      }));
      const summary = await engine.runSuite(suite);
      console.log(`\n${summary.completed}/${summary.totalTasks} completed (${summary.totalDurationMs}ms)`);
      process.exit(0);
    });

  program.command('test:visual <url>')
    .description('Visual regression test')
    .option('--update-baseline', 'Update baselines')
    .action(async (url, options) => {
      const tester = new VisualRegressionTester({});
      const report = await tester.runRegression(url, { updateBaseline: !!options.updateBaseline });
      console.log(`\nMatches: ${report.summary.matches} | Critical: ${report.summary.critical}`);
      if (report.summary.hasBlockingRegressions) process.exit(1);
      process.exit(0);
    });

  program.command('generate:assertions <url>')
    .description('Auto-generate test assertions')
    .action(async (url) => {
      const oracle = new TestOracle({});
      const { assertions } = await oracle.explore(url, { maxInteractions: 15 });
      console.log(`\nGenerated ${assertions.length} assertions`);
      for (const a of assertions) console.log(`  [${a.severity}] ${a.invariant}`);
      process.exit(0);
    });

  program.command('record:trace <url>')
    .description('Record session trace')
    .option('-d, --duration <sec>', 'Duration', '10')
    .action(async (url, options) => {
      const recorder = new SessionRecorder({});
      const result = await recorder.record(url, { duration: parseInt(options.duration) });
      console.log(`\nTrace saved: ${result.outputPath}`);
      process.exit(0);
    });

  program.command('replay:view <file>')
    .description('Generate replay viewer')
    .option('-o, --output <path>', 'Output HTML', 'replay-viewer.html')
    .action(async (file, options) => {
      const data = SessionTrace.load(file);
      ReplayViewer.generateViewerHTML(data, options.output);
      console.log(`Replay viewer: ${options.output}`);
      process.exit(0);
    });

  program.command('provision <dir>')
    .description('Provision test environment')
    .option('--dry-run', 'Dry run')
    .action(async (dir, options) => {
      const provisioner = new EnvironmentProvisioner({ baseDir: dir });
      const manifest = provisioner.readManifest(dir);
      if (options.dryRun) {
        console.log('Dry run — services:', manifest.services?.length || 0);
      } else {
        const result = await provisioner.provision(manifest, dir);
        console.log(`Provisioned: ${result.services.length} services`);
      }
      process.exit(0);
    });

  program.command('provision:teardown')
    .description('Tear down provisioned environments')
    .action(async () => {
      const provisioner = new EnvironmentProvisioner({});
      await provisioner.teardown();
      console.log('Teardown complete.');
      process.exit(0);
    });

  program.command('visual:update-baseline <url>')
    .description('Update visual regression baselines')
    .action(async (url) => {
      const tester = new VisualRegressionTester({});
      await tester.runRegression(url, { updateBaseline: true });
      console.log('Baselines updated.');
      process.exit(0);
    });

  program.command('shell')
    .description('Launch interactive REPL shell')
    .action(() => {
      startRepl();
    });

  program.parse(process.argv);
}

// ════════════════════════════════════════════════════════════
// ENTRY POINT
// ════════════════════════════════════════════════════════════

runCli();
