'use strict';

/**
 * UTHY AGENTIC OS — Cyberpunk Chat Input Panel
 * HUD-framed terminal input with 3D animated borders and glow effects.
 */

// ═══════════════════════════════════════════════════════════
// ANSI HELPERS
// ═══════════════════════════════════════════════════════════

const ESC = '\x1b';
const saveCursor = () => `${ESC}[s`;
const restoreCursor = () => `${ESC}[u`;
const moveCursor = (row, col) => `${ESC}[${row};${col}H`;
const clearLine = () => `${ESC}[2K`;
const clearBelow = () => `${ESC}[J`;
const hideCursor = () => `${ESC}[?25l`;
const showCursor = () => `${ESC}[?25h`;
const bold = (s) => `${ESC}[1m${s}${ESC}[0m`;
const dim = (s) => `${ESC}[2m${s}${ESC}[0m`;

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}

function rgb(r, g, b) {
  return `${ESC}[38;2;${r};${g};${b}m`;
}

function bgRgb(r, g, b) {
  return `${ESC}[48;2;${r};${g};${b}m`;
}

function reset() {
  return `${ESC}[0m`;
}

// ═══════════════════════════════════════════════════════════
// COLOR CYCLING — Animated gradient for borders
// ═══════════════════════════════════════════════════════════

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Cyberpunk palette for cycling
const CYCLE_COLORS = [
  [0, 255, 255],   // cyan
  [0, 200, 255],   // blue-cyan
  [100, 100, 255], // blue
  [200, 0, 255],   // magenta
  [255, 0, 200],   // pink
  [255, 0, 100],   // hot pink
  [255, 50, 0],    // orange-red
  [255, 150, 0],   // orange
  [255, 255, 0],   // yellow
  [0, 255, 100],   // green-cyan
  [0, 255, 255],   // back to cyan
];

