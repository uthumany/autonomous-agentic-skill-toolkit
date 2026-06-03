const themes = {
  cyber: { filled: ['\x1b[36m', '\x1b[35m'], empty: '\x1b[2m', bg: '' },
  fire: { filled: ['\x1b[33m', '\x1b[31m'], empty: '\x1b[2m', bg: '' },
  matrix: { filled: ['\x1b[32m', '\x1b[92m'], empty: '\x1b[2m', bg: '' },
  ocean: { filled: ['\x1b[34m', '\x1b[36m'], empty: '\x1b[2m', bg: '' },
  default: { filled: ['\x1b[36m', '\x1b[35m'], empty: '\x1b[2m', bg: '' },
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const BLINK = '\x1b[5m';

class Animations {
  static barLoader(progress, width = 20, theme = 'default') {
    const t = themes[theme] || themes.default;
    const p = Math.max(0, Math.min(1, progress));
    const filled = Math.round(p * width);
    const empty = width - filled;
    const pct = Math.round(p * 100);

    let bar = '[';
    for (let i = 0; i < filled; i++) {
      const ratio = filled > 1 ? i / (filled - 1) : 0;
      const r = Math.round(6 + ratio * (200 - 6));
      const g = Math.round(232 - ratio * 232);
      const b = Math.round(144 + ratio * (111));
      bar += `\x1b[38;2;${r};${g};${b}m█\x1b[0m`;
    }
    bar += t.empty;
    for (let i = 0; i < empty; i++) bar += '░';
    bar += RESET;
    bar += `] ${pct}%`;
    return bar;
  }

  static spinner(frames, text = '', theme = 'default') {
    if (!frames || !frames.length) frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const t = themes[theme] || themes.default;
    let i = 0;
    let stopped = false;
    const color = t.filled[0] || '';

    const interval = setInterval(() => {
      if (stopped) return;
      process.stdout.write(`\r${color}${frames[i % frames.length]}${RESET} ${text}  `);
      i++;
    }, 80);

    return () => {
      stopped = true;
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(text.length + 4) + '\r');
    };
  }

  static progressBar(value, max, width = 20, theme = 'default') {
    const p = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    return Animations.barLoader(p, width, theme);
  }

  static pulseText(text, theme = 'default') {
    const t = themes[theme] || themes.default;
    return `${BOLD}${t.filled[0]}${text}${RESET}`;
  }

  static glowText(text, color = 'cyan') {
    const colorMap = {
      red: '\x1b[91m', green: '\x1b[92m', yellow: '\x1b[93m',
      blue: '\x1b[94m', magenta: '\x1b[95m', cyan: '\x1b[96m',
      white: '\x1b[97m',
    };
    const c = colorMap[color] || '\x1b[96m';
    return `${BOLD}${c}${text}${RESET}`;
  }

  static shadowText(text) {
    const shadow = '\x1b[2;30m';
    return text.split('').map(ch => `${ch}${shadow}▓${RESET}`).join('');
  }

  static typewriter(text, speed = 50) {
    return new Promise((resolve) => {
      let i = 0;
      const interval = setInterval(() => {
        if (i >= text.length) {
          clearInterval(interval);
          process.stdout.write('\n');
          resolve();
          return;
        }
        process.stdout.write(text[i]);
        i++;
      }, speed);
    });
  }

  static countdown(seconds, label = '') {
    return new Promise((resolve) => {
      let remaining = seconds;
      const tick = () => {
        if (remaining <= 0) {
          process.stdout.write(`\r${label} 0s   \n`);
          resolve();
          return;
        }
        process.stdout.write(`\r${label} ${remaining}s  `);
        remaining--;
        setTimeout(tick, 1000);
      };
      tick();
    });
  }

  static dotLoader(text = '', theme = 'default') {
    const t = themes[theme] || themes.default;
    const dots = ['', '.', '..', '...'];
    let i = 0;
    let stopped = false;

    const interval = setInterval(() => {
      if (stopped) return;
      process.stdout.write(`\r${t.filled[0]}${text}${dots[i % dots.length]}   ${RESET}`);
      i++;
    }, 400);

    return () => {
      stopped = true;
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(text.length + 6) + '\r');
    };
  }

  static waveText(text, theme = 'default') {
    const t = themes[theme] || themes.default;
    const colors = [
      '\x1b[36m', '\x1b[34m', '\x1b[35m', '\x1b[33m',
      '\x1b[32m', '\x1b[36m', '\x1b[34m', '\x1b[35m',
    ];
    return text.split('').map((ch, i) => `${colors[i % colors.length]}${ch}${RESET}`).join('');
  }

  static matrixRain(duration = 3000) {
    return new Promise((resolve) => {
      const cols = process.stdout.columns || 80;
      const rows = process.stdout.rows || 24;
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*ｦｧｨｩｪｫｬｭｮｯ';
      const drops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * rows));

      process.stdout.write('\x1b[?25l'); // hide cursor
      const start = Date.now();

      const interval = setInterval(() => {
        if (Date.now() - start > duration) {
          clearInterval(interval);
          process.stdout.write('\x1b[?25h\x1b[0m'); // show cursor
          process.stdout.write('\x1b[2J\x1b[H'); // clear
          resolve();
          return;
        }

        let output = '';
        for (let col = 0; col < Math.min(cols, 80); col++) {
          if (Math.random() > 0.7) {
            const row = drops[col];
            output += `\x1b[${row};${col + 1}H\x1b[32m${chars[Math.floor(Math.random() * chars.length)]}`;
            output += `\x1b[${row - 1};${col + 1}H\x1b[2;32m${chars[Math.floor(Math.random() * chars.length)]}`;
            drops[col] = row > rows ? 0 : row + 1;
          }
        }
        process.stdout.write(output);
      }, 50);
    });
  }

  static blinkText(text) {
    return `${BLINK}${text}${RESET}`;
  }

  static gradientBar(width = 40, colors = null) {
    if (!colors) colors = [[0, 255, 255], [255, 0, 255]]; // cyan to magenta
    let bar = '';
    for (let i = 0; i < width; i++) {
      const t = width > 1 ? i / (width - 1) : 0;
      const ci = Math.floor(t * (colors.length - 1));
      const ct = t * (colors.length - 1) - ci;
      const c1 = colors[ci];
      const c2 = colors[Math.min(ci + 1, colors.length - 1)];
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * ct);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * ct);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * ct);
      bar += `\x1b[38;2;${r};${g};${b}m█${RESET}`;
    }
    return bar;
  }

  static statusEmoji(status) {
    const map = {
      success: '✓', ok: '✓', done: '✓', pass: '✓',
      error: '✗', fail: '✗', failure: '✗',
      warning: '⚠', warn: '⚠',
      running: '◆', active: '◆', progress: '◆',
      idle: '○', pending: '○', unknown: '○',
    };
    return map[(status || '').toLowerCase()] || '○';
  }

  static animatedEmoji(emoji, type = 'spin') {
    if (type === 'spin') {
      return [
        `${emoji}  `, ` ${emoji} `, `  ${emoji}`,
        ` ${emoji} `, `${emoji}  `, ` ${emoji} `, `  ${emoji}`,
      ];
    }
    if (type === 'bounce') {
      return [
        `  ${emoji}  `,
        `  ${emoji}  `,
        ` ${emoji}   `,
        `  ${emoji}  `,
        `   ${emoji} `,
        `  ${emoji}  `,
      ];
    }
    if (type === 'pulse') {
      return [
        `\x1b[2m${emoji}\x1b[0m`,
        `\x1b[1m${emoji}\x1b[0m`,
        `${emoji}`,
        `\x1b[1m${emoji}\x1b[0m`,
        `\x1b[2m${emoji}\x1b[0m`,
      ];
    }
    return [emoji];
  }
}

module.exports = { Animations };
