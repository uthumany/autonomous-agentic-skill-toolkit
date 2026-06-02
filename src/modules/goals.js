const fs = require('fs');
const path = require('path');
const os = require('os');

const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const SECTIONS = ['Active', 'Backlog'];
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function generateId() {
  return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

class GoalEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy', 'goals');
    this.goalsFile = null;
    this.goals = [];
  }

  async init() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    this.goalsFile = path.join(this.baseDir, 'goals.json');
    if (fs.existsSync(this.goalsFile)) {
      const raw = fs.readFileSync(this.goalsFile, 'utf-8');
      this.goals = JSON.parse(raw);
    } else {
      this.goals = [];
      this._save();
    }
    return this;
  }

  _save() {
    fs.writeFileSync(this.goalsFile, JSON.stringify(this.goals, null, 2), 'utf-8');
  }

  add(text, section, priority, tags) {
    if (!text || typeof text !== 'string') throw new Error('Goal text is required');
    section = SECTIONS.includes(section) ? section : 'Active';
    priority = priority || 'medium';
    tags = Array.isArray(tags) ? tags : [];
    const goal = {
      id: generateId(),
      text: text.trim(),
      section,
      status: 'pending',
      created: new Date().toISOString(),
      completed: null,
      priority,
      tags
    };
    this.goals.push(goal);
    this._save();
    return goal;
  }

  list(options) {
    options = options || {};
    let filtered = [...this.goals];
    if (options.section) {
      filtered = filtered.filter(g => g.section === options.section);
    }
    if (options.status) {
      filtered = filtered.filter(g => g.status === options.status);
    }
    if (options.tag) {
      filtered = filtered.filter(g => g.tags && g.tags.includes(options.tag));
    }
    if (options.priority) {
      filtered = filtered.filter(g => g.priority === options.priority);
    }
    const priVal = (g) => PRIORITY_ORDER[g.priority] !== undefined ? PRIORITY_ORDER[g.priority] : 99;
    filtered.sort((a, b) => priVal(a) - priVal(b) || new Date(a.created) - new Date(b.created));
    return filtered;
  }

  get(id) {
    return this.goals.find(g => g.id === id) || null;
  }

  update(id, fields) {
    const idx = this.goals.findIndex(g => g.id === id);
    if (idx === -1) throw new Error(`Goal not found: ${id}`);
    const allowed = ['text', 'section', 'status', 'priority', 'tags'];
    for (const key of Object.keys(fields)) {
      if (allowed.includes(key)) {
        this.goals[idx][key] = fields[key];
      }
    }
    if (fields.status === 'completed' && !this.goals[idx].completed) {
      this.goals[idx].completed = new Date().toISOString();
    }
    this._save();
    return this.goals[idx];
  }

  complete(id) {
    return this.update(id, { status: 'completed', completed: new Date().toISOString() });
  }

  remove(id) {
    const idx = this.goals.findIndex(g => g.id === id);
    if (idx === -1) return false;
    this.goals.splice(idx, 1);
    this._save();
    return true;
  }

  review() {
    const total = this.goals.length;
    const byStatus = {};
    for (const s of STATUSES) byStatus[s] = 0;
    for (const g of this.goals) {
      byStatus[g.status] = (byStatus[g.status] || 0) + 1;
    }
    const active = byStatus.pending + byStatus.in_progress;
    const completed = byStatus.completed;
    const cancelled = byStatus.cancelled;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const topGoals = this.goals
      .filter(g => g.status === 'in_progress' || g.status === 'pending')
      .sort((a, b) => (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99))
      .slice(0, 5);
    return { total, active, completed, cancelled, completionRate, topGoals };
  }

  stats() {
    const total = this.goals.length;
    const bySection = {};
    for (const s of SECTIONS) bySection[s] = 0;
    const byStatus = {};
    for (const s of STATUSES) byStatus[s] = 0;
    for (const g of this.goals) {
      bySection[g.section] = (bySection[g.section] || 0) + 1;
      byStatus[g.status] = (byStatus[g.status] || 0) + 1;
    }
    const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0;
    return { total, bySection, byStatus, completionRate };
  }

  kanban(theme) {
    theme = theme || 'default';
    const themes = {
      default: { pending: '', progress: '', done: '', cancel: '' },
      dark: { pending: '', progress: '', done: '', cancel: '' }
    };
    const t = themes[theme] || themes.default;

    const cols = [
      { key: 'pending', title: 'PENDING' },
      { key: 'in_progress', title: 'IN PROGRESS' },
      { key: 'completed', title: 'COMPLETED' },
      { key: 'cancelled', title: 'CANCELLED' }
    ];

    // Group goals by status
    const groups = {};
    for (const c of cols) groups[c.key] = [];
    for (const g of this.goals) {
      if (groups[g.status]) groups[g.status].push(g);
    }

    // Sort each group by priority
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99));
    }

    // Calculate column widths
    const COL_PAD = 2; // 1 space on each side inside the box
    const MIN_WIDTH = 16;
    const colWidths = cols.map(c => {
      const titleLen = c.title.length + 4; // "── TITLE ──"
      let maxItemLen = 0;
      for (const g of groups[c.key]) {
        const itemStr = '• ' + g.text + (g.tags && g.tags.length ? ' [' + g.tags.join(',') + ']' : '');
        if (itemStr.length > maxItemLen) maxItemLen = itemStr.length;
      }
      return Math.max(titleLen, maxItemLen + COL_PAD, MIN_WIDTH);
    });

    const lines = [];

    // Top border: ┌─── TITLE ───┐
    let topLine = '';
    for (let i = 0; i < cols.length; i++) {
      const title = cols[i].title;
      const w = colWidths[i];
      const dashTotal = w - title.length - 2;
      const dashLeft = Math.floor(dashTotal / 2);
      const dashRight = dashTotal - dashLeft;
      const left = i === 0 ? '┌' : '┬';
      topLine += left + '─'.repeat(dashLeft) + ' ' + title + ' ' + '─'.repeat(dashRight) + '┐';
    }
    lines.push(topLine);

    // Find max rows
    const maxRows = Math.max(1, ...cols.map(c => groups[c.key].length));

    // Data rows
    for (let r = 0; r < maxRows; r++) {
      let row = '';
      for (let i = 0; i < cols.length; i++) {
        const w = colWidths[i];
        let text = '';
        if (r < groups[cols[i].key].length) {
          const g = groups[cols[i].key][r];
          text = '• ' + g.text;
          if (g.tags && g.tags.length) text += ' [' + g.tags.join(',') + ']';
        }
        const padded = ' ' + text + ' '.repeat(Math.max(0, w - text.length - 1));
        row += '│' + padded + '│';
      }
      lines.push(row);
    }

    // Bottom border
    let botLine = '';
    for (let i = 0; i < cols.length; i++) {
      const left = i === 0 ? '└' : '┴';
      botLine += left + '─'.repeat(colWidths[i]) + '┘';
    }
    lines.push(botLine);

    // Summary line
    const total = this.goals.length;
    const done = groups.completed.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    lines.push(`  Total: ${total} | Done: ${done} | Rate: ${pct}%`);

    return lines;
  }
}

module.exports = { GoalEngine };
