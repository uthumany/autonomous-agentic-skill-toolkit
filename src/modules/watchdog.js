'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const os = require('os');
const crypto = require('crypto');

class WatchdogEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy');
    this.watchdogDir = path.join(this.baseDir, 'watchdog');
    this.watchesFile = path.join(this.watchdogDir, 'watches.json');
    this.heartbeatFile = path.join(this.watchdogDir, 'heartbeat.json');
    this.nudgesFile = path.join(this.watchdogDir, 'nudges.json');
    this.watches = [];
    this.monitorInterval = null;
    this._initialized = false;
  }

  async init() {
    fs.mkdirSync(this.watchdogDir, { recursive: true });
    // Load existing watches
    if (fs.existsSync(this.watchesFile)) {
      try {
        this.watches = JSON.parse(fs.readFileSync(this.watchesFile, 'utf8'));
      } catch {
        this.watches = [];
      }
    }
    // Init heartbeat if missing
    if (!fs.existsSync(this.heartbeatFile)) {
      this._writeJson(this.heartbeatFile, { lastActivity: new Date().toISOString(), history: [] });
    }
    // Init nudges if missing
    if (!fs.existsSync(this.nudgesFile)) {
      this._writeJson(this.nudgesFile, []);
    }
    this._initialized = true;
    return this;
  }

  addWatch(target, type, interval) {
    if (!['url', 'file', 'process'].includes(type)) {
      throw new Error(`Invalid watch type: ${type}. Must be url, file, or process.`);
    }
    const watch = {
      id: crypto.randomUUID(),
      target,
      type,
      interval: interval || 60000,
      lastCheck: null,
      status: 'pending',
      changes: [],
      previousState: null,
      created: new Date().toISOString()
    };
    this.watches.push(watch);
    this._saveWatches();
    return { ...watch };
  }

  removeWatch(id) {
    const idx = this.watches.findIndex(w => w.id === id);
    if (idx === -1) return false;
    this.watches.splice(idx, 1);
    this._saveWatches();
    return true;
  }

  listWatches() {
    return this.watches.map(w => ({ ...w }));
  }

  async checkWatch(id) {
    const watch = this.watches.find(w => w.id === id);
    if (!watch) throw new Error(`Watch not found: ${id}`);

    const checked = new Date().toISOString();
    let status, details;

    try {
      if (watch.type === 'url') {
        const result = await this._checkUrl(watch.target);
        const changed = watch.previousState && (
          watch.previousState.statusCode !== result.statusCode ||
          watch.previousState.contentLength !== result.contentLength
        );
        status = changed ? 'changed' : 'ok';
        details = result;
        if (changed) {
          watch.changes.push({
            time: checked,
            from: watch.previousState,
            to: result
          });
        }
        watch.previousState = result;
      } else if (watch.type === 'file') {
        const result = await this._checkFile(watch.target);
        const changed = watch.previousState && (
          watch.previousState.mtime !== result.mtime ||
          watch.previousState.size !== result.size
        );
        status = changed ? 'changed' : 'ok';
        details = result;
        if (changed) {
          watch.changes.push({
            time: checked,
            from: watch.previousState,
            to: result
          });
        }
        watch.previousState = result;
      } else if (watch.type === 'process') {
        // Process check: see if a process with that name is running
        const running = await this._checkProcess(watch.target);
        status = running ? 'running' : 'stopped';
        details = { running };
      }
    } catch (err) {
      status = 'error';
      details = { error: err.message };
    }

    watch.lastCheck = checked;
    watch.status = status;
    this._saveWatches();

    return { status, details, checked };
  }

  async checkAll() {
    const results = [];
    for (const watch of this.watches) {
      try {
        const result = await this.checkWatch(watch.id);
        results.push({ id: watch.id, target: watch.target, ...result });
      } catch (err) {
        results.push({ id: watch.id, target: watch.target, status: 'error', details: { error: err.message }, checked: new Date().toISOString() });
      }
    }
    return results;
  }

  startMonitoring(intervalMs) {
    if (this.monitorInterval) this.stopMonitoring();
    const interval = intervalMs || 30000;
    this.monitorInterval = setInterval(async () => {
      const now = Date.now();
      for (const watch of this.watches) {
        const lastCheckMs = watch.lastCheck ? new Date(watch.lastCheck).getTime() : 0;
        if (now - lastCheckMs >= watch.interval) {
          try {
            await this.checkWatch(watch.id);
          } catch { /* ignore individual check failures */ }
        }
      }
    }, interval);
    return true;
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      return true;
    }
    return false;
  }

  heartbeat(activity) {
    const now = new Date().toISOString();
    let hb;
    try {
      hb = JSON.parse(fs.readFileSync(this.heartbeatFile, 'utf8'));
    } catch {
      hb = { lastActivity: now, history: [] };
    }
    hb.lastActivity = now;
    hb.lastActivityType = activity || 'unknown';
    hb.history.push({ time: now, activity });
    // Keep last 100 entries
    if (hb.history.length > 100) hb.history = hb.history.slice(-100);
    this._writeJson(this.heartbeatFile, hb);
    return { lastActivity: now, activity };
  }

  getHeartbeat() {
    let hb;
    try {
      hb = JSON.parse(fs.readFileSync(this.heartbeatFile, 'utf8'));
    } catch {
      return { lastActivity: null, idleMinutes: null, alert: false };
    }
    const lastActivity = hb.lastActivity ? new Date(hb.lastActivity) : null;
    const now = new Date();
    const idleMinutes = lastActivity ? Math.floor((now - lastActivity) / 60000) : null;
    const hour = now.getHours();
    const isWorkHours = hour >= 9 && hour < 21;
    const alert = isWorkHours && idleMinutes !== null && idleMinutes > 120;

    return {
      lastActivity: hb.lastActivity,
      lastActivityType: hb.lastActivityType || null,
      idleMinutes,
      alert,
      alertMessage: alert ? `Idle for ${idleMinutes} minutes during work hours!` : null
    };
  }

  nudge(message) {
    const nudges = this._loadNudges();
    const nudge = {
      id: crypto.randomUUID(),
      message,
      time: new Date().toISOString(),
      read: false
    };
    nudges.push(nudge);
    // Keep last 500 nudges
    const trimmed = nudges.length > 500 ? nudges.slice(-500) : nudges;
    this._writeJson(this.nudgesFile, trimmed);
    return nudge;
  }

  getNudges(limit) {
    const nudges = this._loadNudges();
    const n = limit || 20;
    return nudges.slice(-n).reverse();
  }

  stats() {
    const changedWatches = this.watches.filter(w => w.status === 'changed').length;
    const errorWatches = this.watches.filter(w => w.status === 'error').length;
    const activeAlerts = changedWatches + errorWatches;
    let lastHeartbeat = null;
    try {
      const hb = JSON.parse(fs.readFileSync(this.heartbeatFile, 'utf8'));
      lastHeartbeat = hb.lastActivity || null;
    } catch { /* ignore */ }

    return {
      totalWatches: this.watches.length,
      activeAlerts,
      lastHeartbeat,
      monitoring: !!this.monitorInterval
    };
  }

  // --- Private helpers ---

  _checkUrl(target) {
    return new Promise((resolve, reject) => {
      const url = new URL(target);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.get(target, { timeout: 10000 }, (res) => {
        let dataLen = 0;
        res.on('data', (chunk) => { dataLen += chunk.length; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            contentLength: dataLen,
            headers: {
              contentType: res.headers['content-type'] || null,
              lastModified: res.headers['last-modified'] || null
            }
          });
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
  }

  async _checkFile(target) {
    const absPath = path.isAbsolute(target) ? target : path.resolve(target);
    const stat = fs.statSync(absPath);
    return {
      exists: true,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      isFile: stat.isFile(),
      isDir: stat.isDirectory()
    };
  }

  async _checkProcess(name) {
    const { execSync } = require('child_process');
    try {
      const isWin = os.platform() === 'win32';
      const cmd = isWin
        ? `tasklist /FI "IMAGENAME eq ${name}" /NH`
        : `pgrep -f "${name}"`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 5000 });
      if (isWin) {
        return output.toLowerCase().includes(name.toLowerCase());
      }
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  _saveWatches() {
    this._writeJson(this.watchesFile, this.watches);
  }

  _loadNudges() {
    try {
      return JSON.parse(fs.readFileSync(this.nudgesFile, 'utf8'));
    } catch {
      return [];
    }
  }

  _writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

module.exports = { WatchdogEngine };
