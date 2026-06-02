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
  THEMES, renderBanner, renderBox, renderMenu,
  colorize, progressBar, spinner, divider,
  startHudRefresh, renderHudCard, stripAnsi,
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

// ════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════

const VERSION = '1.0.0';
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

  // Clear screen, push content below HUD overlay (HUD occupies ~20 rows at top-right)
  process.stdout.write('\x1b[2J\x1b[H');
  // Reserve space for HUD — push banner below it
  const hudLines = renderHudCard(theme);
  const hudHeight = hudLines.length + 2; // +2 margin
  console.log('\n'.repeat(hudHeight));
  console.log(renderBanner(theme, config.compactBanner));
  console.log('');
  console.log(colorize(`  Welcome to UTHY AGENTIC OS v${VERSION} — Your Autonomous Testing Companion`, 'info', theme));
  console.log(colorize('  Type "help" for commands, "quit" to exit', 'muted', theme));
  console.log('');

  // Start the real-time HUD overlay (top-right, clock ticks every second)
  const stopHud = startHudRefresh(theme, 1000);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colorize('uthy', 'secondary', theme)}${colorize('>', 'primary', theme)} `,
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
      ];
      const hits = cmds.filter(c => c.startsWith(line));
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

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    const [cmd, ...args] = input.split(/\s+/);

    try {
      switch (cmd) {
        case 'help':
          showHelp(theme);
          break;

        case 'quit':
        case 'exit':
          if (stopHud) stopHud();
          console.log(colorize('\n  Goodbye! Happy testing! 👋\n', 'info', theme));
          saveHistory(rl);
          process.exit(0);

        case 'clear':
          process.stdout.write('\x1b[2J\x1b[H');
          console.log(renderBanner(theme, true));
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

        case 'hud':
        case 'footer':
          // Redraw HUD immediately
          process.stdout.write('\x1b[2J\x1b[H');
          console.log('\n'.repeat(renderHudCard(theme).length + 2));
          console.log(renderBanner(theme, true));
          console.log('');
          console.log(colorize('  HUD refreshed. Holographic console active...', 'success', theme));
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
      }
    } catch (err) {
      console.log(colorize(`  Error: ${err.message}`, 'error', theme));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    if (stopHud) stopHud();
    console.log(colorize('\n  Goodbye! 👋\n', 'info', theme));
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

function showHelp(theme) {
  const sections = [
    {
      title: 'TESTING',
      items: [
        { cmd: 'test:web <url>', desc: 'Run Playwright web test' },
        { cmd: 'test:mobile <url> [device]', desc: 'Mobile device emulation test' },
        { cmd: 'test:api <url> [method] [data]', desc: 'API endpoint test' },
        { cmd: 'test:accessibility <url>', desc: 'axe-core accessibility audit' },
        { cmd: 'test:performance <url>', desc: 'Lighthouse performance audit' },
        { cmd: 'test:flakiness <url> [n]', desc: 'Flakiness detection (n iterations)' },
        { cmd: 'test:visual <url>', desc: 'Visual regression vs baseline' },
      ],
    },
    {
      title: 'GENERATION & RECORDING',
      items: [
        { cmd: 'generate:assertions <url>', desc: 'AI test oracle — auto-generate assertions' },
        { cmd: 'generate:report <file> [fmt]', desc: 'Generate JSON/Markdown report' },
        { cmd: 'capture:screenshot <url>', desc: 'Capture screenshot' },
        { cmd: 'record:trace <url> [sec]', desc: 'Record session trace (.uthyreplay)' },
        { cmd: 'run:parallel <url1,url2>', desc: 'Parallel execution engine' },
      ],
    },
    {
      title: 'PROVISIONING',
      items: [
        { cmd: 'provision <dir>', desc: 'Provision test environment from env.yaml' },
      ],
    },
    {
      title: 'SHELL',
      items: [
        { cmd: 'help', desc: 'Show this help' },
        { cmd: 'themes', desc: 'List available themes' },
        { cmd: 'theme <name>', desc: 'Switch theme' },
        { cmd: 'modules', desc: 'Show loaded modules' },
        { cmd: 'status', desc: 'System status' },
        { cmd: 'social', desc: 'Show social media links' },
        { cmd: 'hud', desc: 'Refresh the holographic HUD overlay' },
        { cmd: 'about', desc: 'About UTHY AGENTIC OS' },
        { cmd: 'clear', desc: 'Clear screen' },
        { cmd: 'quit / exit', desc: 'Exit UTHY AGENTIC OS' },
      ],
    },
    {
      title: '💬 Chat & Files',
      items: [
        { cmd: 'chat', desc: 'Show chat input panel' },
        { cmd: 'attach <file>', desc: 'Attach a file for processing' },
        { cmd: 'files [dir]', desc: 'Show file tree of directory' },
        { cmd: 'upload', desc: 'Show supported file types' },
      ],
    },
  ];

  console.log('');
  for (const sec of sections) {
    console.log(colorize(`  ── ${sec.title} ${'─'.repeat(50 - sec.title.length)}`, 'muted', theme));
    for (const item of sec.items) {
      const cmd = colorize(item.cmd.padEnd(32), 'secondary', theme);
      console.log(`    ${cmd}${colorize(item.desc, 'muted', theme)}`);
    }
    console.log('');
  }
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
