'use strict';

/**
 * UTHY AGENTIC OS — Boot Animation & Login UI
 * Windows XP style boot sequence, Linux-style login prompt, ASCII art animations.
 */

const readline = require('readline');

// ═══════════════════════════════════════════════════════════
// ANSI HELPERS
// ═══════════════════════════════════════════════════════════

const E = '\x1b';
const rgb = (r, g, b) => `${E}[38;2;${r};${g};${b}m`;
const bgRgb = (r, g, b) => `${E}[48;2;${r};${g};${b}m`;
const reset = () => `${E}[0m`;
const bold = (s) => `${E}[1m${s}${E}[0m`;
const dim = (s) => `${E}[2m${s}${E}[0m`;
const clear = () => `${E}[2J${E}[H`;
const move = (r, c) => `${E}[${r};${c}H`;
const clearLine = () => `${E}[2K`;
const hideCursor = () => `${E}[?25l`;
const showCursor = () => `${E}[?25h`;
const save = () => `${E}[s`;
const restore = () => `${E}[u`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function termSize() {
  return { cols: process.stdout.columns || 80, rows: process.stdout.rows || 24 };
}

function center(text, width) {
  const len = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').length;
  const pad = Math.max(0, Math.floor((width - len) / 2));
  return ' '.repeat(pad) + text;
}

function lerpC(a, b, t) {
  return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
}

// ═══════════════════════════════════════════════════════════
// ASCII ART LOGOS
// ═══════════════════════════════════════════════════════════

const BOOT_LOGO = [
  ' ██╗   ██╗████████╗██╗  ██╗██╗   ██╗',
  ' ██║   ██║╚══██╔══╝██║  ██║╚██╗ ██╔╝',
  ' ██║   ██║   ██║   ███████║ ╚████╔╝ ',
  ' ██║   ██║   ██║   ██╔══██║  ╚██╔╝  ',
  ' ╚██████╔╝   ██║   ██║  ██║   ██║   ',
  '  ╚═════╝    ╚═╝   ╚═╝  ╚═╝   ╚═╝   ',
];

const BOOT_SUBTITLE = 'A G E N T I C    O S';

// ═══════════════════════════════════════════════════════════
// WINDOWS XP BOOT ANIMATION
// ═══════════════════════════════════════════════════════════

