'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class SessionEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy', 'sessions');
  }

  async init() {
    await fs.promises.mkdir(this.baseDir, { recursive: true });
  }

  async start(title) {
    const id = crypto.randomUUID();
    const session = {
      id,
      title: title || 'Untitled Session',
      started: new Date().toISOString(),
      ended: null,
      messages: [],
      checkpoints: []
    };
    const filePath = path.join(this.baseDir, `${id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(session, null, 2), 'utf8');
    return session;
  }

  async end(sessionId) {
    const filePath = path.join(this.baseDir, `${sessionId}.json`);
    const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
    data.ended = new Date().toISOString();
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }

  async addMessage(sessionId, role, content) {
    const filePath = path.join(this.baseDir, `${sessionId}.json`);
    const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
    const message = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    data.messages.push(message);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return message;
  }

  async get(sessionId) {
    const filePath = path.join(this.baseDir, `${sessionId}.json`);
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  async list(options = {}) {
    const files = await fs.promises.readdir(this.baseDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    let sessions = [];
    for (const f of jsonFiles) {
      try {
        const raw = await fs.promises.readFile(path.join(this.baseDir, f), 'utf8');
        const s = JSON.parse(raw);
        sessions.push({ id: s.id, title: s.title, started: s.started, ended: s.ended, messageCount: s.messages.length });
      } catch { /* skip corrupt files */ }
    }

    if (options.from) {
      sessions = sessions.filter(s => s.started >= options.from);
    }
    if (options.to) {
      sessions = sessions.filter(s => s.started <= options.to);
    }

    sessions.sort((a, b) => (b.started || '').localeCompare(a.started || ''));
    return sessions;
  }

  async search(query, limit = 10) {
    const files = await fs.promises.readdir(this.baseDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results = [];

    for (const f of jsonFiles) {
      try {
        const raw = await fs.promises.readFile(path.join(this.baseDir, f), 'utf8');
        const session = JSON.parse(raw);
        const snippets = [];

        for (const msg of session.messages) {
          const lower = msg.content.toLowerCase();
          const matched = terms.every(t => lower.includes(t));
          if (matched) {
            // Build snippet around first term occurrence
            const idx = lower.indexOf(terms[0]);
            const start = Math.max(0, idx - 80);
            const end = Math.min(msg.content.length, idx + terms[0].length + 80);
            const snippet = (start > 0 ? '...' : '') + msg.content.slice(start, end) + (end < msg.content.length ? '...' : '');
            snippets.push({ role: msg.role, snippet, timestamp: msg.timestamp });
            if (snippets.length >= 3) break;
          }
        }

        if (snippets.length > 0) {
          results.push({ sessionId: session.id, title: session.title, started: session.started, snippets });
        }
      } catch { /* skip */ }
    }

    return results.slice(0, limit);
  }

  async checkpoint(sessionId, label) {
    const filePath = path.join(this.baseDir, `${sessionId}.json`);
    const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
    const cp = {
      label: label || `checkpoint-${data.checkpoints.length + 1}`,
      timestamp: new Date().toISOString(),
      snapshot: data.messages.slice(-20)
    };
    data.checkpoints.push(cp);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return cp;
  }

  async getCheckpoints(sessionId) {
    const session = await this.get(sessionId);
    return session.checkpoints || [];
  }

  async remove(sessionId) {
    const filePath = path.join(this.baseDir, `${sessionId}.json`);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async stats() {
    const files = await fs.promises.readdir(this.baseDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    let totalSessions = 0;
    let totalMessages = 0;

    for (const f of jsonFiles) {
      try {
        const raw = await fs.promises.readFile(path.join(this.baseDir, f), 'utf8');
        const s = JSON.parse(raw);
        totalSessions++;
        totalMessages += (s.messages || []).length;
      } catch { /* skip */ }
    }

    return {
      totalSessions,
      totalMessages,
      avgMessagesPerSession: totalSessions > 0 ? Math.round((totalMessages / totalSessions) * 100) / 100 : 0
    };
  }

  async export(sessionId) {
    const session = await this.get(sessionId);
    return JSON.stringify(session, null, 2);
  }
}

module.exports = { SessionEngine };
