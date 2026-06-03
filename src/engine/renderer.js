'use strict';

/**
 * UTHY OS v2.0 — 3D Terminal UI Engine
 * Cyberpunk-inspired rendering with depth, animations, panels, and effects.
 * No external dependencies — pure ANSI escape codes.
 */

// ════════════════════════════════════════════════════════════
// ANSI HELPERS
// ════════════════════════════════════════════════════════════

const ESC = '\x1b';
const CSI = `${ESC}[`;
const save = `${ESC}7`;
const restore = `${ESC}8`;
const hideCursor = `${CSI}?25l`;
const showCursor = `${CSI}?25h`;
const clear = `${CSI}2J${CSI}H`;
const moveTo = (r, c) => `${CSI}${r};${c}H`;
const clearLine = `${CSI}2K`;
const bold = `${CSI}1m`;
const dim = `${CSI}2m`;
const reset = `${CSI}0m`;
const rgb = (r, g, b) => `${CSI}38;2;${r};${g};${b}m`;
const rgbBg = (r, g, b) => `${CSI}48;2;${r};${g};${b}m`;

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b[78]/g, '');
}

function visibleLen(s) {
  return stripAnsi(s).length;
}

function padRight(s, width) {
  const vis = visibleLen(s);
  return vis >= width ? s : s + ' '.repeat(width - vis);
}

function padCenter(s, width) {
  const vis = visibleLen(s);
  const pad = Math.max(0, width - vis);
  const left = Math.floor(pad / 2);
  return ' '.repeat(left) + s + ' '.repeat(pad - left);
}

// ════════════════════════════════════════════════════════════
// THEMES — 25 Cyberpunk-inspired themes
// ════════════════════════════════════════════════════════════

function ansi256(n) { return `${CSI}38;5;${n}m`; }
function ansi256Bg(n) { return `${CSI}48;5;${n}m`; }

