'use strict';

/**
 * UTHY AGENTIC OS — Authentication Engine
 * Terminal-based Linux-style login with SHA-256 hashed passwords.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const AUTH_DIR = path.join(os.homedir(), '.uthy', 'auth');
const USERS_DIR = path.join(AUTH_DIR, 'users');
const SESSION_FILE = path.join(AUTH_DIR, 'session.json');

class AuthEngine {
  constructor() {
    this.authDir = AUTH_DIR;
    this.usersDir = USERS_DIR;
    this.sessionFile = SESSION_FILE;
    this.currentUser = null;
  }

  // ── Initialize auth directories ─────────────────────────

  init() {
    if (!fs.existsSync(this.authDir)) fs.mkdirSync(this.authDir, { recursive: true });
    if (!fs.existsSync(this.usersDir)) fs.mkdirSync(this.usersDir, { recursive: true });

    // Check for existing session
    try {
      if (fs.existsSync(this.sessionFile)) {
        const session = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
        if (session.username && session.loggedIn) {
          this.currentUser = session.username;
          return { autoLogin: true, username: session.username };
        }
      }
    } catch (_) {}

    return { autoLogin: false };
  }

  // ── Hash password with SHA-256 ──────────────────────────

  hashPassword(password) {
    return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
  }

  // ── Check if user exists ────────────────────────────────

  userExists(username) {
    const userFile = path.join(this.usersDir, this._sanitize(username));
    return fs.existsSync(userFile);
  }

  // ── Get list of all users ───────────────────────────────

  listUsers() {
    try {
      return fs.readdirSync(this.usersDir)
        .filter(f => !f.startsWith('.'))
        .map(f => {
          try {
            const content = fs.readFileSync(path.join(this.usersDir, f), 'utf8').split('\n');
            return { username: content[0] || f, created: content[2] || 'unknown' };
          } catch (_) {
            return { username: f, created: 'unknown' };
          }
        });
    } catch (_) {
      return [];
    }
  }

  // ── Authenticate user ───────────────────────────────────

  authenticate(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }

    const userFile = path.join(this.usersDir, this._sanitize(username));

    if (!fs.existsSync(userFile)) {
      return { success: false, error: 'user_not_found', username };
    }

    try {
      const content = fs.readFileSync(userFile, 'utf8').split('\n');
      const storedHash = content[1];
      const inputHash = this.hashPassword(password);

      if (storedHash === inputHash) {
        this.currentUser = username;
        this._saveSession(username);
        return { success: true, username };
      } else {
        return { success: false, error: 'invalid_password' };
      }
    } catch (e) {
      return { success: false, error: `Auth error: ${e.message}` };
    }
  }

  // ── Register new user ───────────────────────────────────

  register(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }

    if (username.length < 2 || username.length > 32) {
      return { success: false, error: 'Username must be 2-32 characters' };
    }

    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters' };
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return { success: false, error: 'Username: only letters, numbers, dots, dashes, underscores' };
    }

    const userFile = path.join(this.usersDir, this._sanitize(username));

    if (fs.existsSync(userFile)) {
      return { success: false, error: 'user_exists' };
    }

    try {
      const hash = this.hashPassword(password);
      const content = `${username}\n${hash}\n${new Date().toISOString()}\n`;
      // Atomic write: write to temp then rename
      const tmpFile = userFile + '.tmp';
      fs.writeFileSync(tmpFile, content, 'utf8');
      fs.renameSync(tmpFile, userFile);

      this.currentUser = username;
      this._saveSession(username);
      return { success: true, username };
    } catch (e) {
      return { success: false, error: `Registration failed: ${e.message}` };
    }
  }

  // ── Change password ─────────────────────────────────────

  changePassword(username, oldPassword, newPassword) {
    const auth = this.authenticate(username, oldPassword);
    if (!auth.success) {
      return { success: false, error: 'Current password incorrect' };
    }

    if (newPassword.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters' };
    }

    try {
      const userFile = path.join(this.usersDir, this._sanitize(username));
      const content = fs.readFileSync(userFile, 'utf8').split('\n');
      const hash = this.hashPassword(newPassword);
      content[1] = hash;
      fs.writeFileSync(userFile, content.join('\n'), 'utf8');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ── Delete user ─────────────────────────────────────────

  deleteUser(username) {
    const userFile = path.join(this.usersDir, this._sanitize(username));
    if (!fs.existsSync(userFile)) {
      return { success: false, error: 'User not found' };
    }
    try {
      fs.unlinkSync(userFile);
      if (this.currentUser === username) {
        this.currentUser = null;
        this._clearSession();
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ── Logout ──────────────────────────────────────────────

  logout() {
    this.currentUser = null;
    this._clearSession();
    return { success: true };
  }

  // ── Get current session ─────────────────────────────────

  getSession() {
    return {
      loggedIn: !!this.currentUser,
      username: this.currentUser,
    };
  }

  // ── Private helpers ─────────────────────────────────────

  _sanitize(username) {
    return username.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  _saveSession(username) {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify({
        username,
        loggedIn: true,
        loginTime: new Date().toISOString(),
      }, null, 2), 'utf8');
    } catch (_) {}
  }

  _clearSession() {
    try {
      if (fs.existsSync(this.sessionFile)) fs.unlinkSync(this.sessionFile);
    } catch (_) {}
  }

  // ── Stats ───────────────────────────────────────────────

  stats() {
    const users = this.listUsers();
    return {
      totalUsers: users.length,
      currentUser: this.currentUser,
      users: users.map(u => u.username),
    };
  }
}

module.exports = { AuthEngine };
