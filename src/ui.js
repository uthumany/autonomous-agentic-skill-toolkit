/**
 * UTHY AGENTIC OS — Banner, Themes & UI Rendering
 * Provides colorful ASCII art banners, themed output, cyberpunk HUD, and terminal UI helpers.
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
  obsidian: {
    name: 'Obsidian',
    primary: '\x1b[38;5;75m',
    secondary: '\x1b[38;5;176m',
    accent: '\x1b[38;5;108m',
    warn: '\x1b[38;5;179m',
    error: '\x1b[38;5;167m',
    info: '\x1b[38;5;66m',
    success: '\x1b[38;5;108m',
    muted: '\x1b[38;5;236m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;75m', '\x1b[38;5;176m', '\x1b[38;5;108m', '\x1b[38;5;73m'],
  },
  neonblast: {
    name: 'Neon Blast',
    primary: '\x1b[38;5;81m',
    secondary: '\x1b[38;5;207m',
    accent: '\x1b[38;5;85m',
    warn: '\x1b[38;5;220m',
    error: '\x1b[38;5;204m',
    info: '\x1b[38;5;51m',
    success: '\x1b[38;5;85m',
    muted: '\x1b[38;5;238m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;207m', '\x1b[38;5;81m', '\x1b[38;5;85m', '\x1b[38;5;220m'],
  },
  forest: {
    name: 'Forest',
    primary: '\x1b[38;5;109m',
    secondary: '\x1b[38;5;139m',
    accent: '\x1b[38;5;144m',
    warn: '\x1b[38;5;143m',
    error: '\x1b[38;5;137m',
    info: '\x1b[38;5;72m',
    success: '\x1b[38;5;144m',
    muted: '\x1b[38;5;238m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;72m', '\x1b[38;5;144m', '\x1b[38;5;109m', '\x1b[38;5;139m'],
  },
  amber: {
    name: 'Amber',
    primary: '\x1b[38;5;221m',
    secondary: '\x1b[38;5;209m',
    accent: '\x1b[38;5;220m',
    warn: '\x1b[38;5;220m',
    error: '\x1b[38;5;202m',
    info: '\x1b[38;5;214m',
    success: '\x1b[38;5;221m',
    muted: '\x1b[38;5;236m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;202m', '\x1b[38;5;214m', '\x1b[38;5;220m', '\x1b[38;5;221m'],
  },
  polar: {
    name: 'Polar',
    primary: '\x1b[38;5;67m',
    secondary: '\x1b[38;5;103m',
    accent: '\x1b[38;5;72m',
    warn: '\x1b[38;5;137m',
    error: '\x1b[38;5;131m',
    info: '\x1b[38;5;67m',
    success: '\x1b[38;5;72m',
    muted: '\x1b[38;5;249m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;61m', '\x1b[38;5;67m', '\x1b[38;5;109m', '\x1b[38;5;72m'],
  },
  rusted: {
    name: 'Rusted',
    primary: '\x1b[38;5;103m',
    secondary: '\x1b[38;5;139m',
    accent: '\x1b[38;5;108m',
    warn: '\x1b[38;5;173m',
    error: '\x1b[38;5;131m',
    info: '\x1b[38;5;66m',
    success: '\x1b[38;5;108m',
    muted: '\x1b[38;5;236m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;131m', '\x1b[38;5;173m', '\x1b[38;5;108m', '\x1b[38;5;103m'],
  },
  cobalt: {
    name: 'Cobalt',
    primary: '\x1b[38;5;68m',
    secondary: '\x1b[38;5;140m',
    accent: '\x1b[38;5;115m',
    warn: '\x1b[38;5;179m',
    error: '\x1b[38;5;167m',
    info: '\x1b[38;5;74m',
    success: '\x1b[38;5;115m',
    muted: '\x1b[38;5;237m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;24m', '\x1b[38;5;68m', '\x1b[38;5;140m', '\x1b[38;5;74m'],
  },
  sepia: {
    name: 'Sepia',
    primary: '\x1b[38;5;60m',
    secondary: '\x1b[38;5;96m',
    accent: '\x1b[38;5;65m',
    warn: '\x1b[38;5;94m',
    error: '\x1b[38;5;131m',
    info: '\x1b[38;5;66m',
    success: '\x1b[38;5;65m',
    muted: '\x1b[38;5;181m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;131m', '\x1b[38;5;94m', '\x1b[38;5;65m', '\x1b[38;5;60m'],
  },
  midnight: {
    name: 'Midnight',
    primary: '\x1b[38;5;111m',
    secondary: '\x1b[38;5;176m',
    accent: '\x1b[38;5;114m',
    warn: '\x1b[38;5;179m',
    error: '\x1b[38;5;168m',
    info: '\x1b[38;5;73m',
    success: '\x1b[38;5;114m',
    muted: '\x1b[38;5;237m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;68m', '\x1b[38;5;111m', '\x1b[38;5;176m', '\x1b[38;5;116m'],
  },
  solarflare: {
    name: 'Solar Flare',
    primary: '\x1b[38;5;69m',
    secondary: '\x1b[38;5;170m',
    accent: '\x1b[38;5;179m',
    warn: '\x1b[38;5;214m',
    error: '\x1b[38;5;202m',
    info: '\x1b[38;5;38m',
    success: '\x1b[38;5;179m',
    muted: '\x1b[38;5;236m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;202m', '\x1b[38;5;214m', '\x1b[38;5;69m', '\x1b[38;5;170m'],
  },
  slate: {
    name: 'Slate',
    primary: '\x1b[38;5;110m',
    secondary: '\x1b[38;5;176m',
    accent: '\x1b[38;5;150m',
    warn: '\x1b[38;5;180m',
    error: '\x1b[38;5;174m',
    info: '\x1b[38;5;109m',
    success: '\x1b[38;5;150m',
    muted: '\x1b[38;5;238m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;104m', '\x1b[38;5;110m', '\x1b[38;5;140m', '\x1b[38;5;176m'],
  },
  cherry: {
    name: 'Cherry',
    primary: '\x1b[38;5;111m',
    secondary: '\x1b[38;5;176m',
    accent: '\x1b[38;5;150m',
    warn: '\x1b[38;5;179m',
    error: '\x1b[38;5;167m',
    info: '\x1b[38;5;73m',
    success: '\x1b[38;5;150m',
    muted: '\x1b[38;5;236m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;167m', '\x1b[38;5;133m', '\x1b[38;5;111m', '\x1b[38;5;116m'],
  },
  glacial: {
    name: 'Glacial',
    primary: '\x1b[38;5;68m',
    secondary: '\x1b[38;5;103m',
    accent: '\x1b[38;5;72m',
    warn: '\x1b[38;5;137m',
    error: '\x1b[38;5;131m',
    info: '\x1b[38;5;67m',
    success: '\x1b[38;5;72m',
    muted: '\x1b[38;5;109m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;61m', '\x1b[38;5;68m', '\x1b[38;5;72m', '\x1b[38;5;73m'],
  },
  ember: {
    name: 'Ember',
    primary: '\x1b[38;5;103m',
    secondary: '\x1b[38;5;139m',
    accent: '\x1b[38;5;108m',
    warn: '\x1b[38;5;137m',
    error: '\x1b[38;5;131m',
    info: '\x1b[38;5;66m',
    success: '\x1b[38;5;108m',
    muted: '\x1b[38;5;236m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;131m', '\x1b[38;5;137m', '\x1b[38;5;108m', '\x1b[38;5;103m'],
  },
  lavender: {
    name: 'Lavender',
    primary: '\x1b[38;5;111m',
    secondary: '\x1b[38;5;177m',
    accent: '\x1b[38;5;150m',
    warn: '\x1b[38;5;179m',
    error: '\x1b[38;5;168m',
    info: '\x1b[38;5;109m',
    success: '\x1b[38;5;150m',
    muted: '\x1b[38;5;239m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;140m', '\x1b[38;5;177m', '\x1b[38;5;111m', '\x1b[38;5;116m'],
  },
  moss: {
    name: 'Moss',
    primary: '\x1b[38;5;103m',
    secondary: '\x1b[38;5;139m',
    accent: '\x1b[38;5;108m',
    warn: '\x1b[38;5;143m',
    error: '\x1b[38;5;131m',
    info: '\x1b[38;5;66m',
    success: '\x1b[38;5;108m',
    muted: '\x1b[38;5;237m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;66m', '\x1b[38;5;107m', '\x1b[38;5;108m', '\x1b[38;5;139m'],
  },
  crimson: {
    name: 'Crimson',
    primary: '\x1b[38;5;105m',
    secondary: '\x1b[38;5;176m',
    accent: '\x1b[38;5;150m',
    warn: '\x1b[38;5;179m',
    error: '\x1b[38;5;167m',
    info: '\x1b[38;5;73m',
    success: '\x1b[38;5;150m',
    muted: '\x1b[38;5;236m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;167m', '\x1b[38;5;133m', '\x1b[38;5;105m', '\x1b[38;5;116m'],
  },
  desert: {
    name: 'Desert',
    primary: '\x1b[38;5;103m',
    secondary: '\x1b[38;5;139m',
    accent: '\x1b[38;5;144m',
    warn: '\x1b[38;5;179m',
    error: '\x1b[38;5;131m',
    info: '\x1b[38;5;66m',
    success: '\x1b[38;5;144m',
    muted: '\x1b[38;5;237m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;131m', '\x1b[38;5;179m', '\x1b[38;5;107m', '\x1b[38;5;103m'],
  },
  steel: {
    name: 'Steel',
    primary: '\x1b[38;5;104m',
    secondary: '\x1b[38;5;139m',
    accent: '\x1b[38;5;108m',
    warn: '\x1b[38;5;137m',
    error: '\x1b[38;5;131m',
    info: '\x1b[38;5;66m',
    success: '\x1b[38;5;108m',
    muted: '\x1b[38;5;237m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;67m', '\x1b[38;5;104m', '\x1b[38;5;139m', '\x1b[38;5;109m'],
  },
  twilight: {
    name: 'Twilight',
    primary: '\x1b[38;5;104m',
    secondary: '\x1b[38;5;176m',
    accent: '\x1b[38;5;114m',
    warn: '\x1b[38;5;143m',
    error: '\x1b[38;5;132m',
    info: '\x1b[38;5;66m',
    success: '\x1b[38;5;114m',
    muted: '\x1b[38;5;237m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
    bannerGradient: ['\x1b[38;5;67m', '\x1b[38;5;104m', '\x1b[38;5;176m', '\x1b[38;5;109m'],
  },
};

// ═══════════════════════════════════════════════════════════
// ASCII ART BANNER — 3D Block "UTHY AGENTIC OS"
// Top-left positioned with gradient + 3D shadow
// ═══════════════════════════════════════════════════════════

const BANNER_LINES = [
  // ── UTHY in large block (6 rows) ──
  ' ██╗   ██╗████████╗██╗  ██╗██╗   ██╗       ',
  ' ██║   ██║╚══██╔══╝██║  ██║╚██╗ ██╔╝       ',
  ' ██║   ██║   ██║   ███████║ ╚████╔╝        ',
  ' ██║   ██║   ██║   ██╔══██║  ╚██╔╝         ',
  ' ╚██████╔╝   ██║   ██║  ██║   ██║          ',
  '  ╚═════╝    ╚═╝   ╚═╝  ╚═╝   ╚═╝          ',
  // ── AGENTIC OS in medium block (3 rows) ──
  ' ▄▀▀▄ ▄▀▀▀▄ ▄▀▀ ▄▀▄ ▀█▀  █  ▄▀▀▄  ▄▀▄ ▄▀▀  ',
  ' █  █ █▄▄▀▀ █▄▄ █▄█  █   █  █     █▄█ ▄▄█  ',
  ' ▀▀▀▀ ▀ ▀▀▀ ▀▀▀ ▀ ▀  ▀   ▀  ▀▀▀▀  ▀ ▀ ▀▀▀  ',
  // ── 3D ground shadow ──
  ' ░░░░ ░ ░░░ ░░░ ░ ░  ░   ░  ░░░░  ░ ░ ░░░  ',
];

// Gradient: 6 bright steps for UTHY, 3 mid steps for AGENTIC OS, 1 dim for shadow
const BANNER_GRADIENT = [
  51,   // bright cyan
  87,   // light cyan
  123,  // cyan-white
  159,  // ice blue
  195,  // near-white
  231,  // white
  201,  // magenta
  207,  // light magenta
  213,  // pink
  243,  // gray (shadow)
];

const BANNER = BANNER_LINES.join('\n');

const SMALL_BANNER = `\x1b[1m\x1b[38;5;51m
  ┌──────────────────────────────────────┐
  │  ██╗   ██╗████████╗██╗  ██╗██╗   ██╗│
  │  ██║   ██║╚══██╔══╝██║  ██║╚██╗ ██╔╝│
  │  ██║   ██║   ██║   ███████║ ╚████╔╝ │
  │  ╚██████╔╝   ██║   ██║  ██║   ██║   │
  │   ╚═════╝    ╚═╝   ╚═╝  ╚═╝   ╚═╝  │
  └──────────────────────────────────────┘\x1b[0m`;

function renderBanner(theme, compact = false) {
  const t = theme || THEMES.cyber;
  const banner = compact ? SMALL_BANNER : BANNER;

  if (!compact) {
    const lines = BANNER_LINES;
    return lines.map((line, i) => {
      const colorIdx = i % t.bannerGradient.length;
      const color = t.bannerGradient[colorIdx] || t.bannerGradient[0];
      return `${color}${line}${t.reset}`;
    }).join('\n');
  }
  return banner;
}

// ── Render banner at TOP-LEFT with 3D positioning ──────────

function renderBannerAtTop(theme) {
  const t = theme || THEMES.cyber;
  const lines = BANNER_LINES;

  let output = saveCursor();

  for (let i = 0; i < lines.length; i++) {
    const row = i + 1;
    const col = 1;
    const colorIdx = i % t.bannerGradient.length;
    const color = t.bannerGradient[colorIdx] || t.bannerGradient[0];

    output += moveCursor(row, col);
    output += clearLine();
    output += `${color}${lines[i]}${t.reset}`;
  }

  output += restoreCursor();
  return output;
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

// ═══════════════════════════════════════════════════════════
// FLIP CLOCK — seven-segment display digits
// ═══════════════════════════════════════════════════════════

const FLIP_DIGITS = {
  '0': ['▄▀▀▄', '█  █', '█▄▄█'],
  '1': [' ▄█ ', '  █ ', ' ▄█▄'],
  '2': ['▄▀▀▄', ' ▄▄█', '█▄▄ '],
  '3': ['▄▀▀▄', '  ▀▄', '▄▄▄█'],
  '4': ['█  █', '█▄▄█', '   █'],
  '5': ['█▀▀▄', ' ▄▄█', '▄▄▄█'],
  '6': ['█▀▀▄', '█▄▄█', '█▄▄█'],
  '7': ['▄▀▀▄', '   █', '   █'],
  '8': ['█▀▀█', '█▀▀█', '█▄▄█'],
  '9': ['█▀▀█', '█▄▄█', '▄▄▄█'],
  ':': [' ', '●', '●'],
};

function renderFlipClock(theme) {
  const t = theme || THEMES.cyber;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const timeStr = [h, ':', m, ':', s];

  const lines = [[], [], []];
  for (const ch of timeStr) {
    const segs = FLIP_DIGITS[ch] || FLIP_DIGITS['0'];
    for (let row = 0; row < 3; row++) {
      lines[row].push(segs[row]);
    }
  }

  return [
    `${t.secondary}${lines[0].join(' ')}${t.reset}`,
    `${t.primary}${lines[1].join(' ')}${t.reset}`,
    `${t.accent}${lines[2].join(' ')}${t.reset}`,
  ];
}

// ═══════════════════════════════════════════════════════════
// SOCIAL MEDIA ICONS & LINKS
// ═══════════════════════════════════════════════════════════

const SOCIAL_LINKS = [
  { icon: 'ⓕ', label: 'Facebook',  url: 'https://www.facebook.com/moody.uthuman', color: '38;5;27m' },
  { icon: 'ⓘ', label: 'Instagram', url: 'https://www.instagram.com/uthuman.co',    color: '38;5;201m' },
  { icon: 'ⓣ', label: 'Telegram',  url: 'https://t.me/uthuman',                    color: '38;5;39m' },
  { icon: 'ⓧ', label: 'X',        url: 'https://x.com/uthumanco',                 color: '1;37m' },
  { icon: 'ⓦ', label: 'WhatsApp',  url: 'https://wa.me/256705126287',              color: '38;5;46m' },
  { icon: 'ⓔ', label: 'Email',     url: 'mailto:dev@uthuman.com',                  color: '38;5;226m' },
  { icon: 'ⓚ', label: 'TikTok',    url: 'https://www.tiktok.com/@uthuman.co',      color: '1;37m' },
  { icon: 'ⓖ', label: 'GitHub',    url: 'https://github.com/uthumany',             color: '1;37m' },
];

function renderSocialIconsRow(theme) {
  const t = theme || THEMES.cyber;
  const icons = SOCIAL_LINKS.map(s => `\x1b[${s.color}${s.icon}${t.reset}`).join(' ');
  return icons;
}

function renderSocialLinksDetailed(theme) {
  const t = theme || THEMES.cyber;
  return SOCIAL_LINKS.map(s => {
    const icon = `\x1b[${s.color}${s.bold || ''}${s.icon}${t.reset}`;
    const label = `${t.primary}${s.label}${t.reset}`;
    const url = `${t.muted}${s.url}${t.reset}`;
    return `  ${icon} ${label}: ${url}`;
  });
}

// ═══════════════════════════════════════════════════════════
// CYBERPUNK HUD OVERLAY — Top-Right Corner
// Holographic Console Card — Semi-transparent with floating UI
// ═══════════════════════════════════════════════════════════

function getTerminalSize() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  return { cols, rows };
}

function moveCursor(row, col) {
  return `\x1b[${row};${col}H`;
}

function saveCursor() {
  return '\x1b[s';
}

function restoreCursor() {
  return '\x1b[u';
}

function clearLine() {
  return '\x1b[2K';
}

// ── HUD Decorators ──────────────────────────────────────────

// Scanline divider — dotted holographic separator
function hudDivider(width, theme) {
  const t = theme || THEMES.cyber;
  return `${t.muted}${'┈'.repeat(width)}${t.reset}`;
}

// Corner brackets — floating targeting markers
function hudCornerTop(width, theme) {
  const t = theme || THEMES.cyber;
  const line = '─'.repeat(width - 2);
  return `${t.secondary}╭${t.muted}${line}${t.secondary}╮${t.reset}`;
}

function hudCornerBottom(width, theme) {
  const t = theme || THEMES.cyber;
  const line = '─'.repeat(width - 2);
  return `${t.secondary}╰${t.muted}${line}${t.secondary}╯${t.reset}`;
}

// Floating side bar — left edge with dim pipe
function hudRow(content, width, theme) {
  const t = theme || THEMES.cyber;
  const stripped = stripAnsi(content);
  const pad = Math.max(0, width - 3 - stripped.length);
  return `${t.muted}│${t.reset} ${content}${' '.repeat(pad)}${t.muted}│${t.reset}`;
}

// HUD marker prefixes
function hudTag(text, theme) {
  const t = theme || THEMES.cyber;
  return `${t.secondary}▸${t.reset} ${text}`;
}

function hudPip(theme) {
  const t = theme || THEMES.cyber;
  return `${t.accent}◆${t.reset}`;
}

// Glitch header — floating title with angle brackets
function hudHeader(title, theme) {
  const t = theme || THEMES.cyber;
  return `${t.secondary}⟨${t.reset} ${t.bold}${t.primary}${title}${t.reset} ${t.secondary}⟩${t.reset}`;
}

// ── HUD Card Builder ────────────────────────────────────────

function renderHudCard(theme) {
  const t = theme || THEMES.cyber;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  const W = 90; // HUD inner width
  const pad = (s, w) => {
    const len = stripAnsi(s).length;
    return s + ' '.repeat(Math.max(0, w - len));
  };

  // Clock digits
  const clockLines = renderFlipClock(theme);

  const lines = [];

  // ── Top bracket ──
  lines.push(hudCornerTop(W, theme));

  // ── Title row with system indicator ──
  const title = hudHeader('uthuman & co', theme);
  const sysLabel = `${t.muted}◈ HOLO.CONSOLE${t.reset}`;
  const titleRow = `${title}  ${t.muted}━━━${t.reset}  ${sysLabel}`;
  lines.push(hudRow(titleRow, W, theme));

  // ── Scanline separator ──
  lines.push(hudRow(hudDivider(W - 4, theme), W, theme));

  // ── Social icons row with pip markers ──
  const icons = SOCIAL_LINKS.map(s => {
    const ico = `\x1b[${s.color}${s.icon}${t.reset}`;
    return `${ico}`;
  }).join('  ');
  lines.push(hudRow(hudTag(icons, theme), W, theme));

  // ── Flip clock with SYS.TIME label ──
  for (const cl of clockLines) {
    const clockTag = `${t.muted}◇${t.reset}`;
    lines.push(hudRow(`  ${clockTag} ${cl}`, W, theme));
  }

  // ── Date + time readout ──
  const dateReadout = `${t.info}▸ ${dateStr}${t.reset}  ${t.muted}┊${t.reset}  ${t.success}◈ ${timeStr}${t.reset}`;
  lines.push(hudRow(dateReadout, W, theme));

  // ── Scanline separator ──
  lines.push(hudRow(hudDivider(W - 4, theme), W, theme));

  // ── Social links — single column, HUD-style ──
  for (const s of SOCIAL_LINKS) {
    const icon = `\x1b[${s.color}${s.icon}${t.reset}`;
    const label = `${t.primary}${s.label.padEnd(10)}${t.reset}`;
    const url = `${t.muted}${s.url}${t.reset}`;
    const row = `  ${hudPip(theme)}  ${icon}  ${label} ${t.muted}▸${t.reset} ${url}`;
    lines.push(hudRow(row, W, theme));
  }

  // ── Scanline separator ──
  lines.push(hudRow(hudDivider(W - 4, theme), W, theme));

  // ── Copyright with scanline texture ──
  const copyright = `${t.muted}░░ © 2026 uthuman & co · Free & Open Source${t.reset}`;
  lines.push(hudRow(copyright, W, theme));

  // ── Bottom bracket ──
  lines.push(hudCornerBottom(W, theme));

  return lines;
}

// ── HUD Positioning — Top-Right Corner ──────────────────────

function renderHudAtTop(theme) {
  const t = theme || THEMES.cyber;
  const { cols } = getTerminalSize();
  const hudLines = renderHudCard(theme);
  const hudHeight = hudLines.length;
  const hudWidth = stripAnsi(hudLines[0]).length;

  // Position at top-right: row 1, right-aligned
  const startRow = 1;
  const startCol = Math.max(1, cols - hudWidth - 2);

  let output = saveCursor();

  // Clear area and draw HUD
  for (let i = 0; i < hudHeight; i++) {
    output += moveCursor(startRow + i, startCol);
    output += clearLine();
    output += hudLines[i];
  }

  output += restoreCursor();
  return output;
}

// ── HUD Refresh Loop ────────────────────────────────────────

function startHudRefresh(theme, intervalMs = 1000) {
  const t = theme || THEMES.cyber;

  const draw = () => {
    // Only draw HUD — banner is handled by unified animation
    process.stdout.write(renderHudAtTop(t));
  };

  // Initial draw
  draw();

  // Refresh every second for live clock
  const timer = setInterval(draw, intervalMs);

  // Handle terminal resize
  const onResize = () => draw();
  process.stdout.on('resize', onResize);

  return () => {
    clearInterval(timer);
    process.stdout.removeListener('resize', onResize);
  };
}

module.exports = {
  THEMES,
  BANNER,
  SMALL_BANNER,
  BANNER_LINES,
  renderBanner,
  renderBannerAtTop,
  renderBox,
  renderMenu,
  colorize,
  progressBar,
  spinner,
  divider,
  stripAnsi,
  renderFlipClock,
  renderHudCard,
  renderHudAtTop,
  startHudRefresh,
  renderSocialIconsRow,
  renderSocialLinksDetailed,
  SOCIAL_LINKS,
  // Legacy aliases for backward compat
  renderFooterCard: renderHudCard,
  renderFooterAtBottom: renderHudAtTop,
  startFooterRefresh: startHudRefresh,
};
