'use strict';

/**
 * UTHY AGENTIC OS — TUI Layout Manager
 * Responsive zone system, double-buffer rendering, unified animation loop.
 */

const ESC = '\x1b';
const saveCursor = () => `${ESC}[s`;
const restoreCursor = () => `${ESC}[u`;
const moveCursor = (row, col) => `${ESC}[${row};${col}H`;
const clearLine = () => `${ESC}[2K`;
const clearBelow = () => `${ESC}[J`;
const hideCursor = () => `${ESC}[?25l`;
const showCursor = () => `${ESC}[?25h`;

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}

// ═══════════════════════════════════════════════════════════
// LAYOUT MODES
// ═══════════════════════════════════════════════════════════

const LAYOUT_MODES = {
  wide:    { banner: true,  hud: true,  chatPanel: true,  statusBar: false },
  compact: { banner: false, hud: true,  chatPanel: false, statusBar: true  },
  minimal: { banner: false, hud: false, chatPanel: false, statusBar: true  },
  zen:     { banner: false, hud: false, chatPanel: false, statusBar: false },
};

// ═══════════════════════════════════════════════════════════
// LAYOUT MANAGER
// ═══════════════════════════════════════════════════════════

class LayoutManager {
  constructor(options = {}) {
    this.isTTY = process.stdin.isTTY && process.stdout.isTTY;
    this.cols = process.stdout.columns || 80;
    this.rows = process.stdout.rows || 24;
    this.mode = this.isTTY ? this._detectMode() : 'zen';
    this.prevFrame = null; // for double-buffer diff
    this.animTimer = null;
    this.animPhase = 0;
    this.chatVisible = false; // chat panel hidden by default
    this.components = {};    // registered components
    this.onRedraw = null;    // callback for full redraw
  }

  // ── Auto-detect best layout mode based on terminal size ──

  _detectMode() {
    if (this.cols >= 140 && this.rows >= 30) return 'wide';
    if (this.cols >= 90 && this.rows >= 24) return 'compact';
    if (this.cols >= 60) return 'minimal';
    return 'zen';
  }

  // ── Get current terminal dimensions ──────────────────────

  updateDimensions() {
    this.cols = process.stdout.columns || 80;
    this.rows = process.stdout.rows || 24;
    const newMode = this.isTTY ? this._detectMode() : 'zen';
    if (newMode !== this.mode) {
      this.mode = newMode;
      return true; // mode changed, need full redraw
    }
    return false;
  }

  // ── Get active layout config ─────────────────────────────

  getLayout() {
    const modeConfig = LAYOUT_MODES[this.mode] || LAYOUT_MODES.compact;
    // Override chat panel visibility
    return { ...modeConfig, chatPanel: this.chatVisible && modeConfig.chatPanel };
  }

  // ── Calculate zone boundaries ────────────────────────────

  getZones() {
    const layout = this.getLayout();
    const { cols, rows } = this;

    let topHeight = 0;
    if (layout.banner && cols >= 120) topHeight = 10; // banner lines
    if (layout.hud && cols >= 90) topHeight = Math.max(topHeight, 12); // compact HUD

    const bottomHeight = layout.chatPanel ? 8 : (layout.statusBar ? 1 : 0);
    const middleHeight = Math.max(4, rows - topHeight - bottomHeight - 2);

    return {
      top: {
        row: 1,
        height: topHeight,
        banner: layout.banner && cols >= 120,
        hud: layout.hud && cols >= 90,
      },
      middle: {
        row: topHeight + 1,
        height: middleHeight,
        // REPL output goes here
      },
      bottom: {
        row: rows - bottomHeight,
        height: bottomHeight,
        chatPanel: layout.chatPanel,
        statusBar: layout.statusBar,
      },
    };
  }

  // ── Render status bar (1-line HUD replacement) ───────────

  renderStatusBar(theme, state = {}) {
    if (!this.isTTY) return '';

    const t = theme;
    const { cols } = this;
    const W = cols - 2;

    const clock = state.clock || '';
    const themeName = state.themeName || 'cyber';
    const memoryCount = state.memoryCount || 0;
    const sessionTime = state.sessionTime || '0:00';
    const engineCount = state.engineCount || 17;

    const segments = [
      `${t.secondary}◈${t.reset} ${t.primary}UTHY${t.reset}`,
      `${t.muted}│${t.reset} ${t.info}${clock}${t.reset}`,
      `${t.muted}│${t.reset} ${t.accent}🎨 ${themeName}${t.reset}`,
      `${t.muted}│${t.reset} ${t.secondary}🧠 ${memoryCount}${t.reset}`,
      `${t.muted}│${t.reset} ${t.muted}⏱ ${sessionTime}${t.reset}`,
      `${t.muted}│${t.reset} ${t.success}⚡ ${engineCount} engines${t.reset}`,
    ];

    const content = segments.join(' ');
    const contentLen = stripAnsi(content).length;
    const pad = Math.max(0, W - contentLen);

    return `${t.muted}┌${'─'.repeat(W)}┐${t.reset}\n` +
           `${t.muted}│${t.reset} ${content}${' '.repeat(pad)} ${t.muted}│${t.reset}\n` +
           `${t.muted}└${'─'.repeat(W)}┘${t.reset}`;
  }

