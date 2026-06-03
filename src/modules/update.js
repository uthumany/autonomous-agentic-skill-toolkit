'use strict';

/**
 * UTHY AGENTIC OS — Update Manager
 * Self-update with version checking, npm registry lookup, and progress tracking.
 */

const https = require('https');
const http = require('http');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ═══════════════════════════════════════════════════════════
// ANIMATED PROGRESS BAR RENDERER
// ═══════════════════════════════════════════════════════════

const ESC = '\x1b';
const rgb = (r, g, b) => `${ESC}[38;2;${r};${g};${b}m`;
const reset = () => `${ESC}[0m`;
const bold = (s) => `${ESC}[1m${s}${ESC}[0m`;
const dim = (s) => `${ESC}[2m${s}${ESC}[0m`;
const moveCursor = (row, col) => `${ESC}[${row};${col}H`;
const clearLine = () => `${ESC}[2K`;
const saveCursor = () => `${ESC}[s`;
const restoreCursor = () => `${ESC}[u`;

function lerpColor(c1, c2, t) {
  return [Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t)];
}

function gradientBar(progress, width, phase) {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  let bar = '';

  // Gradient fill: cyan → magenta → pink
  const colors = [[0,255,255],[0,200,255],[100,100,255],[200,0,255],[255,0,200]];
  for (let i = 0; i < filled; i++) {
    const t = (i / width + phase) % 1;
    const ci = t * (colors.length - 1);
    const idx = Math.floor(ci);
    const frac = ci - idx;
    const c = lerpColor(colors[Math.min(idx, colors.length-1)], colors[Math.min(idx+1, colors.length-1)], frac);
    bar += rgb(c[0], c[1], c[2]) + '█';
  }

  // Empty: dim dots with pulse
  for (let i = 0; i < empty; i++) {
    const pulse = Math.sin((i + phase * 20) * 0.5) > 0.3;
    bar += pulse ? dim(rgb(60,60,80) + '░') : dim(rgb(40,40,60) + '░');
  }

  return bar + reset();
}

function render3DFrame(title, progress, status, phase, width) {
  const W = width || 60;
  const inner = W - 4;
  const lines = [];

  // 3D top shadow
  lines.push(dim(rgb(30,30,40)) + '▓'.repeat(W + 2) + reset());

  // Top border with gradient
  const topContent = '╭─ ⟨ ' + title + ' ⟩ ' + '━'.repeat(Math.max(0, inner - title.length - 8)) + '╮';
  lines.push(gradientText(topContent, phase));

  // Status line
  const statusPad = Math.max(0, inner - status.length - 1);
  lines.push(dim(rgb(60,60,70)) + '│' + reset() + ' ' + rgb(0,200,255) + status + ' '.repeat(statusPad) + dim(rgb(60,60,70)) + '│' + reset() + ' ▓');

  // Progress bar
  const pct = String(Math.round(progress)).padStart(3) + '%';
  const barWidth = inner - 10;
  const bar = gradientBar(progress, barWidth, phase);
  const barLine = '│ ' + bar + ' ' + bold(rgb(255,255,255) + pct + reset()) + ' │';
  lines.push(dim(rgb(60,60,70)) + barLine + reset() + ' ▓');

  // Bottom border
  const botContent = '╰' + '─'.repeat(inner) + '╯';
  lines.push(gradientText(botContent, (phase + 0.5) % 1));

  // 3D bottom shadow
  lines.push(dim(rgb(20,20,30)) + '▓'.repeat(W + 2) + reset());

  return lines;
}

function gradientText(text, phase) {
  const colors = [[0,255,255],[0,200,255],[100,100,255],[200,0,255]];
  let output = '';
  for (let i = 0; i < text.length; i++) {
    const t = (i / text.length + phase) % 1;
    const ci = t * (colors.length - 1);
    const idx = Math.floor(ci);
    const frac = ci - idx;
    const c = lerpColor(colors[Math.min(idx, colors.length-1)], colors[Math.min(idx+1, colors.length-1)], frac);
    output += rgb(c[0], c[1], c[2]) + text[i];
  }
  return output + reset();
}

// ═══════════════════════════════════════════════════════════
// ANIMATED SPINNER FRAMES
// ═══════════════════════════════════════════════════════════

const SPINNERS = {
  dots:    ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'],
  arc:     ['◜','◠','◝','◞','◡','◟'],
  bounce:  ['⠁','⠂','⠄','⡀','⢀','⠠','⠐','⠈'],
  grow:    ['▁','▃','▄','▅','▆','▇','█','▇','▆','▅','▄','▃'],
  rocket:  ['🚀','💫','✨','⭐','🌟','💥'],
  gear:    ['⚙️ ','🔧','🔩','⚙️ ','🔧','🔩'],
  pulse:   ['◉','◎','●','○','●','◎'],
  wave:    ['🌊','🏄','🌊','🏄','🌊'],
};