async function xpBootAnimation(authEngine, isTTY) {
  if (!isTTY) {
    // Piped mode: skip animation, auto-login or skip
    const session = authEngine.init();
    return session;
  }

  const { cols, rows } = termSize();
  process.stdout.write(hideCursor() + clear());

  // ── Phase 1: Boot Logo ──
  const logoStartRow = Math.max(2, Math.floor(rows / 2) - 8);

  // Fade in logo
  for (let i = 0; i < BOOT_LOGO.length; i++) {
    const line = BOOT_LOGO[i];
    const colors = [[0,255,255],[0,200,255],[100,100,255],[200,0,255],[255,0,200],[255,100,100]];
    const c = colors[i % colors.length];
    process.stdout.write(move(logoStartRow + i, Math.max(1, Math.floor((cols - 38) / 2))));
    process.stdout.write(rgb(c[0], c[1], c[2]) + bold(line) + reset());
    await sleep(80);
  }

  // Subtitle
  const subRow = logoStartRow + BOOT_LOGO.length + 1;
  process.stdout.write(move(subRow, Math.max(1, Math.floor((cols - BOOT_SUBTITLE.length) / 2))));
  process.stdout.write(dim(rgb(150, 150, 180) + BOOT_SUBTITLE + reset()));
  await sleep(300);

  // ── Phase 2: XP-Style Triple Progress Bar ──
  const barRow = subRow + 3;
  const barWidth = Math.min(40, Math.floor(cols / 3) - 4);
  const totalWidth = barWidth * 3 + 6;
  const barStartCol = Math.max(1, Math.floor((cols - totalWidth) / 2));

  const spinnerFrames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let spinIdx = 0;

  // Draw 3 bars
  const barColors = [
    [0, 100, 200],   // blue
    [0, 120, 220],   // lighter blue
    [0, 140, 240],   // lightest blue
  ];

  for (let bar = 0; bar < 3; bar++) {
    const barCol = barStartCol + bar * (barWidth + 2);
    const bc = barColors[bar];

    // Draw empty bar border
    process.stdout.write(move(barRow, barCol));
    process.stdout.write(dim(rgb(60, 60, 80) + '┌' + '─'.repeat(barWidth) + '┐' + reset()));
    process.stdout.write(move(barRow + 1, barCol));
    process.stdout.write(dim(rgb(60, 60, 80) + '│' + ' '.repeat(barWidth) + '│' + reset()));
    process.stdout.write(move(barRow + 2, barCol));
    process.stdout.write(dim(rgb(60, 60, 80) + '└' + '─'.repeat(barWidth) + '┘' + reset()));

    // Fill the bar
    for (let i = 0; i < barWidth; i++) {
      const progress = (i + 1) / barWidth;

      // Gradient fill
      const fillC = lerpC([0, 60, 120], bc, progress);
      process.stdout.write(move(barRow + 1, barCol + 1 + i));
      process.stdout.write(rgb(fillC[0], fillC[1], fillC[2]) + '█' + reset());

      // Spinner below bars
      process.stdout.write(move(barRow + 4, Math.floor(cols / 2) - 1));
      process.stdout.write(rgb(0, 200, 255) + spinnerFrames[spinIdx++ % spinnerFrames.length] + reset());

      // Percentage text
      const pct = Math.round(((bar * barWidth + i + 1) / (barWidth * 3)) * 100);
      process.stdout.write(move(barRow + 4, Math.floor(cols / 2) + 2));
      process.stdout.write(dim(rgb(150, 150, 180) + `Loading ${pct}%` + reset()));

      await sleep(25);
    }
  }

  // ── Phase 3: Boot messages ──
  const msgRow = barRow + 6;
  const bootMsgs = [
    'Initializing kernel modules...',
    'Loading authentication service...',
    'Starting terminal interface...',
    'Mounting user filesystem...',
    'Starting UTHY AGENTIC OS...',
  ];

  for (const msg of bootMsgs) {
    process.stdout.write(move(msgRow, Math.max(1, Math.floor((cols - msg.length) / 2))));
    process.stdout.write(clearLine());
    process.stdout.write(dim(rgb(0, 200, 150) + '  ' + msg + reset()));
    await sleep(200);
  }

  await sleep(300);

  // ── Phase 4: Initialize auth ──
  const session = authEngine.init();

  // Transition fade
  process.stdout.write(clear());
  await sleep(200);

  process.stdout.write(showCursor());
  return session;
}

// ═══════════════════════════════════════════════════════════
// LOGIN PROMPT (Linux-style)
// ═══════════════════════════════════════════════════════════

