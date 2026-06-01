/**
 * AAST Banner, Themes & UI Rendering
 * Provides colorful ASCII art banners, themed output, and terminal UI helpers.
 */

const THEMES = {
  cyber: {
    name: 'Cyber',
    primary: '\x1b[38;5;51m',     // cyan
    secondary: '\x1b[38;5;201m',  // magenta
    accent: '\x1b[38;5;46m',      // green
    warn: '\x1b[38;5;226m',       // yellow
    error: '\x1b[38;5;196m',      // red
    info: '\x1b[38;5;75m',        // blue
    success: '\x1b[38;5;82m',     // bright green
    muted: '\x1b[38;5;243m',      // gray
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;51m', '\x1b[38;5;87m', '\x1b[38;5;123m', '\x1b[38;5;159m'],
  },
  matrix: {
    name: 'Matrix',
    primary: '\x1b[32m',
    secondary: '\x1b[38;5;40m',
    accent: '\x1b[38;5;46m',
    warn: '\x1b[38;5;226m',
    error: '\x1b[38;5;196m',
    info: '\x1b[38;5;34m',
    success: '\x1b[38;5;46m',
    muted: '\x1b[38;5;22m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;22m', '\x1b[32m', '\x1b[38;5;40m', '\x1b[38;5;46m'],
  },
  fire: {
    name: 'Fire',
    primary: '\x1b[38;5;208m',    // orange
    secondary: '\x1b[38;5;196m',  // red
    accent: '\x1b[38;5;226m',     // yellow
    warn: '\x1b[38;5;208m',
    error: '\x1b[38;5;196m',
    info: '\x1b[38;5;214m',
    success: '\x1b[38;5;226m',
    muted: '\x1b[38;5;130m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;196m', '\x1b[38;5;208m', '\x1b[38;5;214m', '\x1b[38;5;226m'],
  },
  ocean: {
    name: 'Ocean',
    primary: '\x1b[38;5;39m',
    secondary: '\x1b[38;5;75m',
    accent: '\x1b[38;5;117m',
    warn: '\x1b[38;5;226m',
    error: '\x1b[38;5;196m',
    info: '\x1b[38;5;69m',
    success: '\x1b[38;5;120m',
    muted: '\x1b[38;5;243m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;17m', '\x1b[38;5;25m', '\x1b[38;5;33m', '\x1b[38;5;45m'],
  },
  neon: {
    name: 'Neon',
    primary: '\x1b[38;5;201m',    // pink
    secondary: '\x1b[38;5;51m',   // cyan
    accent: '\x1b[38;5;46m',      // green
    warn: '\x1b[38;5;226m',
    error: '\x1b[38;5;196m',
    info: '\x1b[38;5;141m',
    success: '\x1b[38;5;123m',
    muted: '\x1b[38;5;243m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;201m', '\x1b[38;5;165m', '\x1b[38;5;129m', '\x1b[38;5;93m'],
  },
};

const BANNER = `
\x1b[1m\x1b[38;5;51m    _   ___  ___   ___ _    ___  ___ ___ ___ _____ 
\x1b[38;5;87m   /_\\ | _ \\/ __| / __| |  / _ \\/ __| __/ __|_   _|
\x1b[38;5;123m  / _ \\|   /\\__ \\| (__| | | (_) \\__ \\ _| (__  | |  
\x1b[38;5;159m /_/ \\_\\_|_\\|___/ \\___|_|  \\___/|___/___\\___| |_|  \x1b[0m
`;

const SMALL_BANNER = `\x1b[1m\x1b[38;5;51m  ╔══════════════════════════════════════╗
  ║   AAST — Agentic Skill Toolkit      ║
  ╚══════════════════════════════════════╝\x1b[0m`;

function renderBanner(theme, compact = false) {
  const t = theme || THEMES.cyber;
  const banner = compact ? SMALL_BANNER : BANNER;
  
  if (!compact) {
    // Color each line with gradient
    const lines = banner.split('\n');
    return lines.map((line, i) => {
      const color = t.bannerGradient[i % t.bannerGradient.length];
      return `${color}${line}${t.reset}`;
    }).join('\n');
  }
  return banner;
}

function renderBox(lines, theme, title) {
  const t = theme || THEMES.cyber;
  const maxLen = Math.max(...lines.map(l => stripAnsi(l).length), (title || '').length + 4);
  const w = maxLen + 4;
  const top = title
    ? `${t.primary}┌─${'─'.repeat(Math.floor((w - title.length - 4) / 2))}─ ${t.bold}${t.secondary}${title}${t.reset}${t.primary} ─${'─'.repeat(Math.ceil((w - title.length - 4) / 2))}─┐${t.reset}`
    : `${t.primary}┌${'─'.repeat(w)}┐${t.reset}`;
  const bot = `${t.primary}└${'─'.repeat(w)}┘${t.reset}`;
  const body = lines.map(l => {
    const stripped = stripAnsi(l);
    const pad = maxLen - stripped.length;
    return `${t.primary}│${t.reset}  ${l}${' '.repeat(pad)}  ${t.primary}│${t.reset}`;
  });
  return [top, ...body, bot].join('\n');
}

function renderMenu(items, theme, title) {
  const t = theme || THEMES.cyber;
  const lines = items.map((item, i) => {
    const num = `${t.secondary}${t.bold}[${i + 1}]${t.reset}`;
    const label = `${t.primary}${item.label}${t.reset}`;
    const desc = item.desc ? ` ${t.muted}— ${item.desc}${t.reset}` : '';
    return `  ${num} ${label}${desc}`;
  });
  return renderBox(lines, theme, title || 'MENU');
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function colorize(text, color, theme) {
  const t = theme || THEMES.cyber;
  return `${t[color] || ''}${text}${t.reset}`;
}

function progressBar(value, max, width = 30, theme) {
  const t = theme || THEMES.cyber;
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  const bar = `${t.success}${'█'.repeat(filled)}${t.muted}${'░'.repeat(empty)}${t.reset}`;
  return `[${bar}] ${value}/${max}`;
}

function spinner(text, theme) {
  const t = theme || THEMES.cyber;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${t.secondary}${frames[i++ % frames.length]}${t.reset} ${text}`);
  }, 80);
  return () => { clearInterval(id); process.stdout.write('\r' + ' '.repeat(text.length + 4) + '\r'); };
}

function divider(theme, char = '═', width = 60) {
  const t = theme || THEMES.cyber;
  return `${t.muted}${char.repeat(width)}${t.reset}`;
}

module.exports = {
  THEMES,
  BANNER,
  SMALL_BANNER,
  renderBanner,
  renderBox,
  renderMenu,
  colorize,
  progressBar,
  spinner,
  divider,
  stripAnsi,
};