function getSpinnerFrame(type, index) {
  const frames = SPINNERS[type] || SPINNERS.dots;
  return frames[index % frames.length];
}

// ═══════════════════════════════════════════════════════════
// HTTP REQUEST HELPER
// ═══════════════════════════════════════════════════════════

function httpGet(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, data, headers: res.headers });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ═══════════════════════════════════════════════════════════
// VERSION COMPARISON
// ═══════════════════════════════════════════════════════════

function parseVersion(v) {
  const parts = v.replace(/^v/, '').split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

// ═══════════════════════════════════════════════════════════
// UPDATE ENGINE
// ═══════════════════════════════════════════════════════════

class UpdateEngine {
  constructor(currentVersion) {
    this.currentVersion = currentVersion;
    this.packageName = 'uthy-agentic-os';
    this.registryUrl = `https://registry.npmjs.org/${this.packageName}/latest`;
  }

  // ── Check npm registry for latest version ───────────────

  async checkForUpdate() {
    try {
      const resp = await httpGet(this.registryUrl);
      const data = JSON.parse(resp.data);
      const latest = data.version;
      const hasUpdate = compareVersions(latest, this.currentVersion) > 0;
      return {
        current: this.currentVersion,
        latest,
        hasUpdate,
        name: data.name,
        description: data.description,
        publishedAt: data.time?.modified || null,
      };
    } catch (e) {
      return {
        current: this.currentVersion,
        latest: null,
        hasUpdate: false,
        error: e.message,
      };
    }
  }

  // ── Run npm update with progress tracking ───────────────

  async runUpdate(onProgress) {
    return new Promise((resolve, reject) => {
      const steps = [
        { pct: 5,  msg: 'Checking npm registry...' },
        { pct: 15, msg: 'Resolving package metadata...' },
        { pct: 25, msg: 'Downloading package...' },
        { pct: 45, msg: 'Extracting tarball...' },
        { pct: 55, msg: 'Installing dependencies...' },
        { pct: 70, msg: 'Linking binaries...' },
        { pct: 85, msg: 'Running post-install scripts...' },
        { pct: 95, msg: 'Verifying installation...' },
        { pct: 100, msg: 'Update complete!' },
      ];

      let stepIdx = 0;
      let currentPct = 0;

      // Simulate progress during npm install
      const progressInterval = setInterval(() => {
        if (stepIdx < steps.length - 1) {
          stepIdx++;
          currentPct = steps[stepIdx].pct;
          if (onProgress) onProgress(currentPct, steps[stepIdx].msg);
        }
      }, 800);

      // Run actual npm install
      const npm = spawn('npm', ['install', '-g', this.packageName], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      npm.stdout.on('data', (data) => {
        stdout += data.toString();
        // Parse npm output for real progress signals
        const text = data.toString();
        if (text.includes('added') || text.includes('updated')) {
          currentPct = 90;
          if (onProgress) onProgress(currentPct, 'Package installed, linking...');
        }
        if (text.includes('changed') || text.includes('Done')) {
          currentPct = 95;
          if (onProgress) onProgress(currentPct, 'Verifying...');
        }
      });

      npm.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      npm.on('close', (code) => {
        clearInterval(progressInterval);

        if (code === 0) {
          if (onProgress) onProgress(100, 'Update complete!');
          resolve({
            success: true,
            code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
          });
        } else {
          reject(new Error(`npm install failed (code ${code}): ${stderr.slice(0, 300)}`));
        }
      });

      npm.on('error', (err) => {
        clearInterval(progressInterval);
        reject(new Error(`Failed to start npm: ${err.message}`));
      });
    });
  }

  // ── Get changelog between versions ──────────────────────

  async getChangelog(fromVersion, toVersion) {
    try {
      const url = `https://registry.npmjs.org/${this.packageName}`;
      const resp = await httpGet(url);
      const data = JSON.parse(resp.data);
      const versions = Object.keys(data.versions || {}).sort(compareVersions);
      const relevant = versions.filter(v => compareVersions(v, fromVersion) > 0);
      return relevant.map(v => ({
        version: v,
        date: data.time?.[v] || null,
      }));
    } catch (e) {
      return [];
    }
  }
}

module.exports = {
  UpdateEngine,
  render3DFrame,
  gradientBar,
  gradientText,
  getSpinnerFrame,
  SPINNERS,
  compareVersions,
  parseVersion,
};