async function loginPrompt(authEngine, isTTY) {
  if (!isTTY) return { autoLogin: true, username: 'guest' };

  const { cols, rows } = termSize();
  const W = Math.min(50, cols - 4);
  const startRow = Math.max(2, Math.floor(rows / 2) - 6);
  const startCol = Math.max(1, Math.floor((cols - W) / 2));

  // Draw login box
  function drawBox(username, password, error, mode) {
    let r = startRow;

    // Title
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 200, 255) + dim('── UTHY AGENTIC OS ──') + reset(), cols));

    // Top border
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 150, 200) + '╭' + '─'.repeat(W - 2) + '╮' + reset(), cols));

    // Empty line
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 150, 200) + '│' + reset() + ' '.repeat(W - 2) + rgb(0, 150, 200) + '│' + reset(), cols));

    // Mode indicator
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    const modeText = mode === 'register' ? '  CREATE NEW ACCOUNT' : '  SYSTEM LOGIN';
    const modePadded = modeText + ' '.repeat(Math.max(0, W - 4 - modeText.length));
    process.stdout.write(center(rgb(0, 150, 200) + '│' + reset() + bold(rgb(255, 255, 255) + modePadded + reset()) + rgb(0, 150, 200) + '│' + reset(), cols));

    // Divider
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 150, 200) + '│' + reset() + dim(rgb(60, 60, 80) + '┈'.repeat(W - 2) + reset()) + rgb(0, 150, 200) + '│' + reset(), cols));

    // Username field
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    const userLabel = '  login: ';
    const userVal = username || '';
    const userPad = Math.max(0, W - 2 - userLabel.length - userVal.length - 1);
    process.stdout.write(center(
      rgb(0, 150, 200) + '│' + reset() +
      rgb(0, 200, 255) + userLabel + reset() +
      rgb(255, 255, 255) + userVal + reset() +
      (username !== null ? '' : dim(rgb(100, 100, 120) + '_' + reset())) +
      ' '.repeat(userPad) +
      rgb(0, 150, 200) + '│' + reset(), cols));

    // Password field
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    const passLabel = '  password: ';
    const passDisplay = password !== null ? '*'.repeat(password.length) : '';
    const passPad = Math.max(0, W - 2 - passLabel.length - passDisplay.length - 1);
    process.stdout.write(center(
      rgb(0, 150, 200) + '│' + reset() +
      rgb(0, 200, 255) + passLabel + reset() +
      rgb(255, 255, 255) + passDisplay + reset() +
      (password !== null ? '' : dim(rgb(100, 100, 120) + '_' + reset())) +
      ' '.repeat(passPad) +
      rgb(0, 150, 200) + '│' + reset(), cols));

    // Confirm password field (register mode)
    if (mode === 'register') {
      process.stdout.write(move(r++, startCol));
      process.stdout.write(clearLine());
      const confLabel = '  confirm: ';
      const confDisplay = '';
      const confPad = Math.max(0, W - 2 - confLabel.length - 1);
      process.stdout.write(center(
        rgb(0, 150, 200) + '│' + reset() +
        rgb(0, 200, 255) + confLabel + reset() +
        dim(rgb(100, 100, 120) + '_' + reset()) +
        ' '.repeat(confPad) +
        rgb(0, 150, 200) + '│' + reset(), cols));
    }

    // Empty line
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 150, 200) + '│' + reset() + ' '.repeat(W - 2) + rgb(0, 150, 200) + '│' + reset(), cols));

    // Error message
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    if (error) {
      const errText = `  ✗ ${error}`;
      const errPad = Math.max(0, W - 2 - errText.length);
      process.stdout.write(center(
        rgb(0, 150, 200) + '│' + reset() +
        rgb(255, 80, 80) + errText + reset() +
        ' '.repeat(errPad) +
        rgb(0, 150, 200) + '│' + reset(), cols));
    } else {
      process.stdout.write(center(rgb(0, 150, 200) + '│' + reset() + ' '.repeat(W - 2) + rgb(0, 150, 200) + '│' + reset(), cols));
    }

    // Bottom border
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 150, 200) + '╰' + '─'.repeat(W - 2) + '╯' + reset(), cols));

    // Instructions
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(dim(rgb(100, 100, 120) + 'Ctrl+C to exit · Enter to submit' + reset()), cols));

    return r;
  }

  // ── Interactive login loop ──
  return new Promise((resolve) => {
    let username = '';
    let password = '';
    let field = 'username'; // 'username' | 'password'
    let error = '';
    let mode = 'login'; // 'login' | 'register'
    let confirmPass = '';
    let fieldIdx = 0; // 0=username, 1=password, 2=confirm

    process.stdout.write(clear());
    drawBox('', '', '', mode);

    // Raw input mode
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    function onData(ch) {
      const code = ch.charCodeAt(0);

      // Ctrl+C
      if (code === 3) {
        cleanup();
        process.stdout.write(clear() + showCursor());
        process.exit(0);
      }

      // Enter
      if (code === 13) {
        if (mode === 'login') {
          if (fieldIdx === 0 && username.length > 0) {
            fieldIdx = 1;
            drawBox(username, '', error, mode);
            return;
          }
          if (fieldIdx === 1 && password.length > 0) {
            // Attempt login
            process.stdout.write(move(startRow + 12, Math.max(1, Math.floor(cols / 2) - 10)));
            process.stdout.write(clearLine());
            process.stdout.write(center(dim(rgb(0, 200, 255) + '  ⠋ Authenticating...' + reset()), cols));

            const result = authEngine.authenticate(username, password);

            if (result.success) {
              cleanup();
              resolve({ autoLogin: false, username: result.username, newUser: false });
              return;
            }

            if (result.error === 'user_not_found') {
              mode = 'register';
              error = `User "${username}" not found. Create account?`;
              fieldIdx = 1;
              password = '';
              confirmPass = '';
              drawBox(username, '', error, mode);
              return;
            }

            error = 'Invalid password';
            password = '';
            fieldIdx = 1;
            drawBox(username, '', error, mode);
            return;
          }
        }

        if (mode === 'register') {
          if (fieldIdx === 0 && username.length > 0) {
            fieldIdx = 1;
            drawBox(username, '', error, mode);
            return;
          }
          if (fieldIdx === 1 && password.length > 0) {
            fieldIdx = 2;
            drawBox(username, password, error, mode);
            return;
          }
          if (fieldIdx === 2) {
            if (confirmPass !== password) {
              error = 'Passwords do not match';
              confirmPass = '';
              fieldIdx = 2;
              drawBox(username, password, error, mode);
              return;
            }

            // Register
            const result = authEngine.register(username, password);
            if (result.success) {
              cleanup();
              resolve({ autoLogin: false, username: result.username, newUser: true });
              return;
            }

            error = result.error;
            if (result.error === 'user_exists') {
              mode = 'login';
              fieldIdx = 1;
              password = '';
            }
            drawBox(username, password, error, mode);
            return;
          }
        }
        return;
      }

      // Tab — switch fields
      if (code === 9) {
        fieldIdx = (fieldIdx + 1) % (mode === 'register' ? 3 : 2);
        drawBox(username, password, error, mode);
        return;
      }

      // Escape — switch between login/register
      if (code === 27) {
        mode = mode === 'login' ? 'register' : 'login';
        fieldIdx = 0;
        error = '';
        password = '';
        confirmPass = '';
        drawBox(username, '', '', mode);
        return;
      }

      // Backspace
      if (code === 127 || code === 8) {
        if (fieldIdx === 0) username = username.slice(0, -1);
        else if (fieldIdx === 1) password = password.slice(0, -1);
        else if (fieldIdx === 2) confirmPass = confirmPass.slice(0, -1);
        error = '';
        drawBox(username, password, '', mode);
        return;
      }

      // Regular character
      if (code >= 32 && code <= 126) {
        if (fieldIdx === 0) username += ch;
        else if (fieldIdx === 1) password += ch;
        else if (fieldIdx === 2) confirmPass += ch;
        error = '';
        drawBox(username, password, '', mode);
      }
    }

    function cleanup() {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('data', onData);

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      cleanup();
      process.stdout.write(clear() + showCursor());
      process.exit(0);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// WELCOME ANIMATION
// ═══════════════════════════════════════════════════════════

async function welcomeAnimation(username, isNewUser, isTTY) {
  if (!isTTY) return;

  const { cols, rows } = termSize();
  process.stdout.write(clear());

  const centerCol = Math.floor(cols / 2);
  const centerRow = Math.floor(rows / 2);

  // ASCII art welcome
  const welcomeArt = [
    ` __        __   _   _ _____ _____ `,
    ` \\ \\      / /__| |_| |_   _|_   _|`,
    `  \\ \\ /\\ / / _ \\ __| | | |   | |  `,
    `   \\ V  V /  __/ |_| | | |   | |  `,
    `    \\_/\\_/ \\___|\\__|_| |_|   |_|  `,
  ];

  const greeting = isNewUser
    ? `Welcome to UTHY, ${username}! Your account has been created.`
    : `Welcome back, ${username}!`;

  // Type out welcome art
  for (let i = 0; i < welcomeArt.length; i++) {
    const line = welcomeArt[i];
    const colors = [[0,255,255],[0,200,255],[100,100,255],[200,0,255],[255,0,200]];
    const c = colors[i % colors.length];
    process.stdout.write(move(centerRow - 4 + i, Math.max(1, centerCol - 18)));
    process.stdout.write(rgb(c[0], c[1], c[2]) + bold(line) + reset());
    await sleep(60);
  }

  // Greeting text with typewriter effect
  const greetRow = centerRow + 3;
  process.stdout.write(move(greetRow, Math.max(1, centerCol - Math.floor(greeting.length / 2))));
  for (let i = 0; i < greeting.length; i++) {
    process.stdout.write(rgb(255, 255, 255) + greeting[i] + reset());
    await sleep(20);
  }

  // Decorative line
  const decoRow = greetRow + 2;
  const deco = '━'.repeat(Math.min(50, cols - 4));
  process.stdout.write(move(decoRow, Math.max(1, centerCol - Math.floor(deco.length / 2))));
  process.stdout.write(dim(rgb(0, 150, 200) + deco + reset()));

  // Loading message
  const loadRow = decoRow + 2;
  process.stdout.write(move(loadRow, Math.max(1, centerCol - 15)));
  process.stdout.write(dim(rgb(0, 200, 150) + '  Starting UTHY AGENTIC OS...' + reset()));

  await sleep(1000);
  process.stdout.write(clear());
}

// ═══════════════════════════════════════════════════════════
// ERROR SHAKE ANIMATION
// ═══════════════════════════════════════════════════════════

async function shakeError(text, row, cols) {
  const centerCol = Math.max(1, Math.floor(cols / 2) - Math.floor(text.length / 2));
  for (let i = 0; i < 6; i++) {
    const offset = i % 2 === 0 ? -2 : 2;
    process.stdout.write(move(row, centerCol + offset));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(255, 80, 80) + bold(text) + reset(), cols));
    await sleep(50);
  }
}

// ═══════════════════════════════════════════════════════════
// FULL BOOT + LOGIN FLOW
// ═══════════════════════════════════════════════════════════

async function bootAndLogin(authEngine, isTTY) {
  // Phase 1: Boot animation
  const session = await xpBootAnimation(authEngine, isTTY);

  // Phase 2: Auto-login check
  if (session.autoLogin) {
    await welcomeAnimation(session.username, false, isTTY);
    return { username: session.username, newUser: false };
  }

  // Phase 3: First-time setup — no users exist, create account
  const users = authEngine.listUsers();
  if (users.length === 0) {
    const result = await firstTimeSetup(authEngine, isTTY);
    await welcomeAnimation(result.username, true, isTTY);
    return result;
  }

  // Phase 4: Login prompt (existing users)
  const loginResult = await loginPrompt(authEngine, isTTY);

  // Phase 5: Welcome animation
  await welcomeAnimation(loginResult.username, loginResult.newUser, isTTY);

  return loginResult;
}

// ═══════════════════════════════════════════════════════════
// FIRST-TIME SETUP (no users exist)
// ═══════════════════════════════════════════════════════════

async function firstTimeSetup(authEngine, isTTY) {
  if (!isTTY) return { username: 'admin', newUser: true };

  const { cols, rows } = termSize();
  const W = Math.min(54, cols - 4);
  const startRow = Math.max(2, Math.floor(rows / 2) - 8);
  const startCol = Math.max(1, Math.floor((cols - W) / 2));

  function drawSetup(username, password, confirm, error, step) {
    let r = startRow;

    // Title
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 255, 200) + bold('✦ FIRST TIME SETUP ✦') + reset(), cols));

    // Subtitle
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(dim(rgb(150, 150, 180) + 'No accounts found. Create your admin account.' + reset()), cols));

    // Top border
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 200, 150) + '╭' + '─'.repeat(W - 2) + '╮' + reset(), cols));

    // Step indicator
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    const stepText = step === 'username' ? '  STEP 1/2: Choose username' : '  STEP 2/2: Set password';
    const stepPad = Math.max(0, W - 4 - stepText.length);
    process.stdout.write(center(
      rgb(0, 200, 150) + '│' + reset() +
      bold(rgb(255, 255, 255) + stepText + reset()) +
      ' '.repeat(stepPad) +
      rgb(0, 200, 150) + '│' + reset(), cols));

    // Divider
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 200, 150) + '│' + reset() + dim(rgb(60, 60, 80) + '┈'.repeat(W - 2) + reset()) + rgb(0, 200, 150) + '│' + reset(), cols));

    // Username field
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    const uLabel = '  username: ';
    const uVal = username || '';
    const uPad = Math.max(0, W - 2 - uLabel.length - uVal.length - 1);
    const uActive = step === 'username';
    process.stdout.write(center(
      rgb(0, 200, 150) + '│' + reset() +
      rgb(0, 200, 255) + uLabel + reset() +
      (uActive ? bold(rgb(255, 255, 255) + uVal + reset()) : rgb(180, 180, 200) + uVal + reset()) +
      (uActive && !username ? dim(rgb(100, 100, 120) + '_' + reset()) : '') +
      ' '.repeat(uPad) +
      rgb(0, 200, 150) + '│' + reset(), cols));

    // Password field
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    const pLabel = '  password: ';
    const pDisplay = password ? '*'.repeat(password.length) : '';
    const pPad = Math.max(0, W - 2 - pLabel.length - pDisplay.length - 1);
    const pActive = step === 'password';
    process.stdout.write(center(
      rgb(0, 200, 150) + '│' + reset() +
      rgb(0, 200, 255) + pLabel + reset() +
      (pActive ? bold(rgb(255, 255, 255) + pDisplay + reset()) : rgb(180, 180, 200) + pDisplay + reset()) +
      (pActive && !password ? dim(rgb(100, 100, 120) + '_' + reset()) : '') +
      ' '.repeat(pPad) +
      rgb(0, 200, 150) + '│' + reset(), cols));

    // Confirm field (only in password step)
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    if (step === 'password') {
      const cLabel = '  confirm:  ';
      const cDisplay = confirm ? '*'.repeat(confirm.length) : '';
      const cPad = Math.max(0, W - 2 - cLabel.length - cDisplay.length - 1);
      process.stdout.write(center(
        rgb(0, 200, 150) + '│' + reset() +
        rgb(0, 200, 255) + cLabel + reset() +
        bold(rgb(255, 255, 255) + cDisplay + reset()) +
        (!confirm ? dim(rgb(100, 100, 120) + '_' + reset()) : '') +
        ' '.repeat(cPad) +
        rgb(0, 200, 150) + '│' + reset(), cols));
    } else {
      process.stdout.write(center(rgb(0, 200, 150) + '│' + reset() + ' '.repeat(W - 2) + rgb(0, 200, 150) + '│' + reset(), cols));
    }

    // Empty
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 200, 150) + '│' + reset() + ' '.repeat(W - 2) + rgb(0, 200, 150) + '│' + reset(), cols));

    // Error / hint
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    if (error) {
      const errText = `  ✗ ${error}`;
      const errPad = Math.max(0, W - 2 - errText.length);
      process.stdout.write(center(
        rgb(0, 200, 150) + '│' + reset() +
        rgb(255, 80, 80) + errText + reset() +
        ' '.repeat(errPad) +
        rgb(0, 200, 150) + '│' + reset(), cols));
    } else {
      const hint = step === 'username'
        ? '  Choose a username (letters, numbers, dots, dashes)'
        : '  Set a password (min 4 characters)';
      const hintPad = Math.max(0, W - 2 - hint.length);
      process.stdout.write(center(
        rgb(0, 200, 150) + '│' + reset() +
        dim(rgb(100, 150, 130) + hint + reset()) +
        ' '.repeat(hintPad) +
        rgb(0, 200, 150) + '│' + reset(), cols));
    }

    // Bottom border
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 200, 150) + '╰' + '─'.repeat(W - 2) + '╯' + reset(), cols));

    // Instructions
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(dim(rgb(100, 100, 120) + 'Enter to continue · Ctrl+C to exit' + reset()), cols));

    return r;
  }

  // Interactive setup loop
  return new Promise((resolve) => {
    let username = '';
    let password = '';
    let confirm = '';
    let error = '';
    let step = 'username';

    process.stdout.write(clear());
    drawSetup('', '', '', '', step);

    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    function onData(ch) {
      const code = ch.charCodeAt(0);

      // Ctrl+C
      if (code === 3) {
        cleanup();
        process.stdout.write(clear() + showCursor());
        process.exit(0);
      }

      // Enter
      if (code === 13) {
        if (step === 'username') {
          if (username.length < 2) {
            error = 'Username must be at least 2 characters';
            drawSetup(username, password, confirm, error, step);
            return;
          }
          if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
            error = 'Only letters, numbers, dots, dashes, underscores';
            drawSetup(username, password, confirm, error, step);
            return;
          }
          step = 'password';
          error = '';
          drawSetup(username, password, confirm, '', step);
          return;
        }

        if (step === 'password') {
          if (password.length < 4) {
            error = 'Password must be at least 4 characters';
            drawSetup(username, password, confirm, error, step);
            return;
          }
          if (password !== confirm) {
            error = 'Passwords do not match';
            confirm = '';
            drawSetup(username, password, confirm, error, step);
            return;
          }

          // Register
          const result = authEngine.register(username, password);
          if (result.success) {
            cleanup();
            resolve({ username: result.username, newUser: true });
            return;
          }
          error = result.error;
          drawSetup(username, password, confirm, error, step);
          return;
        }
        return;
      }

      // Backspace
      if (code === 127 || code === 8) {
        if (step === 'username') username = username.slice(0, -1);
        else if (step === 'password' && confirm.length > 0) confirm = confirm.slice(0, -1);
        else if (step === 'password') password = password.slice(0, -1);
        error = '';
        drawSetup(username, password, confirm, '', step);
        return;
      }

      // Regular character
      if (code >= 32 && code <= 126) {
        if (step === 'username') username += ch;
        else if (step === 'password' && password.length < 4) password += ch;
        else if (step === 'password') confirm += ch;
        error = '';
        drawSetup(username, password, confirm, '', step);
      }
    }

    function cleanup() {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('data', onData);
  });
}

