'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const crypto = require('crypto');

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomBytes(6).toString('hex');
}

function now() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Schedule Parsing ───────────────────────────────────────────────────────

function parseInterval(schedule) {
  // Matches patterns like "30m", "2h", "1d", "45s"
  const match = schedule.match(/^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days)$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  let ms = 0;
  if (unit.startsWith('s')) ms = n * 1000;
  else if (unit.startsWith('m')) ms = n * 60 * 1000;
  else if (unit.startsWith('h')) ms = n * 60 * 60 * 1000;
  else if (unit.startsWith('d')) ms = n * 24 * 60 * 60 * 1000;
  return ms > 0 ? ms : null;
}

function parseCronField(field, min, max) {
  // Parse a single cron field into an array of matching values
  const values = new Set();

  if (field === '*') {
    for (let i = min; i <= max; i++) values.add(i);
    return values;
  }

  // Handle */step  (e.g. */5)
  const stepMatch = field.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    const step = parseInt(stepMatch[1], 10);
    for (let i = min; i <= max; i += step) values.add(i);
    return values;
  }

  // Handle ranges and lists: "1-5", "1,3,5", "1-5/2"
  const parts = field.split(',');
  for (const part of parts) {
    const rangeStepMatch = part.match(/^(\d+)-(\d+)\/(\d+)$/);
    if (rangeStepMatch) {
      const lo = parseInt(rangeStepMatch[1], 10);
      const hi = parseInt(rangeStepMatch[2], 10);
      const step = parseInt(rangeStepMatch[3], 10);
      for (let i = lo; i <= hi; i += step) values.add(i);
      continue;
    }
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1], 10);
      const hi = parseInt(rangeMatch[2], 10);
      for (let i = lo; i <= hi; i++) values.add(i);
      continue;
    }
    const num = parseInt(part, 10);
    if (!isNaN(num)) values.add(num);
  }

  return values;
}

function nextCronMatch(cronExpr, fromDate) {
  // Parse 5-field cron: minute hour dom month dow
  const fields = cronExpr.trim().split(/\s+/);
  if (fields.length !== 5) return null;

  const minutes = parseCronField(fields[0], 0, 59);
  const hours = parseCronField(fields[1], 0, 23);
  const doms = parseCronField(fields[2], 1, 31);
  const months = parseCronField(fields[3], 1, 12);
  // dow: 0=Sun, 1=Mon ... 6=Sat  (cron standard: 0 or 7 = Sun)
  const rawDows = parseCronField(fields[4], 0, 7);
  const dows = new Set();
  for (const v of rawDows) dows.add(v === 7 ? 0 : v);

  const d = new Date(fromDate.getTime() + 60000); // start searching from next minute
  d.setSeconds(0);
  d.setMilliseconds(0);

  // Brute-force search, max 2 years worth of minutes
  const limit = 366 * 24 * 60;
  for (let i = 0; i < limit; i++) {
    if (
      minutes.has(d.getMinutes()) &&
      hours.has(d.getHours()) &&
      doms.has(d.getDate()) &&
      months.has(d.getMonth() + 1) &&
      dows.has(d.getDay())
    ) {
      return d.toISOString();
    }
    d.setTime(d.getTime() + 60000);
  }
  return null;
}

function isCronExpression(schedule) {
  const fields = schedule.trim().split(/\s+/);
  return fields.length === 5;
}

function computeNextRun(schedule) {
  const trimmed = schedule.trim();

  // 1) Interval like "30m", "2h", "1d"
  const intervalMs = parseInterval(trimmed);
  if (intervalMs !== null) {
    return { type: 'interval', ms: intervalMs, nextRun: new Date(Date.now() + intervalMs).toISOString() };
  }

  // 2) ISO timestamp (one-shot)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const t = new Date(trimmed).getTime();
    if (!isNaN(t)) {
      return { type: 'oneshot', nextRun: new Date(t).toISOString() };
    }
  }

  // 3) Cron expression
  if (isCronExpression(trimmed)) {
    const next = nextCronMatch(trimmed, new Date());
    if (next) {
      return { type: 'cron', nextRun: next };
    }
  }

  // Fallback: treat as one-shot 1 minute from now
  return { type: 'oneshot', nextRun: new Date(Date.now() + 60000).toISOString() };
}

function recomputeNext(job) {
  const info = computeNextRun(job.schedule);
  job.nextRun = info.nextRun;
}

// ─── CronEngine ─────────────────────────────────────────────────────────────

class CronEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy', 'cron');
    this.jobsFile = path.join(this.baseDir, 'jobs.json');
    this.logsDir = path.join(this.baseDir, 'logs');
    this.jobs = [];
    this.timer = null;
    this.running = new Set(); // set of job ids currently executing
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  async init() {
    ensureDir(this.baseDir);
    ensureDir(this.logsDir);
    this.jobs = readJSON(this.jobsFile);
    // Ensure every loaded job has a nextRun
    for (const job of this.jobs) {
      if (!job.nextRun || job.nextRun === null) {
        if (job.enabled !== false) recomputeNext(job);
      }
    }
    this._save();
    this.timer = setInterval(() => this._tick(), 30000);
    // Allow the process to exit even if the timer is active
    if (this.timer.unref) this.timer.unref();
    return this;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────

  add(name, schedule, command, options = {}) {
    const info = computeNextRun(schedule);
    const job = {
      id: uid(),
      name,
      schedule,
      command,
      enabled: options.enabled !== false,
      created: now(),
      lastRun: null,
      nextRun: info.nextRun,
      status: 'idle',
    };
    this.jobs.push(job);
    this._save();
    return { ...job };
  }

  list(options = {}) {
    let result = [...this.jobs];
    if (options.status) result = result.filter(j => j.status === options.status);
    if (typeof options.enabled === 'boolean') result = result.filter(j => j.enabled === options.enabled);
    return result.map(j => ({ ...j }));
  }

  get(id) {
    const job = this.jobs.find(j => j.id === id);
    return job ? { ...job } : null;
  }

  update(id, fields) {
    const idx = this.jobs.findIndex(j => j.id === id);
    if (idx === -1) return null;
    const job = this.jobs[idx];
    const allowed = ['name', 'schedule', 'command', 'enabled'];
    for (const k of allowed) {
      if (fields[k] !== undefined) job[k] = fields[k];
    }
    if (fields.schedule) recomputeNext(job);
    this._save();
    return { ...job };
  }

  remove(id) {
    const idx = this.jobs.findIndex(j => j.id === id);
    if (idx === -1) return false;
    this.running.delete(id);
    this.jobs.splice(idx, 1);
    this._save();
    return true;
  }

  pause(id) {
    const job = this.jobs.find(j => j.id === id);
    if (!job) return null;
    job.enabled = false;
    job.status = 'paused';
    this._save();
    return { ...job };
  }

  resume(id) {
    const job = this.jobs.find(j => j.id === id);
    if (!job) return null;
    job.enabled = true;
    job.status = 'idle';
    recomputeNext(job);
    this._save();
    return { ...job };
  }

  // ── Run ─────────────────────────────────────────────────────────────

  async run(id) {
    const job = this.jobs.find(j => j.id === id);
    if (!job) return { output: '', exitCode: 1, error: 'Job not found' };
    return this._execJob(job);
  }

  // ── Logs ────────────────────────────────────────────────────────────

  logs(jobId, limit = 20) {
    const logDir = path.join(this.logsDir, jobId);
    if (!fs.existsSync(logDir)) return [];
    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.json'))
      .sort()           // ascending by timestamp filename
      .reverse()        // newest first
      .slice(0, limit);
    const entries = [];
    for (const f of files) {
      try {
        entries.push(JSON.parse(fs.readFileSync(path.join(logDir, f), 'utf8')));
      } catch (_) {}
    }
    return entries;
  }

  // ── Stats ───────────────────────────────────────────────────────────

  stats() {
    const total = this.jobs.length;
    const enabled = this.jobs.filter(j => j.enabled).length;
    const disabled = total - enabled;
    let totalRuns = 0;
    for (const j of this.jobs) {
      const logDir = path.join(this.logsDir, j.id);
      if (fs.existsSync(logDir)) {
        totalRuns += fs.readdirSync(logDir).filter(f => f.endsWith('.json')).length;
      }
    }
    return { total, enabled, disabled, totalRuns };
  }

  // ── Internal ────────────────────────────────────────────────────────

  _save() {
    writeJSON(this.jobsFile, this.jobs);
  }

  _tick() {
    const nowMs = Date.now();
    for (const job of this.jobs) {
      if (!job.enabled) continue;
      if (job.status === 'running') continue;
      if (this.running.has(job.id)) continue;
      if (!job.nextRun) continue;
      const dueMs = new Date(job.nextRun).getTime();
      if (isNaN(dueMs)) continue;
      if (dueMs <= nowMs) {
        // Fire and forget — don't block the tick
        this._execJob(job).catch(() => {});
      }
    }
  }

  async _execJob(job) {
    if (this.running.has(job.id)) {
      return { output: '', exitCode: 1, error: 'Already running' };
    }

    this.running.add(job.id);
    job.status = 'running';
    job.lastRun = now();
    this._save();

    return new Promise((resolve) => {
      exec(job.command, { timeout: 5 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const exitCode = error ? (error.code || 1) : 0;
        const output = (stdout || '') + (stderr ? '\n' + stderr : '');
        const result = { output: output.trim(), exitCode };

        // Write log entry
        const ts = Date.now();
        const logDir = path.join(this.logsDir, job.id);
        ensureDir(logDir);
        const logEntry = {
          jobId: job.id,
          timestamp: new Date(ts).toISOString(),
          command: job.command,
          exitCode,
          output: output.trim(),
          error: error ? error.message : null,
        };
        try {
          fs.writeFileSync(path.join(logDir, ts + '.json'), JSON.stringify(logEntry, null, 2), 'utf8');
        } catch (_) {}

        // Update job status
        this.running.delete(job.id);
        job.status = exitCode === 0 ? 'idle' : 'error';

        // Compute next run
        const info = computeNextRun(job.schedule);
        if (info.type === 'oneshot' && new Date(info.nextRun).getTime() <= Date.now()) {
          // One-shot already passed — disable
          job.enabled = false;
          job.nextRun = null;
        } else {
          job.nextRun = info.nextRun;
        }

        this._save();
        resolve(result);
      });
    });
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  CronEngine,
};
