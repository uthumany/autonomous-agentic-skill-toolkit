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
// FOOTER CARD — Bottom-Right Corner
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

function renderFooterCard(theme) {
  const t = theme || THEMES.cyber;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  const W = 50; // card inner width
  const pad = (s, w) => {
    const len = stripAnsi(s).length;
    return s + ' '.repeat(Math.max(0, w - len));
  };

  // Build clock digits
  const clockLines = renderFlipClock(theme);

  // Build card lines
  const cardLines = [];

  // Top border with title
  const titleText = 'uthuman & co';
  const titleLen = titleText.length;
  const leftDash = Math.floor((W - titleLen - 4) / 2);
  const rightDash = W - titleLen - 4 - leftDash;
  cardLines.push(
    `${t.secondary}╔${'═'.repeat(leftDash)}╗ ${t.bold}${t.primary}${titleText}${t.reset}${t.secondary} ╔${'═'.repeat(rightDash)}╗${t.reset}`
  );

  // Social icons row
  const iconsRow = renderSocialIconsRow(theme);
  cardLines.push(`${t.secondary}║${t.reset} ${pad(iconsRow, W - 2)} ${t.secondary}║${t.reset}`);

  // Flip clock (3 rows)
  const clockPad = '    '; // left padding for clock centering
  for (const cl of clockLines) {
    cardLines.push(`${t.secondary}║${t.reset}${clockPad}${pad(cl, W - 6)}  ${t.secondary}║${t.reset}`);
  }

  // Date + time row
  const dateTimeStr = `${t.info}📅 ${dateStr}  ${t.success}🕐 ${timeStr}${t.reset}`;
  cardLines.push(`${t.secondary}║${t.reset} ${pad(dateTimeStr, W - 2)} ${t.secondary}║${t.reset}`);

  // Divider
  cardLines.push(`${t.secondary}╠${'═'.repeat(W)}╣${t.reset}`);

  // Social links (compact 2-column)
  const links = SOCIAL_LINKS;
  for (let i = 0; i < links.length; i += 2) {
    const a = links[i];
    const b = links[i + 1];
    const iconA = `\x1b[${a.color}${a.icon}${t.reset}`;
    const iconB = b ? `\x1b[${b.color}${b.icon}${t.reset}` : '';
    const labelA = `${t.primary}${a.label.padEnd(9)}${t.reset}`;
    const labelB = b ? `${t.primary}${b.label.padEnd(9)}${t.reset}` : '';
    const urlA = `${t.muted}${a.url}${t.reset}`;
    const urlB = b ? `${t.muted}${b.url}${t.reset}` : '';
    const cellA = `${iconA} ${labelA} ${urlA}`;
    const cellB = b ? `${iconB} ${labelB} ${urlB}` : '';
    const fullLine = ` ${cellA}   ${cellB}`;
    cardLines.push(`${t.secondary}║${t.reset}${pad(fullLine, W)}${t.secondary}║${t.reset}`);
  }

  // Divider
  cardLines.push(`${t.secondary}╠${'═'.repeat(W)}╣${t.reset}`);

  // Copyright
  const copyright = `${t.muted}© 2026 uthuman & co. Free & Open Source. All rights reserved.${t.reset}`;
  cardLines.push(`${t.secondary}║${t.reset} ${pad(copyright, W - 2)} ${t.secondary}║${t.reset}`);

  // Bottom border
  cardLines.push(`${t.secondary}╚${'═'.repeat(W)}╝${t.reset}`);

  return cardLines;
}

function renderFooterAtBottom(theme) {
  const t = theme || THEMES.cyber;
  const { cols, rows } = getTerminalSize();
  const cardLines = renderFooterCard(theme);
  const cardHeight = cardLines.length;
  const cardWidth = stripAnsi(cardLines[0]).length;

  // Position card at bottom-right
  const startRow = rows - cardHeight - 1;
  const startCol = Math.max(1, cols - cardWidth - 2);

  let output = saveCursor();

  // Clear the area and draw card
  for (let i = 0; i < cardHeight; i++) {
    output += moveCursor(startRow + i, startCol);
    output += clearLine();
    // Pad the line to right-align
    const line = cardLines[i];
    const lineLen = stripAnsi(line).length;
    const leftPad = Math.max(0, cardWidth - lineLen);
    output += ' '.repeat(leftPad) + line;
  }

  output += restoreCursor();
  return output;
}

function startFooterRefresh(theme, intervalMs = 1000) {
  const t = theme || THEMES.cyber;

  // Disable line wrap for the footer region
  const draw = () => {
    process.stdout.write(renderFooterAtBottom(t));
  };

  // Initial draw
  draw();

  // Refresh every second for clock update
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
  renderBanner,
  renderBox,
  renderMenu,
  colorize,
  progressBar,
  spinner,
  divider,
  stripAnsi,
  renderFlipClock,
  renderFooterCard,
  renderFooterAtBottom,
  startFooterRefresh,
  renderSocialIconsRow,
  renderSocialLinksDetailed,
  SOCIAL_LINKS,
};