// ═══════════════════════════════════════════════════════════
// SWITCH USER PROMPT
// ═══════════════════════════════════════════════════════════

async function switchUserPrompt(authEngine, currentUser, isTTY) {
  if (!isTTY) return { success: false, error: 'Not available in piped mode' };

  const users = authEngine.listUsers();
  const { cols, rows } = termSize();
  const W = Math.min(44, cols - 4);
  const startRow = Math.max(2, Math.floor(rows / 2) - Math.floor(users.length / 2) - 4);
  const startCol = Math.max(1, Math.floor((cols - W) / 2));

  let selectedIdx = users.findIndex(u => u.username === currentUser);
  if (selectedIdx < 0) selectedIdx = 0;

  function drawUserList() {
    let r = startRow;

    // Title
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 200, 255) + bold('── SWITCH USER ──') + reset(), cols));

    // Top border
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 150, 200) + '╭' + '─'.repeat(W - 2) + '╮' + reset(), cols));

    // User list
    for (let i = 0; i < users.length; i++) {
      process.stdout.write(move(r++, startCol));
      process.stdout.write(clearLine());
      const isSelected = i === selectedIdx;
      const isCurrent = users[i].username === currentUser;
      const arrow = isSelected ? rgb(0, 255, 200) + ' ▸ ' + reset() : '   ';
      const name = isSelected
        ? bold(rgb(255, 255, 255) + users[i].username + reset())
        : rgb(180, 180, 200) + users[i].username + reset();
      const tag = isCurrent ? rgb(0, 200, 150) + ' (current)' + reset() : '';
      const line = `${arrow}${name}${tag}`;
      const linePad = Math.max(0, W - 4 - users[i].username.length - (isCurrent ? 10 : 0) - 3);
      process.stdout.write(center(
        rgb(0, 150, 200) + '│' + reset() +
        line + ' '.repeat(linePad) +
        rgb(0, 150, 200) + '│' + reset(), cols));
    }

    // Add new user option
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    const addSelected = selectedIdx === users.length;
    const addArrow = addSelected ? rgb(0, 255, 200) + ' ▸ ' + reset() : '   ';
    const addText = addSelected
      ? bold(rgb(255, 200, 0) + '+ Create new account' + reset())
      : rgb(150, 150, 100) + '+ Create new account' + reset();
    const addPad = Math.max(0, W - 4 - 22 - 3);
    process.stdout.write(center(
      rgb(0, 150, 200) + '│' + reset() +
      `${addArrow}${addText}` + ' '.repeat(addPad) +
      rgb(0, 150, 200) + '│' + reset(), cols));

    // Empty
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 150, 200) + '│' + reset() + ' '.repeat(W - 2) + rgb(0, 150, 200) + '│' + reset(), cols));

    // Bottom border
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(rgb(0, 150, 200) + '╰' + '─'.repeat(W - 2) + '╯' + reset(), cols));

    // Instructions
    process.stdout.write(move(r++, startCol));
    process.stdout.write(clearLine());
    process.stdout.write(center(dim(rgb(100, 100, 120) + '↑↓ Navigate · Enter to select · Esc to cancel' + reset()), cols));
  }

  return new Promise((resolve) => {
    process.stdout.write(clear());
    drawUserList();

    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    function onData(ch) {
      const code = ch.charCodeAt(0);

      // Escape — cancel
      if (code === 27) {
        cleanup();
        resolve({ success: false, error: 'cancelled' });
        return;
      }

      // Up arrow
      if (ch === '\x1b[A') {
        selectedIdx = Math.max(0, selectedIdx - 1);
        drawUserList();
        return;
      }

      // Down arrow
      if (ch === '\x1b[B') {
        selectedIdx = Math.min(users.length, selectedIdx + 1);
        drawUserList();
        return;
      }

      // Enter
      if (code === 13) {
        cleanup();

        if (selectedIdx === users.length) {
          // Create new account — return special signal
          resolve({ success: true, action: 'create' });
          return;
        }

        const selected = users[selectedIdx];
        if (selected.username === currentUser) {
          resolve({ success: false, error: 'Already logged in as ' + currentUser });
          return;
        }

        resolve({ success: true, action: 'switch', username: selected.username });
        return;
      }

      // Number keys for quick select
      if (code >= 49 && code <= 57) { // 1-9
        const idx = code - 49;
        if (idx < users.length) {
          cleanup();
          const selected = users[idx];
          resolve({ success: true, action: 'switch', username: selected.username });
          return;
        }
      }
    }

    function cleanup() {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.on('data', onData);
  });
}

module.exports = {
  xpBootAnimation,
  loginPrompt,
  welcomeAnimation,
  shakeError,
  bootAndLogin,
  firstTimeSetup,
  switchUserPrompt,
};
