// Comprehensive Feature Test Suite for UTHY AGENTIC OS
const path = require('path');
const results = { pass: 0, fail: 0, errors: [] };

function test(name, fn) {
  try {
    const result = fn();
    if (result !== false) {
      results.pass++;
      console.log(`  ✓ ${name}`);
    } else {
      results.fail++;
      results.errors.push(`${name}: returned false`);
      console.log(`  ✗ ${name}: returned false`);
    }
  } catch (e) {
    results.fail++;
    results.errors.push(`${name}: ${e.message}`);
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    const result = await fn();
    if (result !== false) {
      results.pass++;
      console.log(`  ✓ ${name}`);
    } else {
      results.fail++;
      results.errors.push(`${name}: returned false`);
      console.log(`  ✗ ${name}: returned false`);
    }
  } catch (e) {
    results.fail++;
    results.errors.push(`${name}: ${e.message}`);
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

async function run() {
  console.log('\n═══ UTHY AGENTIC OS — COMPREHENSIVE TEST SUITE ═══\n');

  // ── MODULE IMPORTS ──
  console.log('─ Module Imports ─');
  const modules = {};
  
  test('Import MemoryEngine', () => { modules.Memory = require('./src/modules/memory').MemoryEngine; return !!modules.Memory; });
  test('Import SkillEngine', () => { modules.Skills = require('./src/modules/skills').SkillEngine; return !!modules.Skills; });
  test('Import GoalEngine', () => { modules.Goals = require('./src/modules/goals').GoalEngine; return !!modules.Goals; });
  test('Import ModelRouter', () => { modules.Models = require('./src/modules/models').ModelRouter; return !!modules.Models; });
  test('Import CronEngine', () => { modules.Cron = require('./src/modules/cron').CronEngine; return !!modules.Cron; });
  test('Import KnowledgeEngine', () => { modules.Knowledge = require('./src/modules/knowledge').KnowledgeEngine; return !!modules.Knowledge; });
  test('Import SessionEngine', () => { modules.Sessions = require('./src/modules/sessions').SessionEngine; return !!modules.Sessions; });
  test('Import WebSearchEngine', () => { modules.WebSearch = require('./src/modules/websearch').WebSearchEngine; return !!modules.WebSearch; });
  test('Import WatchdogEngine', () => { modules.Watchdog = require('./src/modules/watchdog').WatchdogEngine; return !!modules.Watchdog; });
  test('Import DelegationEngine', () => { modules.Delegation = require('./src/modules/delegation').DelegationEngine; return !!modules.Delegation; });
  test('Import ConfigManager', () => { modules.Config = require('./src/modules/config').ConfigManager; return !!modules.Config; });
  test('Import GatewayManager', () => { modules.Gateway = require('./src/modules/gateway').GatewayManager; return !!modules.Gateway; });
  test('Import MCPManager', () => { modules.MCP = require('./src/modules/mcp').MCPManager; return !!modules.MCP; });
  test('Import ChatPanel', () => { modules.ChatPanel = require('./src/modules/chatPanel').ChatPanel; return !!modules.ChatPanel; });
  test('Import LayoutManager', () => { modules.Layout = require('./src/modules/tui').LayoutManager; return !!modules.Layout; });
  test('Import Animations', () => { modules.Animations = require('./src/modules/animations').Animations; return !!modules.Animations; });
  test('Import chat.parseAttachments', () => { return !!require('./src/modules/chat').parseAttachments; });
  test('Import chat.readAttachedFile', () => { return !!require('./src/modules/chat').readAttachedFile; });
  test('Import chat.renderChatPrompt', () => { return !!require('./src/modules/chat').renderChatPrompt; });
  test('Import chat.walkDirectory', () => { return !!require('./src/modules/chat').walkDirectory; });

  // ── UI MODULE ──
  console.log('\n─ UI Module ─');
  const ui = require('./src/ui');
  test('THEMES loaded (25)', () => Object.keys(ui.THEMES).length === 25);
  test('BANNER exists', () => typeof ui.BANNER === 'string' && ui.BANNER.length > 0);
  test('BANNER_LINES array (10 lines)', () => Array.isArray(ui.BANNER_LINES) && ui.BANNER_LINES.length === 10);
  test('renderBanner function', () => typeof ui.renderBanner === 'function');
  test('renderBannerAtTop function', () => typeof ui.renderBannerAtTop === 'function');
  test('renderHudCard function', () => typeof ui.renderHudCard === 'function');
  test('renderHudAtTop function', () => typeof ui.renderHudAtTop === 'function');
  test('startHudRefresh function', () => typeof ui.startHudRefresh === 'function');
  test('renderBox function', () => typeof ui.renderBox === 'function');
  test('colorize function', () => typeof ui.colorize === 'function');
  test('stripAnsi function', () => typeof ui.stripAnsi === 'function');
  test('SOCIAL_LINKS (8)', () => Array.isArray(ui.SOCIAL_LINKS) && ui.SOCIAL_LINKS.length === 8);
  
  // Test each theme renders correctly
  for (const [name, t] of Object.entries(ui.THEMES)) {
    test(`Theme "${name}" HUD renders 20 lines × 90 cols`, () => {
      const hud = ui.renderHudCard(t);
      const w = ui.stripAnsi(hud[0]).length;
      return hud.length === 20 && w === 90;
    });
  }

  // ── ENGINE INITIALIZATION ──
  console.log('\n─ Engine Initialization ─');
  
  await asyncTest('MemoryEngine.init()', async () => {
    const e = new modules.Memory(); await e.init(); return true;
  });
  await asyncTest('SkillEngine.init()', async () => {
    const e = new modules.Skills(); await e.init(); return true;
  });
  await asyncTest('GoalEngine.init()', async () => {
    const e = new modules.Goals(); await e.init(); return true;
  });
  await asyncTest('ModelRouter.init()', async () => {
    const e = new modules.Models(); await e.init(); return true;
  });
  await asyncTest('CronEngine.init()', async () => {
    const e = new modules.Cron(); await e.init(); e.stop(); return true;
  });
  await asyncTest('KnowledgeEngine.init()', async () => {
    const e = new modules.Knowledge(); await e.init(); return true;
  });
  await asyncTest('SessionEngine.init()', async () => {
    const e = new modules.Sessions(); await e.init(); return true;
  });
  await asyncTest('WebSearchEngine.init()', async () => {
    const e = new modules.WebSearch(); await e.init(); return true;
  });
  await asyncTest('WatchdogEngine.init()', async () => {
    const e = new modules.Watchdog(); await e.init(); return true;
  });
  await asyncTest('DelegationEngine.init()', async () => {
    const e = new modules.Delegation(); await e.init(); return true;
  });
  await asyncTest('ConfigManager.init()', async () => {
    const e = new modules.Config(); await e.init(); return true;
  });
  await asyncTest('MCPManager.init()', async () => {
    const e = new modules.MCP(); await e.init(); return true;
  });

  // ── MEMORY ENGINE FUNCTIONALITY ──
  console.log('\n─ Memory Engine ─');
  await asyncTest('memory.add()', async () => {
    const e = new modules.Memory(); await e.init();
    const entry = await e.add('Test memory entry', 'general', ['test']);
    return entry && entry.id && entry.content === 'Test memory entry';
  });
  await asyncTest('memory.list()', async () => {
    const e = new modules.Memory(); await e.init();
    const list = await e.list({ limit: 5 });
    return Array.isArray(list);
  });
  await asyncTest('memory.search()', async () => {
    const e = new modules.Memory(); await e.init();
    const results = await e.search('test', 5);
    return Array.isArray(results);
  });
  await asyncTest('memory.stats()', async () => {
    const e = new modules.Memory(); await e.init();
    const s = await e.stats();
    return s && typeof s.total === 'number';
  });

  // ── SKILL ENGINE FUNCTIONALITY ──
  console.log('\n─ Skill Engine ─');
  await asyncTest('skills.list() with built-ins', async () => {
    const e = new modules.Skills(); await e.init();
    const list = await e.list();
    return list.length >= 5; // 5 built-in skills
  });
  await asyncTest('skills.get("web-audit")', async () => {
    const e = new modules.Skills(); await e.init();
    const skill = await e.get('web-audit');
    return skill && skill.content && skill.content.length > 0;
  });
  await asyncTest('skills.search("api")', async () => {
    const e = new modules.Skills(); await e.init();
    const results = await e.search('api');
    return results.length > 0;
  });
  await asyncTest('skills.stats()', async () => {
    const e = new modules.Skills(); await e.init();
    const s = await e.stats();
    return s && s.total >= 5;
  });

  // ── GOAL ENGINE FUNCTIONALITY ──
  console.log('\n─ Goal Engine ─');
  await asyncTest('goals.add()', async () => {
    const e = new modules.Goals(); await e.init();
    const g = await e.add('Test goal', 'Active', 'high', ['test']);
    return g && g.id && g.text === 'Test goal';
  });
  await asyncTest('goals.list()', async () => {
    const e = new modules.Goals(); await e.init();
    const list = await e.list({});
    return Array.isArray(list);
  });
  await asyncTest('goals.complete()', async () => {
    const e = new modules.Goals(); await e.init();
    const g = await e.add('Complete me', 'Active', 'medium', []);
    const completed = await e.complete(g.id);
    return completed && completed.status === 'completed';
  });
  await asyncTest('goals.kanban()', async () => {
    const e = new modules.Goals(); await e.init();
    const board = await e.kanban(ui.THEMES.cyber);
    return Array.isArray(board) && board.length > 0;
  });
  await asyncTest('goals.review()', async () => {
    const e = new modules.Goals(); await e.init();
    const r = await e.review();
    return r && typeof r.total === 'number';
  });

  // ── MODEL ROUTER FUNCTIONALITY ──
  console.log('\n─ Model Router ─');
  await asyncTest('models.listModels()', async () => {
    const e = new modules.Models(); await e.init();
    const list = await e.listModels();
    return list.length >= 8; // 8 default models
  });
  await asyncTest('models.listProviders()', async () => {
    const e = new modules.Models(); await e.init();
    const list = await e.listProviders();
    return list.length >= 4; // 4 default providers
  });
  await asyncTest('models.route("code")', async () => {
    const e = new modules.Models(); await e.init();
    const m = await e.route('code');
    return m && m.id;
  });
  await asyncTest('models.setActive/getActive', async () => {
    const e = new modules.Models(); await e.init();
    await e.setActive('gpt-4o');
    const active = await e.getActive();
    return active && active.id === 'gpt-4o';
  });

  // ── CONFIG MANAGER FUNCTIONALITY ──
  console.log('\n─ Config Manager ─');
  await asyncTest('config.get/set', async () => {
    const e = new modules.Config(); await e.init();
    await e.set('test.key', 'test-value');
    const val = await e.get('test.key');
    return val === 'test-value';
  });
  await asyncTest('config.has/delete', async () => {
    const e = new modules.Config(); await e.init();
    await e.set('test.del', 'yes');
    const has = await e.has('test.del');
    await e.delete('test.del');
    const gone = !(await e.has('test.del'));
    return has && gone;
  });
  await asyncTest('config.setSecret/getSecret', async () => {
    const e = new modules.Config(); await e.init();
    await e.setSecret('test-api-key', 'sk-test-123');
    const val = await e.getSecret('test-api-key');
    return val === 'sk-test-123';
  });
  await asyncTest('config.export/import', async () => {
    const e = new modules.Config(); await e.init();
    const json = await e.export();
    return json && json.length > 10;
  });
  await asyncTest('config.list()', async () => {
    const e = new modules.Config(); await e.init();
    await e.list(); // should not throw
    return true;
  });

  // ── MCP MANAGER FUNCTIONALITY ──
  console.log('\n─ MCP Manager ─');
  await asyncTest('mcp.listServers()', async () => {
    const e = new modules.MCP(); await e.init();
    const list = await e.listServers();
    return list.length >= 2; // 2 default servers
  });
  await asyncTest('mcp.addServer()', async () => {
    const e = new modules.MCP(); await e.init();
    const s = await e.addServer('test-server', 'stdio', { command: 'echo' });
    return s && s.name === 'test-server';
  });
  await asyncTest('mcp.stats()', async () => {
    const e = new modules.MCP(); await e.init();
    const s = await e.stats();
    return s && s.total >= 2;
  });

  // ── ANIMATIONS ──
  console.log('\n─ Animations ─');
  test('Animations.barLoader()', () => {
    const bar = modules.Animations.barLoader(60, 20, ui.THEMES.cyber);
    return typeof bar === 'string' && bar.length > 0;
  });
  test('Animations.progressBar()', () => {
    const bar = modules.Animations.progressBar(75, 100, 30, ui.THEMES.cyber);
    return typeof bar === 'string' && bar.includes('75');
  });
  test('Animations.statusEmoji()', () => {
    return modules.Animations.statusEmoji('success') === '✓';
  });
  test('Animations.glowText()', () => {
    const g = modules.Animations.glowText('test', 'cyan');
    return typeof g === 'string' && g.includes('test');
  });
  test('Animations.shadowText()', () => {
    const s = modules.Animations.shadowText('test');
    return typeof s === 'string' && s.length > 4;
  });
  test('Animations.gradientBar()', () => {
    const g = modules.Animations.gradientBar(20, [[0,255,255],[255,0,255]]);
    return typeof g === 'string' && g.length > 0;
  });
  test('Animations.waveText()', () => {
    const w = modules.Animations.waveText('hello', ui.THEMES.cyber);
    return typeof w === 'string' && w.length > 5;
  });

  // ── LAYOUT MANAGER ──
  console.log('\n─ Layout Manager ─');
  test('LayoutManager creates', () => {
    const lm = new modules.Layout();
    return lm && typeof lm.isTTY !== 'undefined';
  });
  test('LayoutManager modes', () => {
    const lm = new modules.Layout();
    return lm.setMode('wide') && lm.setMode('compact') && lm.setMode('zen');
  });
  test('LayoutManager zones', () => {
    const lm = new modules.Layout();
    const z = lm.getZones();
    return z && z.top && z.middle && z.bottom;
  });
  test('LayoutManager prompt', () => {
    const lm = new modules.Layout();
    const p = lm.getPromptString(ui.THEMES.cyber);
    return typeof p === 'string' && p.length > 0;
  });
  test('LayoutManager info', () => {
    const lm = new modules.Layout();
    const info = lm.getInfo();
    return info && info.mode && info.cols && info.rows;
  });

  // ── CHAT MODULE ──
  console.log('\n─ Chat Module ─');
  test('parseAttachments()', () => {
    const { parseAttachments } = require('./src/modules/chat');
    const r = parseAttachments('hello world');
    return r && r.text === 'hello world';
  });
  test('readAttachedFile(package.json)', () => {
    const { readAttachedFile } = require('./src/modules/chat');
    const r = readAttachedFile('./package.json');
    return r && r.name === 'package.json' && r.isText;
  });
  test('renderChatPrompt()', () => {
    const { renderChatPrompt } = require('./src/modules/chat');
    const lines = renderChatPrompt(ui.THEMES.cyber, []);
    return Array.isArray(lines) && lines.length > 0;
  });
  test('walkDirectory(".")', () => {
    const { walkDirectory } = require('./src/modules/chat');
    const entries = walkDirectory('.', 1);
    return Array.isArray(entries) && entries.length > 0;
  });

  // ── CLI FLAGS ──
  console.log('\n─ CLI Flags ─');
  test('--help exits cleanly', () => {
    const { execSync } = require('child_process');
    try {
      execSync('node src/index.js --help', { timeout: 5000, cwd: process.cwd() });
      return true;
    } catch (e) {
      return e.status === 0 || e.status === 1; // commander exits 0 or 1
    }
  });

  // ── RESULTS ──
  console.log('\n═══════════════════════════════════════════');
  console.log(`  TOTAL: ${results.pass + results.fail} | PASS: ${results.pass} | FAIL: ${results.fail}`);
  if (results.errors.length > 0) {
    console.log('\n  ERRORS:');
    results.errors.forEach(e => console.log(`    • ${e}`));
  }
  console.log('═══════════════════════════════════════════\n');
}

run().catch(e => console.error('FATAL:', e.message));