const THEMES = {
  cyber: {
    name: 'Cyber', primary: ansi256(51), secondary: ansi256(201), accent: ansi256(46),
    warn: ansi256(226), error: ansi256(196), info: ansi256(75), success: ansi256(82),
    muted: ansi256(243), bold, reset, bannerGradient: [ansi256(51), ansi256(87), ansi256(123), ansi256(159)],
  },
  matrix: {
    name: 'Matrix', primary: ansi256(40), secondary: ansi256(34), accent: ansi256(46),
    warn: ansi256(226), error: ansi256(196), info: ansi256(34), success: ansi256(46),
    muted: ansi256(22), bold, reset, bannerGradient: [ansi256(22), ansi256(28), ansi256(34), ansi256(40)],
  },
  fire: {
    name: 'Fire', primary: ansi256(208), secondary: ansi256(196), accent: ansi256(226),
    warn: ansi256(208), error: ansi256(196), info: ansi256(214), success: ansi256(226),
    muted: ansi256(130), bold, reset, bannerGradient: [ansi256(52), ansi256(124), ansi256(202), ansi256(226)],
  },
  ocean: {
    name: 'Ocean', primary: ansi256(39), secondary: ansi256(75), accent: ansi256(117),
    warn: ansi256(226), error: ansi256(196), info: ansi256(69), success: ansi256(120),
    muted: ansi256(243), bold, reset, bannerGradient: [ansi256(17), ansi256(25), ansi256(33), ansi256(45)],
  },
  neon: {
    name: 'Neon', primary: ansi256(201), secondary: ansi256(51), accent: ansi256(46),
    warn: ansi256(226), error: ansi256(196), info: ansi256(141), success: ansi256(123),
    muted: ansi256(243), bold, reset, bannerGradient: [ansi256(201), ansi256(165), ansi256(129), ansi256(93)],
  },
  obsidian: {
    name: 'Obsidian', primary: ansi256(75), secondary: ansi256(176), accent: ansi256(82),
    warn: ansi256(226), error: ansi256(196), info: ansi256(51), success: ansi256(82),
    muted: ansi256(238), bold, reset, bannerGradient: [ansi256(234), ansi256(240), ansi256(248), ansi256(75)],
  },
  neonblast: {
    name: 'Neon Blast', primary: ansi256(201), secondary: ansi256(51), accent: ansi256(46),
    warn: ansi256(226), error: ansi256(196), info: ansi256(51), success: ansi256(46),
    muted: ansi256(93), bold, reset, bannerGradient: [ansi256(53), ansi256(129), ansi256(201), ansi256(51)],
  },
  forest: {
    name: 'Forest', primary: ansi256(107), secondary: ansi256(143), accent: ansi256(70),
    warn: ansi256(178), error: ansi256(131), info: ansi256(109), success: ansi256(70),
    muted: ansi256(240), bold, reset, bannerGradient: [ansi256(22), ansi256(28), ansi256(64), ansi256(70)],
  },
  amber: {
    name: 'Amber', primary: ansi256(214), secondary: ansi256(208), accent: ansi256(220),
    warn: ansi256(226), error: ansi256(196), info: ansi256(214), success: ansi256(220),
    muted: ansi256(238), bold, reset, bannerGradient: [ansi256(52), ansi256(130), ansi256(208), ansi256(226)],
  },
  polar: {
    name: 'Polar', primary: ansi256(25), secondary: ansi256(68), accent: ansi256(74),
    warn: ansi256(178), error: ansi256(131), info: ansi256(68), success: ansi256(72),
    muted: ansi256(248), bold, reset, bannerGradient: [ansi256(255), ansi256(252), ansi256(68), ansi256(25)],
  },
  rusted: {
    name: 'Rusted', primary: ansi256(173), secondary: ansi256(137), accent: ansi256(107),
    warn: ansi256(178), error: ansi256(131), info: ansi256(109), success: ansi256(107),
    muted: ansi256(240), bold, reset, bannerGradient: [ansi256(52), ansi256(94), ansi256(130), ansi256(173)],
  },
  cobalt: {
    name: 'Cobalt', primary: ansi256(69), secondary: ansi256(135), accent: ansi256(78),
    warn: ansi256(178), error: ansi256(161), info: ansi256(69), success: ansi256(78),
    muted: ansi256(238), bold, reset, bannerGradient: [ansi256(17), ansi256(24), ansi256(31), ansi256(69)],
  },
  sepia: {
    name: 'Sepia', primary: ansi256(130), secondary: ansi256(137), accent: ansi256(100),
    warn: ansi256(178), error: ansi256(131), info: ansi256(109), success: ansi256(100),
    muted: ansi256(248), bold, reset, bannerGradient: [ansi256(223), ansi256(180), ansi256(137), ansi256(94)],
  },
  midnight: {
    name: 'Midnight', primary: ansi256(99), secondary: ansi256(141), accent: ansi256(78),
    warn: ansi256(178), error: ansi256(161), info: ansi256(99), success: ansi256(78),
    muted: ansi256(238), bold, reset, bannerGradient: [ansi256(17), ansi256(54), ansi256(91), ansi256(99)],
  },
  solarflare: {
    name: 'Solar Flare', primary: ansi256(208), secondary: ansi256(196), accent: ansi256(226),
    warn: ansi256(220), error: ansi256(196), info: ansi256(208), success: ansi256(226),
    muted: ansi256(238), bold, reset, bannerGradient: [ansi256(52), ansi256(124), ansi256(196), ansi256(226)],
  },
  slate: {
    name: 'Slate', primary: ansi256(110), secondary: ansi256(139), accent: ansi256(108),
    warn: ansi256(178), error: ansi256(131), info: ansi256(110), success: ansi256(108),
    muted: ansi256(243), bold, reset, bannerGradient: [ansi256(236), ansi256(240), ansi256(247), ansi256(110)],
  },
  cherry: {
    name: 'Cherry', primary: ansi256(167), secondary: ansi256(210), accent: ansi256(149),
    warn: ansi256(178), error: ansi256(196), info: ansi256(167), success: ansi256(149),
    muted: ansi256(238), bold, reset, bannerGradient: [ansi256(52), ansi256(88), ansi256(167), ansi256(210)],
  },
  glacial: {
    name: 'Glacial', primary: ansi256(67), secondary: ansi256(110), accent: ansi256(74),
    warn: ansi256(178), error: ansi256(131), info: ansi256(67), success: ansi256(74),
    muted: ansi256(247), bold, reset, bannerGradient: [ansi256(255), ansi256(252), ansi256(116), ansi256(67)],
  },
  ember: {
    name: 'Ember', primary: ansi256(166), secondary: ansi256(130), accent: ansi256(108),
    warn: ansi256(178), error: ansi256(131), info: ansi256(166), success: ansi256(108),
    muted: ansi256(240), bold, reset, bannerGradient: [ansi256(52), ansi256(88), ansi256(130), ansi256(166)],
  },
  lavender: {
    name: 'Lavender', primary: ansi256(141), secondary: ansi256(175), accent: ansi256(114),
    warn: ansi256(178), error: ansi256(161), info: ansi256(141), success: ansi256(114),
    muted: ansi256(240), bold, reset, bannerGradient: [ansi256(53), ansi256(90), ansi256(135), ansi256(141)],
  },
  moss: {
    name: 'Moss', primary: ansi256(107), secondary: ansi256(143), accent: ansi256(70),
    warn: ansi256(178), error: ansi256(131), info: ansi256(107), success: ansi256(70),
    muted: ansi256(240), bold, reset, bannerGradient: [ansi256(22), ansi256(28), ansi256(64), ansi256(107)],
  },
  crimson: {
    name: 'Crimson', primary: ansi256(167), secondary: ansi256(196), accent: ansi256(149),
    warn: ansi256(226), error: ansi256(196), info: ansi256(167), success: ansi256(149),
    muted: ansi256(238), bold, reset, bannerGradient: [ansi256(52), ansi256(88), ansi256(124), ansi256(167)],
  },
  desert: {
    name: 'Desert', primary: ansi256(180), secondary: ansi256(173), accent: ansi256(143),
    warn: ansi256(220), error: ansi256(131), info: ansi256(180), success: ansi256(143),
    muted: ansi256(240), bold, reset, bannerGradient: [ansi256(58), ansi256(94), ansi256(130), ansi256(180)],
  },
  steel: {
    name: 'Steel', primary: ansi256(110), secondary: ansi256(146), accent: ansi256(108),
    warn: ansi256(178), error: ansi256(131), info: ansi256(110), success: ansi256(108),
    muted: ansi256(243), bold, reset, bannerGradient: [ansi256(236), ansi256(240), ansi256(247), ansi256(110)],
  },
  twilight: {
    name: 'Twilight', primary: ansi256(141), secondary: ansi256(175), accent: ansi256(107),
    warn: ansi256(178), error: ansi256(161), info: ansi256(141), success: ansi256(107),
    muted: ansi256(240), bold, reset, bannerGradient: [ansi256(17), ansi256(53), ansi256(89), ansi256(141)],
  },
};