function getGradientColor(t) {
  const idx = t * (CYCLE_COLORS.length - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  const c1 = CYCLE_COLORS[Math.min(i, CYCLE_COLORS.length - 1)];
  const c2 = CYCLE_COLORS[Math.min(i + 1, CYCLE_COLORS.length - 1)];
  return lerpColor(c1, c2, frac);
}

function gradientString(text, phase) {
  const len = text.length;
  let output = '';
  for (let i = 0; i < len; i++) {
    const t = ((i / len) + phase) % 1;
    const [r, g, b] = getGradientColor(t);
    output += rgb(r, g, b) + text[i];
  }
  return output + reset();
}

// ═══════════════════════════════════════════════════════════
// CHAT PANEL STATE
// ═══════════════════════════════════════════════════════════

class ChatPanel {
  constructor(options = {}) {
    this.theme = options.theme || {};
    this.width = options.width || 80;
    this.attachments = [];
    this.phase = 0;           // animation phase (0-1)
    this.frameTimer = null;   // animation interval
    this.active = false;
    this.inputRow = 0;        // terminal row where input goes
    this.frameHeight = 6;     // total rows the frame occupies
    this.mode = 'normal';     // normal | attach | search
    this.statusText = '';
    this.blinkState = true;   // cursor blink state
  }

  // ── Get terminal width ──────────────────────────────────

  getTermWidth() {
    return process.stdout.columns || this.width;
  }

  // ── Build the frame lines ───────────────────────────────

  buildFrame() {
    const W = Math.min(this.getTermWidth() - 4, 100); // -4 for 3D shadow margins
    const innerW = W - 2; // inside the │ │ borders
    const lines = [];

    // Phase for gradient animation
    const p = this.phase;

    // ── Line 1: 3D top shadow ──
    const topShadow = '▓'.repeat(W + 4);
    lines.push(dim(rgb(40, 40, 50)) + topShadow + reset());

    // ── Line 2: Top border with gradient ──
    const topLeft = '╭─';
    const topTitle = ' ⟨ UTHY AGENTIC OS ⟩ ';
    const topDash = '━'.repeat(Math.max(0, innerW - topTitle.length - 4));
    const topRight = '─╮';
    const topBorderContent = topLeft + topTitle + topDash + topRight;
    lines.push(' ' + gradientString(topBorderContent, p) + ' ▓');

    // ── Line 3: Attachments or status ──
    let attachLine = '';
    if (this.attachments.length > 0) {
      const att = this.attachments[this.attachments.length - 1];
      attachLine = ` ▸ ${att.icon || '📎'} ${att.name} (${att.sizeFormatted || ''})`;
    } else if (this.statusText) {
      attachLine = ` ▸ ${this.statusText}`;
    } else {
      attachLine = ` ▸ ${dim('ready')}`;
    }
    const attPad = Math.max(0, innerW - stripAnsi(attachLine).length - 1);
    lines.push(`${dim(rgb(60, 60, 70))} │${reset()}${rgb(0, 200, 255)}${attachLine}${' '.repeat(attPad)}${reset()}${dim(rgb(60, 60, 70))} │ ▓${reset()}`);

    // ── Line 4: Scanline divider ──
    const divider = '┈'.repeat(innerW - 2);
    lines.push(`${dim(rgb(50, 50, 60))} │${reset()}${dim(rgb(80, 80, 100))} ${divider} ${reset()}${dim(rgb(50, 50, 60))} │ ▓${reset()}`);

    // ── Line 5: Input area with UTHY>> prompt ──
    const promptText = ' UTHY>> ';
    const cursorChar = this.blinkState ? '█' : ' ';
    const inputPad = Math.max(0, innerW - promptText.length - 3);
    const promptColor = rgb(0, 255, 255);
    const cursorColor = rgb(255, 255, 255);
    lines.push(
      `${dim(rgb(60, 60, 70))} │${reset()}` +
      `${bold(promptColor + promptText + reset())}` +
      `${cursorColor}${cursorChar}${reset()}` +
      `${' '.repeat(inputPad)}` +
      `${dim(rgb(60, 60, 70))} │ ▓${reset()}`
    );

    // ── Line 6: Footer with instructions ──
    const instr = '@file to attach · Enter to send · /help for commands';
    const instrPadded = ` ░░ ${instr}`;
    const instrPadLen = Math.max(0, innerW - stripAnsi(instrPadded).length - 1);
    lines.push(
      `${dim(rgb(60, 60, 70))} │${reset()}` +
      `${dim(rgb(100, 100, 120))}${instrPadded}${' '.repeat(instrPadLen)}${reset()}` +
      `${dim(rgb(60, 60, 70))} │ ▓${reset()}`
    );

    // ── Line 7: Bottom border with gradient ──
    const botLeft = '╰';
    const botLine = '─'.repeat(innerW);
    const botRight = '╯';
    const botContent = botLeft + botLine + botRight;
    lines.push(' ' + gradientString(botContent, (p + 0.5) % 1) + ' ▓');

    // ── Line 8: 3D bottom shadow ──
    const botShadow = '▓'.repeat(W + 4);
    lines.push(' ' + dim(rgb(30, 30, 40)) + botShadow + reset());

    return lines;
  }

  // ── Render frame at fixed position ──────────────────────

  render() {
    const lines = this.buildFrame();
    const termRows = process.stdout.rows || 24;
    const termCols = process.stdout.columns || 80;

    // Position frame at bottom of terminal
    const frameHeight = lines.length;
    const startRow = termRows - frameHeight;

    let output = saveCursor();

    for (let i = 0; i < lines.length; i++) {
      output += moveCursor(startRow + i + 1, 1);
      output += clearLine();
      output += lines[i];
    }

    // Position cursor at the input area (line 5 of frame, after prompt)
    const promptLen = 8; // " UTHY>> " length
    this.inputRow = startRow + 4; // 0-indexed: line 5 is index 4
    output += moveCursor(this.inputRow + 1, promptLen + 3); // +3 for left margin + border
    output += restoreCursor();

    process.stdout.write(output);
  }

  // ── Animation loop ──────────────────────────────────────

  startAnimation(intervalMs = 120) {
    this.active = true;
    this.render();

    this.frameTimer = setInterval(() => {
      if (!this.active) return;
      this.phase = (this.phase + 0.02) % 1;
      this.blinkState = !this.blinkState;
      this.render();
    }, intervalMs);

    // Handle terminal resize
    this._onResize = () => {
      if (this.active) this.render();
    };
    process.stdout.on('resize', this._onResize);
  }

  stopAnimation() {
    this.active = false;
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
    if (this._onResize) {
      process.stdout.removeListener('resize', this._onResize);
    }
  }

  // ── State updates ───────────────────────────────────────

  setAttachments(attachments) {
    this.attachments = attachments || [];
    if (this.active) this.render();
  }

  setStatus(text) {
    this.statusText = text || '';
    if (this.active) this.render();
  }

  setMode(mode) {
    this.mode = mode || 'normal';
    if (this.active) this.render();
  }

  // ── Generate the readline prompt string ──────────────────
  // This is what gets passed to rl.setPrompt() / new Interface({prompt:})

  getPromptString() {
    const t = this.theme;
    const cyan = rgb(0, 255, 255);
    const white = rgb(255, 255, 255);
    const resetStr = reset();
    return `${bold(cyan + 'UTHY' + resetStr)}${white + '>>' + resetStr} `;
  }

  // ── Flash effect (brief bright border) ──────────────────

  flash() {
    const origPhase = this.phase;
    this.phase = 0; // cyan
    this.render();
    setTimeout(() => {
      this.phase = origPhase;
    }, 150);
  }

  // ── Error flash (red border) ────────────────────────────

  errorFlash() {
    const origPhase = this.phase;
    this.phase = 0.5; // red zone
    this.render();
    setTimeout(() => {
      this.phase = origPhase;
    }, 300);
  }
}

// ═══════════════════════════════════════════════════════════
// STANDALONE FRAME RENDERER (for non-REPL use)
// ═══════════════════════════════════════════════════════════

function renderChatFrame(theme, options = {}) {
  const panel = new ChatPanel({ theme, ...options });
  return panel.buildFrame().join('\n');
}

// ═══════════════════════════════════════════════════════════
// EMBEDDED INPUT PANEL (for inline use in REPL output)
// ═══════════════════════════════════════════════════════════

function renderInlineInput(theme, prompt, text) {
  const t = theme;
  const cyan = rgb(0, 255, 255);
  const magenta = rgb(200, 0, 255);
  const dimGray = dim(rgb(80, 80, 100));
  const W = 70;
  const innerW = W - 2;

  const lines = [];

  // Top border (3D double line)
  lines.push(`${cyan}╔${'═'.repeat(innerW)}╗${reset()}`);

  // Input line
  const promptStr = ` ${bold(magenta + prompt + reset())} `;
  const padLen = Math.max(0, innerW - promptStr.length - (text || '').length - 1);
  lines.push(
    `${cyan}║${reset()}${promptStr}${text || ''}${' '.repeat(padLen)}${cyan}║${reset()}`
  );

  // Bottom border (3D shadow)
  lines.push(`${cyan}╚${'═'.repeat(innerW)}╝${reset()}`);
  lines.push(`${dim(rgb(40, 40, 50))} ${'▓'.repeat(innerW)}${reset()}`);

  return lines.join('\n');
}

module.exports = {
  ChatPanel,
  renderChatFrame,
  renderInlineInput,
  gradientString,
  getGradientColor,
  rgb,
  reset,
  stripAnsi,
  saveCursor,
  restoreCursor,
  moveCursor,
  clearLine,
  hideCursor,
  showCursor,
  bold,
  dim,
};