  // ── Render compact HUD (12 lines instead of 20) ─────────

  renderCompactHud(theme, state = {}) {
    if (!this.isTTY) return '';

    const t = theme;
    const { cols } = this;
    const W = Math.min(42, cols - 4); // Narrow HUD for compact mode

    const clock = state.clock || '00:00:00';
    const date = state.date || '';
    const lines = [];

    // Top bracket
    lines.push(`${t.secondary}╭${'─'.repeat(W - 2)}╮${t.reset}`);

    // Title
    lines.push(`${t.muted}│${t.reset} ${t.secondary}⟨${t.reset} ${t.bold}${t.primary}UTHY AGENTIC OS${t.reset} ${t.secondary}⟩${t.reset}`);
    lines.push(`${t.muted}│${t.reset} ${t.muted}┈${'┈'.repeat(W - 4)}┈${t.reset}`);

    // Clock
    lines.push(`${t.muted}│${t.reset}  ${t.info}🕐 ${clock}${t.reset}`);
    lines.push(`${t.muted}│${t.reset}  ${t.muted}📅 ${date}${t.reset}`);

    lines.push(`${t.muted}│${t.reset} ${t.muted}┈${'┈'.repeat(W - 4)}┈${t.reset}`);

    // Social icons (compact)
    const icons = ['ⓕ', 'ⓘ', 'ⓣ', 'ⓧ', 'ⓦ', 'ⓔ', 'ⓚ', 'ⓖ'];
    lines.push(`${t.muted}│${t.reset}  ${t.secondary}${icons.join(' ')}${t.reset}`);

    lines.push(`${t.muted}│${t.reset} ${t.muted}┈${'┈'.repeat(W - 4)}┈${t.reset}`);

    // Copyright
    lines.push(`${t.muted}│${t.reset} ${t.muted}░░ © 2026 uthuman & co${t.reset}`);

    // Bottom bracket
    lines.push(`${t.secondary}╰${'─'.repeat(W - 2)}╯${t.reset}`);

    return lines.join('\n');
  }

  // ── Unified animation loop ───────────────────────────────

  startAnimation(callback, intervalMs = 500) {
    this.stopAnimation();
    this.animTimer = setInterval(() => {
      this.animPhase = (this.animPhase + 1) % 100;
      if (callback) callback(this.animPhase);
    }, intervalMs);
  }

  stopAnimation() {
    if (this.animTimer) {
      clearInterval(this.animTimer);
      this.animTimer = null;
    }
  }

  // ── Set layout mode ──────────────────────────────────────

  setMode(mode) {
    if (LAYOUT_MODES[mode]) {
      this.mode = mode;
      return true;
    }
    return false;
  }

  // ── Toggle chat panel ────────────────────────────────────

  toggleChat() {
    this.chatVisible = !this.chatVisible;
    return this.chatVisible;
  }

  // ── Get prompt string based on layout ────────────────────

  getPromptString(theme) {
    const t = theme;
    const cyan = '\x1b[38;2;0;255;255m';
    const white = '\x1b[38;2;255;255;255m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    if (this.mode === 'zen') {
      return `${bold}${cyan}>${reset} `;
    }
    return `${bold}${cyan}UTHY${reset}${white}>>${reset} `;
  }

  // ── Render full layout frame ─────────────────────────────

  renderFrame(theme, state = {}) {
    if (!this.isTTY) return ''; // no rendering in piped mode

    const zones = this.getZones();
    let output = saveCursor();

    // Top zone — banner and/or compact HUD
    if (zones.top.banner || zones.top.hud) {
      if (zones.top.hud) {
        const hudLines = this.renderCompactHud(theme, state).split('\n');
        for (let i = 0; i < hudLines.length; i++) {
          const col = this.cols - 42;
          output += moveCursor(i + 1, Math.max(1, col));
          output += clearLine();
          output += hudLines[i];
        }
      }
    }

    // Bottom zone — status bar or chat panel
    if (zones.bottom.statusBar && !zones.bottom.chatPanel) {
      const barLines = this.renderStatusBar(theme, state).split('\n');
      const startRow = zones.bottom.row;
      for (let i = 0; i < barLines.length; i++) {
        output += moveCursor(startRow + i, 1);
        output += clearLine();
        output += barLines[i];
      }
    }

    output += restoreCursor();
    return output;
  }

  // ── Get info for diagnostics ─────────────────────────────

  getInfo() {
    return {
      isTTY: this.isTTY,
      cols: this.cols,
      rows: this.rows,
      mode: this.mode,
      chatVisible: this.chatVisible,
      layout: this.getLayout(),
      zones: this.getZones(),
    };
  }
}

module.exports = { LayoutManager, LAYOUT_MODES };