// ════════════════════════════════════════════════════════════
// SPINNERS — 20 animated spinner styles
// ════════════════════════════════════════════════════════════

const SPINNERS = {
  dots: { frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'], interval: 80 },
  line: { frames: ['-', '\\', '|', '/'], interval: 100 },
  star: { frames: ['✶', '✸', '✹', '✺', '✹', '✸'], interval: 120 },
  bounce: { frames: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'], interval: 100 },
  clock: { frames: ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'], interval: 100 },
  arrow: { frames: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'], interval: 100 },
  box: { frames: ['◰', '◳', '◲', '◱'], interval: 150 },
  circle: { frames: ['◐', '◓', '◑', '◒'], interval: 120 },
  square: { frames: ['◳', '◲', '◱', '◰'], interval: 150 },
  triangle: { frames: ['◢', '◣', '◤', '◥'], interval: 120 },
  grow: { frames: ['⣀', '⣤', '⣶', '⣿', '⣶', '⣤'], interval: 100 },
  pulse: { frames: ['●', '◉', '◎', '○', '◎', '◉'], interval: 150 },
  neon: { frames: ['✦', '✧', '✦', '✧'], interval: 200 },
  binary: { frames: ['01001', '10110', '01001', '10110'], interval: 200 },
  wave: { frames: ['▁', '▃', '▄', '▅', '▆', '▇', '▆', '▅', '▄', '▃'], interval: 100 },
  earth: { frames: ['🌍', '🌎', '🌏'], interval: 200 },
  moon: { frames: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'], interval: 120 },
  cards: { frames: ['♠', '♣', '♥', '♦'], interval: 150 },
  glitch: { frames: ['▒', '█', '░', '▓', '▒', '░'], interval: 80 },
  cyber: { frames: ['╫', '╪', '╬', '╪'], interval: 120 },
};

// ════════════════════════════════════════════════════════════
// EASING FUNCTIONS
// ════════════════════════════════════════════════════════════

const easing = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  elastic: t => Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1,
};

// ════════════════════════════════════════════════════════════
// BOX DRAWING — Unicode borders with depth
// ════════════════════════════════════════════════════════════

const BOX = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', lt: '├', rt: '┤', tt: '┬', bt: '┴', cross: '┼' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', lt: '╠', rt: '╣', tt: '╦', bt: '╩', cross: '╬' },
  rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│', lt: '├', rt: '┤', tt: '┬', bt: '┴', cross: '┼' },
  heavy: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃', lt: '┣', rt: '┫', tt: '┳', bt: '┻', cross: '╋' },
  cyber: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', lt: '╠', rt: '╣', tt: '╦', bt: '╩', cross: '╬' },
};

// ════════════════════════════════════════════════════════════
// BANNER — ASCII art logo
// ════════════════════════════════════════════════════════════

const BANNER_ART = [
  '██╗   ██╗████████╗██╗  ██╗██╗   ██╗     ██████╗ ███████╗',
  '██║   ██║╚══██╔══╝██║  ██║╚██╗ ██╔╝     ██╔══██╗██╔════╝',
  '██║   ██║   ██║   ███████║ ╚████╔╝█████╗██║  ██║███████╗',
  '██║   ██║   ██║   ██╔══██║  ╚██╔╝ ╚════╝██║  ██║╚════██║',
  '╚██████╔╝   ██║   ██║  ██║   ██║        ██████╔╝███████║',
  ' ╚═════╝    ╚═╝   ╚═╝  ╚═╝   ╚═╝        ╚═════╝ ╚══════╝',
];

const SMALL_BANNER = [
  '╦ ╦╔╦╗╦ ╦╔═╗╦  ╦  ╔═╗╔═╗',
  '║ ║ ║ ╠═╣║╣ ║  ║  ║ ║╚═╗',
  '╚═╝ ╩ ╩ ╩╚═╝╩═╝╩═╝╚═╝╚═╝',
];

// ════════════════════════════════════════════════════════════
// TERMINAL RENDERER CLASS
// ════════════════════════════════════════════════════════════

class TerminalRenderer {
  constructor(opts = {}) {
    this.theme = THEMES[opts.theme] || THEMES.cyber;
    this.themeName = opts.theme || 'cyber';
    this.width = opts.width || process.stdout.columns || 80;
    this.height = opts.height || process.stdout.rows || 24;
    this._animations = new Map();
    this._animId = 0;
    this._panels = [];
    this._depth = 0;

    // Listen for resize
    if (process.stdout.isTTY) {
      process.stdout.on('resize', () => {
        this.width = process.stdout.columns;
        this.height = process.stdout.rows;
      });
    }
  }

  // ── Theme Management ─────────────────────────────────

  setTheme(name) {
    if (THEMES[name]) {
      this.theme = THEMES[name];
      this.themeName = name;
      return true;
    }
    return false;
  }

  listThemes() {
    return Object.entries(THEMES).map(([id, t]) => ({ id, name: t.name }));
  }

  // ── Gradient Text ────────────────────────────────────

  gradient(text, colors) {
    if (!colors || colors.length === 0) return text;
    const chars = text.split('');
    const result = [];
    for (let i = 0; i < chars.length; i++) {
      const colorIdx = Math.floor((i / chars.length) * (colors.length - 1));
      const nextIdx = Math.min(colorIdx + 1, colors.length - 1);
      const t = (i / chars.length) * (colors.length - 1) - colorIdx;
      // Just pick nearest color
      const color = t < 0.5 ? colors[colorIdx] : colors[nextIdx];
      result.push(color + chars[i] + reset);
    }
    return result.join('');
  }

  // ── Box Rendering ────────────────────────────────────

  renderBox(content, opts = {}) {
    const style = BOX[opts.style] || BOX.rounded;
    const color = opts.color || this.theme.primary;
    const title = opts.title || '';
    const padding = opts.padding || 1;
    const depth = opts.depth || 0;

    const lines = content.split('\n');
    const maxLen = Math.max(...lines.map(l => visibleLen(l)), visibleLen(title) + 4);
    const innerWidth = maxLen + padding * 2;
    const boxWidth = innerWidth + 2;

    const result = [];

    // Top border with optional title
    if (title) {
      const titleStr = ` ${title} `;
      const leftPad = Math.max(0, Math.floor((boxWidth - visibleLen(titleStr) - 2) / 2));
      const rightPad = boxWidth - visibleLen(titleStr) - 2 - leftPad;
      result.push(color + style.tl + style.h.repeat(leftPad) + reset +
                  this.theme.secondary + this.theme.bold + titleStr + reset +
                  color + style.h.repeat(rightPad) + style.tr + reset);
    } else {
      result.push(color + style.tl + style.h.repeat(innerWidth) + style.tr + reset);
    }

    // Padding rows
    for (let p = 0; p < padding; p++) {
      result.push(color + style.v + reset + ' '.repeat(innerWidth) + color + style.v + reset);
    }

    // Content rows
    for (const line of lines) {
      const padded = padRight(' '.repeat(padding) + line, innerWidth);
      result.push(color + style.v + reset + padded + color + style.v + reset);
    }

    // Padding rows
    for (let p = 0; p < padding; p++) {
      result.push(color + style.v + reset + ' '.repeat(innerWidth) + color + style.v + reset);
    }

    // Bottom border
    result.push(color + style.bl + style.h.repeat(innerWidth) + style.br + reset);

    // Add depth shadow
    if (depth > 0) {
      const shadow = this.theme.muted;
      const shadowChar = '▓';
      result.push(shadow + ' ' + shadowChar.repeat(innerWidth + 1) + reset);
    }

    return result.join('\n');
  }

  // ── 3D Panel with Depth ──────────────────────────────

  render3DPanel(content, opts = {}) {
    const depthLevel = opts.depth || 2;
    const layers = [];

    // Shadow layers
    for (let d = depthLevel; d > 0; d--) {
      const offset = ' '.repeat(d);
      const shadowLine = (r) => {
        const dimFactor = d / (depthLevel + 1);
        const shadowColor = `${CSI}38;5;236m`;
        return offset + shadowLine;
      };
      layers.push({ offset: d, opacity: 0.2 * d });
    }

    // Main panel
    const mainPanel = this.renderBox(content, { ...opts, depth: 0 });
    const lines = mainPanel.split('\n');
    const result = [];

    // Add depth shadows
    for (let d = depthLevel; d > 0; d--) {
      for (const line of lines) {
        const indent = ' '.repeat(d);
        const shadow = `${CSI}38;5;${232 + d}m`;
        result.push(indent + shadow + '▓'.repeat(visibleLen(line)) + reset);
      }
    }

    // Main content
    for (const line of lines) {
      result.push(line);
    }

    return result.join('\n');
  }

  // ── Banner Rendering ─────────────────────────────────

  renderBanner(version) {
    const g = this.theme.bannerGradient;
    const lines = [];
    lines.push('');
    for (let i = 0; i < BANNER_ART.length; i++) {
      const colorIdx = Math.floor((i / BANNER_ART.length) * g.length);
      lines.push(g[Math.min(colorIdx, g.length - 1)] + BANNER_ART[i] + reset);
    }
    lines.push('');
    lines.push(padCenter(this.theme.primary + 'Terminal-Native AI Operating System' + reset, this.width));
    lines.push(padCenter(this.theme.muted + `v${version || '2.0.0'} ─ Type /help for commands` + reset, this.width));
    lines.push('');
    return lines.join('\n');
  }

  renderSmallBanner(version) {
    const g = this.theme.bannerGradient;
    const lines = [];
    for (let i = 0; i < SMALL_BANNER.length; i++) {
      const colorIdx = Math.floor((i / SMALL_BANNER.length) * g.length);
      lines.push(g[Math.min(colorIdx, g.length - 1)] + SMALL_BANNER[i] + reset);
    }
    lines.push(this.theme.muted + `v${version || '2.0.0'} ─ /help` + reset);
    return lines.join('\n');
  }

  // ── Status Bar ───────────────────────────────────────

  renderStatusBar(state) {
    const { user, theme, uptime, modules, model } = state;
    const uptimeStr = uptime ? this.formatUptime(uptime) : '0m';
    const left = ` ⚡ ${this.theme.primary}${user || 'guest'}${reset} ${this.theme.muted}│${reset} ${this.theme.secondary}${theme}${reset} ${this.theme.muted}│${reset} ${this.theme.info}${model || 'local'}${reset}`;
    const right = `${this.theme.muted}modules:${modules || 0} │ ${uptimeStr}${reset} `;
    const used = visibleLen(left) + visibleLen(right);
    const fill = Math.max(0, this.width - used);
    return this.theme.muted + '─'.repeat(this.width) + '\n' + left + ' '.repeat(fill) + right + reset;
  }

  // ── Progress Bar ─────────────────────────────────────

  progressBar(value, max, opts = {}) {
    const width = opts.width || 30;
    const style = opts.style || 'blocks';
    const label = opts.label || '';

    const pct = Math.min(1, Math.max(0, value / max));
    const filled = Math.round(pct * width);
    const empty = width - filled;

    let bar;
    switch (style) {
      case 'blocks':
        bar = this.theme.accent + '█'.repeat(filled) + this.theme.muted + '░'.repeat(empty) + reset;
        break;
      case 'dots':
        bar = this.theme.accent + '●'.repeat(filled) + this.theme.muted + '○'.repeat(empty) + reset;
        break;
      case 'arrows':
        bar = this.theme.accent + '▸'.repeat(filled) + this.theme.muted + '▹'.repeat(empty) + reset;
        break;
      case 'gradient': {
        const g = this.theme.bannerGradient;
        const grad = [];
        for (let i = 0; i < filled; i++) {
          const ci = Math.floor((i / width) * (g.length - 1));
          grad.push(g[ci] + '█');
        }
        bar = grad.join('') + this.theme.muted + '░'.repeat(empty) + reset;
        break;
      }
      default:
        bar = this.theme.accent + '#'.repeat(filled) + this.theme.muted + '.'.repeat(empty) + reset;
    }

    const pctStr = `${this.theme.bold}${Math.round(pct * 100)}%${reset}`;
    return label ? `${label} ${bar} ${pctStr}` : `${bar} ${pctStr}`;
  }

  // ── Spinner ──────────────────────────────────────────

  createSpinner(text, style = 'dots') {
    const spinner = SPINNERS[style] || SPINNERS.dots;
    let frame = 0;
    const id = ++this._animId;

    const tick = () => {
      const f = spinner.frames[frame % spinner.frames.length];
      frame++;
      return `${this.theme.accent}${f}${reset} ${text}`;
    };

    return { id, tick, interval: spinner.interval };
  }

  // ── Animated Spinner (returns interval) ──────────────

  startSpinner(text, style = 'dots', callback) {
    const spinner = this.createSpinner(text, style);
    const interval = setInterval(() => {
      callback(spinner.tick());
    }, spinner.interval);
    this._animations.set(spinner.id, interval);
    return { id: spinner.id, stop: () => { clearInterval(interval); this._animations.delete(spinner.id); } };
  }

  // ── Gauge / Meter ────────────────────────────────────

  gauge(value, max, opts = {}) {
    const width = opts.width || 20;
    const label = opts.label || '';
    const thresholds = opts.thresholds || { low: 0.3, mid: 0.7 };
    const pct = value / max;

    let color;
    if (pct < thresholds.low) color = this.theme.error;
    else if (pct < thresholds.mid) color = this.theme.warn;
    else color = this.theme.success;

    const filled = Math.round(pct * width);
    const empty = width - filled;
    const bar = color + '━'.repeat(filled) + this.theme.muted + '─'.repeat(empty) + reset;
    const indicator = color + '◆' + reset;

    return `${label} ${bar} ${color}${Math.round(pct * 100)}%${reset}`;
  }

  // ── Table Renderer ───────────────────────────────────

  renderTable(headers, rows, opts = {}) {
    const style = BOX[opts.style] || BOX.rounded;
    const color = opts.color || this.theme.primary;

    // Calculate column widths
    const colWidths = headers.map((h, i) => {
      const headerLen = visibleLen(h);
      const maxRowLen = rows.reduce((max, row) => Math.max(max, visibleLen(String(row[i] || ''))), 0);
      return Math.max(headerLen, maxRowLen) + 2;
    });

    const result = [];
    const totalWidth = colWidths.reduce((s, w) => s + w, 0) + colWidths.length + 1;

    // Top border
    result.push(color + style.tl + colWidths.map(w => style.h.repeat(w)).join(style.tt) + style.tr + reset);

    // Headers
    const headerRow = headers.map((h, i) => padCenter(this.theme.bold + h + reset, colWidths[i]));
    result.push(color + style.v + reset + headerRow.join(color + style.v + reset) + color + style.v + reset);

    // Header separator
    result.push(color + style.lt + colWidths.map(w => style.h.repeat(w)).join(style.cross) + style.rt + reset);

    // Rows
    for (const row of rows) {
      const cells = row.map((cell, i) => {
        const val = String(cell || '');
        return ' ' + padRight(val, colWidths[i] - 1);
      });
      result.push(color + style.v + reset + cells.join(color + style.v + reset) + color + style.v + reset);
    }

    // Bottom border
    result.push(color + style.bl + colWidths.map(w => style.h.repeat(w)).join(style.bt) + style.br + reset);

    return result.join('\n');
  }

  // ── Bar Chart ────────────────────────────────────────

  renderBarChart(data, opts = {}) {
    const width = opts.width || 40;
    const maxVal = Math.max(...data.map(d => d.value));
    const maxLabel = Math.max(...data.map(d => visibleLen(d.label)));
    const g = this.theme.bannerGradient;

    const result = [];
    for (const item of data) {
      const barLen = Math.round((item.value / maxVal) * width);
      const label = padRight(item.label, maxLabel + 1);
      let bar = '';
      for (let i = 0; i < barLen; i++) {
        const ci = Math.floor((i / width) * (g.length - 1));
        bar += g[ci] + '█';
      }
      result.push(`${this.theme.muted}${label}${reset} ${bar}${reset} ${this.theme.bold}${item.value}${reset}`);
    }
    return result.join('\n');
  }

  // ── Divider / Separator ──────────────────────────────

  divider(text, opts = {}) {
    const color = opts.color || this.theme.muted;
    const char = opts.char || '─';
    if (text) {
      const textLen = visibleLen(text);
      const pad = Math.max(0, this.width - textLen - 4);
      const left = Math.floor(pad / 2);
      const right = pad - left;
      return color + char.repeat(left) + ` ${text} ` + char.repeat(right) + reset;
    }
    return color + char.repeat(this.width) + reset;
  }

  // ── Colorize Helper ──────────────────────────────────

  colorize(text, colorName) {
    const color = this.theme[colorName] || this.theme.primary;
    return color + text + reset;
  }

  // ── Animation: Wave Effect ───────────────────────────

  waveEffect(text, frame) {
    const chars = text.split('');
    const result = [];
    for (let i = 0; i < chars.length; i++) {
      const offset = Math.sin((i + frame) * 0.3) * 0.5 + 0.5;
      const colorIdx = Math.floor(offset * (this.theme.bannerGradient.length - 1));
      result.push(this.theme.bannerGradient[colorIdx] + chars[i] + reset);
    }
    return result.join('');
  }

  // ── Animation: Glitch Effect ─────────────────────────

  glitchEffect(text, intensity = 0.1) {
    const glitchChars = '░▒▓█╔╗╚╝║═';
    const chars = text.split('');
    return chars.map(c => {
      if (Math.random() < intensity && c !== ' ') {
        return this.theme.error + glitchChars[Math.floor(Math.random() * glitchChars.length)] + reset;
      }
      return this.theme.primary + c + reset;
    }).join('');
  }

  // ── Boot Sequence ────────────────────────────────────

  async bootSequence(version, callback) {
    const steps = [
      { text: 'Initializing kernel...', delay: 200, icon: '⚡' },
      { text: 'Loading theme engine...', delay: 150, icon: '🎨' },
      { text: 'Authenticating user...', delay: 180, icon: '🔐' },
      { text: 'Loading AI providers...', delay: 200, icon: '🤖' },
      { text: 'Initializing skill engine...', delay: 150, icon: '⚙️' },
      { text: 'Loading memory subsystem...', delay: 120, icon: '🧠' },
      { text: 'Starting command router...', delay: 100, icon: '📡' },
      { text: 'Connecting to local storage...', delay: 150, icon: '💾' },
      { text: 'Initializing UI engine...', delay: 200, icon: '🖥️' },
      { text: 'System ready.', delay: 100, icon: '✅' },
    ];

    const result = [];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.delay));
      const line = `${this.theme.accent}${step.icon}${reset} ${step.text}`;
      result.push(line);
      if (callback) callback(line, result.length, steps.length);
    }

    // Progress bar animation
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 30));
      const bar = this.progressBar(i, 100, { style: 'gradient', width: 40, label: '  Booting' });
      if (callback) callback(bar, -1, -1);
    }

    return result;
  }

  // ── Particle Explosion Effect ────────────────────────

  particleBurst(centerX, centerY, count, frame) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = frame * 2;
      const x = Math.round(centerX + Math.cos(angle) * radius);
      const y = Math.round(centerY + Math.sin(angle) * radius * 0.5);
      if (x > 0 && y > 0 && x < this.width && y < this.height) {
        const colorIdx = Math.floor((i / count) * this.theme.bannerGradient.length);
        particles.push({ x, y, char: '●', color: this.theme.bannerGradient[colorIdx] });
      }
    }
    return particles;
  }

  // ── HUD Card (System Status) ─────────────────────────

  renderHudCard(state) {
    const lines = [];
    const w = Math.min(60, this.width - 4);

    lines.push(this.theme.bannerGradient[0] + '╔' + '═'.repeat(w - 2) + '╗' + reset);
    lines.push(this.theme.bannerGradient[0] + '║' + reset +
               padCenter(this.theme.bold + '⚡ SYSTEM STATUS ⚡' + reset, w - 2) +
               this.theme.bannerGradient[0] + '║' + reset);
    lines.push(this.theme.bannerGradient[0] + '╠' + '═'.repeat(w - 2) + '╣' + reset);

    const items = [
      ['User', state.user || 'guest'],
      ['Theme', state.theme || 'cyber'],
      ['Model', state.model || 'local'],
      ['Uptime', this.formatUptime(state.uptime || 0)],
      ['Modules', String(state.modules || 0)],
      ['Memory', `${state.memoryUsed || '0'}MB / ${state.memoryTotal || '0'}MB`],
    ];

    for (const [key, value] of items) {
      const line = ` ${this.theme.muted}${key}:${reset} ${this.theme.primary}${value}${reset}`;
      lines.push(this.theme.bannerGradient[0] + '║' + reset +
                 padRight(line, w - 2) +
                 this.theme.bannerGradient[0] + '║' + reset);
    }

    lines.push(this.theme.bannerGradient[0] + '╚' + '═'.repeat(w - 2) + '╝' + reset);
    return lines.join('\n');
  }

  // ── Input Prompt ─────────────────────────────────────

  renderPrompt(user, theme) {
    const t = theme || this.theme;
    return `${t.accent}❯${reset} `;
  }

  // ── Chat Message Bubble ──────────────────────────────

  renderChatMessage(role, content, opts = {}) {
    const isUser = role === 'user';
    const color = isUser ? this.theme.info : this.theme.accent;
    const icon = isUser ? '👤' : '🤖';
    const label = isUser ? (opts.user || 'You') : (opts.model || 'Uthy');
    const w = Math.min(70, this.width - 6);

    const lines = [];
    lines.push(`${color}${icon} ${this.theme.bold}${label}${reset} ${this.theme.muted}${this._timeStr()}${reset}`);
    lines.push(this.theme.muted + '─'.repeat(Math.min(w, visibleLen(content) + 2)) + reset);

    // Word wrap
    const words = content.split(' ');
    let line = '';
    for (const word of words) {
      if (visibleLen(line + ' ' + word) > w) {
        lines.push(color + line + reset);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) lines.push(color + line + reset);
    lines.push('');
    return lines.join('\n');
  }

  // ── Help Table ───────────────────────────────────────

  renderHelp(commands) {
    const categories = {};
    for (const cmd of commands) {
      const cat = cmd.category || 'general';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd);
    }

    const lines = [];
    lines.push('');
    lines.push(this.gradient('  ╔══════════════════════════════════════════════════════════╗', this.theme.bannerGradient));
    lines.push(this.gradient('  ║              UTHY OS — COMMAND REFERENCE                ║', this.theme.bannerGradient));
    lines.push(this.gradient('  ╚══════════════════════════════════════════════════════════╝', this.theme.bannerGradient));
    lines.push('');

    for (const [cat, cmds] of Object.entries(categories)) {
      lines.push(`  ${this.theme.secondary}${this.theme.bold}${cat.toUpperCase()}${reset}`);
      lines.push(this.theme.muted + '  ' + '─'.repeat(50) + reset);
      for (const cmd of cmds) {
        const name = padRight(`/${cmd.name}`, 25);
        lines.push(`    ${this.theme.primary}${name}${reset} ${this.theme.muted}${cmd.description || ''}${reset}`);
        if (cmd.aliases && cmd.aliases.length) {
          lines.push(`    ${this.theme.muted}  aliases: ${cmd.aliases.join(', ')}${reset}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ── Animated Title Bar ───────────────────────────────

  renderTitleBar(text, frame) {
    const g = this.theme.bannerGradient;
    const bar = this.gradient(text, g);
    const w = this.width;
    const line = this.theme.muted + '═'.repeat(w) + reset;
    return `${line}\n${bar}\n${line}`;
  }

  // ── Utility: Format Uptime ───────────────────────────

  formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  _timeStr() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  // ── Cleanup ──────────────────────────────────────────

  destroy() {
    for (const [, interval] of this._animations) {
      clearInterval(interval);
    }
    this._animations.clear();
  }
}

module.exports = { TerminalRenderer, THEMES, SPINNERS, BOX, easing, stripAnsi };
