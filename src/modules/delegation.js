'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { fork } = require('child_process');

class DelegationEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy');
    this.delegationsDir = path.join(this.baseDir, 'delegations');
    this.historyFile = path.join(this.delegationsDir, 'history.json');
    this.workerScript = path.join(this.delegationsDir, '_worker.js');
    this.delegations = new Map();
    this.maxConcurrent = 3;
  }

  async init() {
    fs.mkdirSync(this.delegationsDir, { recursive: true });

    // Write the worker script that child processes will run
    const workerCode = `
'use strict';
const taskDescription = process.argv[2] || 'No task provided';
const duration = parseInt(process.argv[3]) || 1000;

console.log('[Worker ' + process.pid + '] Starting task: ' + taskDescription);
console.log('[Worker ' + process.pid + '] Simulating work for ' + duration + 'ms...');

setTimeout(() => {
  const result = {
    pid: process.pid,
    task: taskDescription,
    completedAt: new Date().toISOString(),
    simulatedDuration: duration,
    output: 'Task completed successfully: ' + taskDescription
  };
  console.log('[Worker ' + process.pid + '] Result: ' + JSON.stringify(result));
  process.exit(0);
}, duration);

process.on('uncaughtException', (err) => {
  console.error('[Worker ' + process.pid + '] Error: ' + err.message);
  process.exit(1);
});
`;
    fs.writeFileSync(this.workerScript, workerCode, 'utf8');

    // Load existing history
    if (fs.existsSync(this.historyFile)) {
      try {
        const history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
        for (const entry of history) {
          if (entry.status === 'running') {
            entry.status = 'interrupted';
          }
          this.delegations.set(entry.id, entry);
        }
      } catch {
        // ignore corrupt history
      }
    }

    return this;
  }

  delegate(taskDescription, options) {
    const running = this._countRunning();
    if (running >= this.maxConcurrent) {
      throw new Error(`Max concurrent tasks (${this.maxConcurrent}) reached. Wait for a task to finish.`);
    }

    const opts = options || {};
    const id = crypto.randomUUID();
    const duration = opts.duration || (1000 + Math.floor(Math.random() * 2000)); // 1-3 seconds

    const entry = {
      id,
      task: taskDescription,
      status: 'running',
      started: new Date().toISOString(),
      ended: null,
      result: null,
      stdout: '',
      stderr: '',
      pid: null,
      options: opts
    };

    this.delegations.set(id, entry);
    this._saveHistory();

    // Spawn worker process
    const child = fork(this.workerScript, [taskDescription, String(duration)], {
      silent: true, // capture stdout/stderr
      cwd: this.baseDir
    });

    entry.pid = child.pid;
    entry._child = child; // internal reference, not serialized

    child.stdout.on('data', (data) => {
      entry.stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      entry.stderr += data.toString();
    });

    child.on('exit', (code) => {
      entry.ended = new Date().toISOString();
      entry.status = code === 0 ? 'completed' : 'failed';
      entry.exitCode = code;
      entry.result = entry.status === 'completed' ? entry.stdout : `Exit code: ${code}`;
      delete entry._child;
      this._saveHistory();
    });

    child.on('error', (err) => {
      entry.ended = new Date().toISOString();
      entry.status = 'failed';
      entry.result = err.message;
      entry.stderr += err.message + '\n';
      delete entry._child;
      this._saveHistory();
    });

    return { id, status: 'running' };
  }

  async delegateParallel(tasks) {
    if (!Array.isArray(tasks)) throw new Error('tasks must be an array');
    if (tasks.length > this.maxConcurrent) {
      throw new Error(`Cannot run more than ${this.maxConcurrent} tasks in parallel.`);
    }

    const results = [];
    const promises = [];

    for (const task of tasks) {
      const desc = typeof task === 'string' ? task : task.description || task.task;
      const opts = typeof task === 'object' ? task : {};
      const { id } = this.delegate(desc, opts);
      results.push({ id, status: 'running' });

      // Create a promise that resolves when this delegation finishes
      promises.push(new Promise((resolve) => {
        const check = setInterval(() => {
          const entry = this.delegations.get(id);
          if (entry && entry.status !== 'running') {
            clearInterval(check);
            resolve(entry);
          }
        }, 100);
        // Safety timeout
        setTimeout(() => {
          clearInterval(check);
          const entry = this.delegations.get(id);
          if (entry && entry.status === 'running') {
            resolve(entry);
          }
        }, 30000);
      }));
    }

    const completed = await Promise.all(promises);
    return completed.map(e => ({
      id: e.id,
      task: e.task,
      status: e.status,
      started: e.started,
      ended: e.ended,
      result: e.result
    }));
  }

  getStatus(id) {
    const entry = this.delegations.get(id);
    if (!entry) throw new Error(`Delegation not found: ${id}`);
    return this._serialize(entry);
  }

  list(options) {
    const opts = options || {};
    let entries = Array.from(this.delegations.values());
    if (opts.status) {
      entries = entries.filter(e => e.status === opts.status);
    }
    return entries.map(e => this._serialize(e));
  }

  cancel(id) {
    const entry = this.delegations.get(id);
    if (!entry) throw new Error(`Delegation not found: ${id}`);
    if (entry.status !== 'running') return false;

    if (entry._child) {
      try {
        entry._child.kill('SIGTERM');
      } catch { /* process may already be dead */ }
    }

    entry.status = 'cancelled';
    entry.ended = new Date().toISOString();
    entry.result = 'Cancelled by user';
    delete entry._child;
    this._saveHistory();
    return true;
  }

  getOutput(id) {
    const entry = this.delegations.get(id);
    if (!entry) throw new Error(`Delegation not found: ${id}`);
    return { stdout: entry.stdout || '', stderr: entry.stderr || '' };
  }

  stats() {
    let completed = 0, failed = 0, running = 0;
    for (const entry of this.delegations.values()) {
      if (entry.status === 'completed') completed++;
      else if (entry.status === 'failed') failed++;
      else if (entry.status === 'running') running++;
    }
    return {
      total: this.delegations.size,
      completed,
      failed,
      running
    };
  }

  // --- Private helpers ---

  _countRunning() {
    let count = 0;
    for (const entry of this.delegations.values()) {
      if (entry.status === 'running') count++;
    }
    return count;
  }

  _serialize(entry) {
    const { _child, ...safe } = entry;
    return safe;
  }

  _saveHistory() {
    const all = Array.from(this.delegations.values()).map(e => this._serialize(e));
    fs.writeFileSync(this.historyFile, JSON.stringify(all, null, 2), 'utf8');
  }
}

module.exports = { DelegationEngine };
