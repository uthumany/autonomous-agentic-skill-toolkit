'use strict';

/**
 * UTHY OS v2.0 — Skill Engine
 * Manages installable, versioned, sandboxed skill packages.
 * Skills are the primary way to extend Uthy OS functionality.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ════════════════════════════════════════════════════════════
// SKILL CLASS — Represents a single skill
// ════════════════════════════════════════════════════════════

class Skill {
  constructor(manifest) {
    this.name = manifest.name;
    this.version = manifest.version || '1.0.0';
    this.description = manifest.description || '';
    this.author = manifest.author || 'unknown';
    this.category = manifest.category || 'general';
    this.permissions = manifest.permissions || [];
    this.trigger = manifest.trigger || '';
    this.dependencies = manifest.dependencies || [];
    this.entrypoint = manifest.entrypoint || null;
    this.enabled = manifest.enabled !== false;
    this.installedAt = manifest.installedAt || Date.now();
    this.path = manifest.path || null;
    this.config = manifest.config || {};
  }

  serialize() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      category: this.category,
      permissions: this.permissions,
      trigger: this.trigger,
      dependencies: this.dependencies,
      entrypoint: this.entrypoint,
      enabled: this.enabled,
      installedAt: this.installedAt,
      path: this.path,
      config: this.config,
    };
  }

  matchesTrigger(input) {
    if (!this.trigger) return false;
    const triggers = this.trigger.split('|').map(t => t.trim().toLowerCase());
    const lower = input.toLowerCase();
    return triggers.some(t => lower.includes(t));
  }
}

// ════════════════════════════════════════════════════════════
// SKILL ENGINE — Registry, lifecycle, sandboxing
// ════════════════════════════════════════════════════════════

class SkillEngine {
  constructor(opts = {}) {
    this.skillsDir = opts.skillsDir || path.join(os.homedir(), '.uthy', 'skills');
    this.skills = new Map();
    this._registry = [];
    this._hooks = new Map();
  }

  async init() {
    // Ensure skills directory
    if (!fs.existsSync(this.skillsDir)) {
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }

    // Register built-in skills
    this._registerBuiltins();

    // Load installed skills
    this._loadInstalled();
  }

  // ── Built-in Skills ──────────────────────────────────

  _registerBuiltins() {
    const builtins = [
      {
        name: 'web-search',
        version: '2.0.0',
        description: 'Search the web for information',
        category: 'research',
        permissions: ['network'],
        trigger: 'search|look up|find|google',
        entrypoint: 'builtin:web-search',
      },
      {
        name: 'code-gen',
        version: '2.0.0',
        description: 'Generate code from natural language descriptions',
        category: 'development',
        permissions: ['file-write'],
        trigger: 'generate code|write code|create function|build script',
        entrypoint: 'builtin:code-gen',
      },
      {
        name: 'file-ops',
        version: '2.0.0',
        description: 'File operations — read, write, search, transform',
        category: 'system',
        permissions: ['file-read', 'file-write'],
        trigger: 'read file|write file|create file|delete file|search files',
        entrypoint: 'builtin:file-ops',
      },
      {
        name: 'system-info',
        version: '2.0.0',
        description: 'Get system information — CPU, memory, disk, network',
        category: 'system',
        permissions: ['execute'],
        trigger: 'system info|cpu|memory|disk|uptime|processes',
        entrypoint: 'builtin:system-info',
      },
      {
        name: 'git-ops',
        version: '2.0.0',
        description: 'Git operations — status, commit, push, pull, branch',
        category: 'development',
        permissions: ['execute', 'file-read'],
        trigger: 'git|commit|push|pull|branch|merge|clone',
        entrypoint: 'builtin:git-ops',
      },
      {
        name: 'docker-ops',
        version: '2.0.0',
        description: 'Docker operations — build, run, manage containers',
        category: 'devops',
        permissions: ['execute', 'network'],
        trigger: 'docker|container|image|compose',
        entrypoint: 'builtin:docker-ops',
      },
      {
        name: 'api-test',
        version: '2.0.0',
        description: 'Test APIs — HTTP requests, response validation',
        category: 'testing',
        permissions: ['network'],
        trigger: 'api test|http request|curl|fetch|endpoint',
        entrypoint: 'builtin:api-test',
      },
      {
        name: 'data-transform',
        version: '2.0.0',
        description: 'Transform data between formats — JSON, CSV, YAML, XML',
        category: 'data',
        permissions: ['file-read', 'file-write'],
        trigger: 'convert|transform|json|csv|yaml|xml',
        entrypoint: 'builtin:data-transform',
      },
      {
        name: 'cron-jobs',
        version: '2.0.0',
        description: 'Schedule and manage recurring tasks',
        category: 'automation',
        permissions: ['execute'],
        trigger: 'schedule|cron|recurring|periodic|timer',
        entrypoint: 'builtin:cron-jobs',
      },
      {
        name: 'memory',
        version: '2.0.0',
        description: 'Persistent memory management — store, recall, search',
        category: 'ai',
        permissions: ['memory'],
        trigger: 'remember|recall|memory|forget|notes',
        entrypoint: 'builtin:memory',
      },
      {
        name: 'theme-manager',
        version: '2.0.0',
        description: 'Manage and switch between 25+ terminal themes',
        category: 'customization',
        permissions: [],
        trigger: 'theme|color|style|appearance',
        entrypoint: 'builtin:theme-manager',
      },
      {
        name: 'model-manager',
        version: '2.0.0',
        description: 'Manage AI model providers and API keys',
        category: 'ai',
        permissions: ['memory'],
        trigger: 'model|provider|api key|llm|openai|anthropic',
        entrypoint: 'builtin:model-manager',
      },
      {
        name: 'user-manager',
        version: '2.0.0',
        description: 'Manage user accounts — create, switch, delete',
        category: 'system',
        permissions: ['execute'],
        trigger: 'user|login|logout|switch user|create user',
        entrypoint: 'builtin:user-manager',
      },
      {
        name: 'macro-recorder',
        version: '2.0.0',
        description: 'Record and replay command sequences',
        category: 'automation',
        permissions: [],
        trigger: 'macro|record|replay|sequence',
        entrypoint: 'builtin:macro-recorder',
      },
    ];

    for (const manifest of builtins) {
      const skill = new Skill({ ...manifest, enabled: true });
      this.skills.set(skill.name, skill);
    }
  }

  _loadInstalled() {
    try {
      const manifestPath = path.join(this.skillsDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        for (const [name, data] of Object.entries(manifest)) {
          if (!this.skills.has(name)) {
            this.skills.set(name, new Skill(data));
          }
        }
      }
    } catch {}
  }

  _saveManifest() {
    const manifest = {};
    for (const [name, skill] of this.skills) {
      if (!skill.entrypoint?.startsWith('builtin:')) {
        manifest[name] = skill.serialize();
      }
    }
    const manifestPath = path.join(this.skillsDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }

  // ── Public API ───────────────────────────────────────

  register(manifest) {
    const skill = new Skill(manifest);
    this.skills.set(skill.name, skill);
    this._saveManifest();
    return skill;
  }

  get(name) {
    return this.skills.get(name);
  }

  list(opts = {}) {
    let skills = [...this.skills.values()];
    if (opts.category) skills = skills.filter(s => s.category === opts.category);
    if (opts.enabled !== undefined) skills = skills.filter(s => s.enabled === opts.enabled);
    if (opts.query) {
      const q = opts.query.toLowerCase();
      skills = skills.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }
    return skills.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  enable(name) {
    const skill = this.skills.get(name);
    if (skill) { skill.enabled = true; this._saveManifest(); }
    return !!skill;
  }

  disable(name) {
    const skill = this.skills.get(name);
    if (skill) { skill.enabled = false; this._saveManifest(); }
    return !!skill;
  }

  uninstall(name) {
    const skill = this.skills.get(name);
    if (!skill) return false;
    if (skill.entrypoint?.startsWith('builtin:')) return false; // Can't uninstall builtins

    // Remove skill files
    if (skill.path && fs.existsSync(skill.path)) {
      fs.rmSync(skill.path, { recursive: true, force: true });
    }

    this.skills.delete(name);
    this._saveManifest();
    return true;
  }

  installFromPath(skillPath) {
    if (!fs.existsSync(skillPath)) throw new Error(`Path not found: ${skillPath}`);

    let manifest;
    const skillMd = path.join(skillPath, 'SKILL.md');
    if (fs.existsSync(skillMd)) {
      const content = fs.readFileSync(skillMd, 'utf8');
      manifest = this._parseFrontmatter(content);
      manifest.path = skillPath;
    } else {
      throw new Error('No SKILL.md found in path');
    }

    const skill = new Skill(manifest);
    this.skills.set(skill.name, skill);
    this._saveManifest();
    return skill;
  }

  // ── Frontmatter Parser ───────────────────────────────

  _parseFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { description: raw.trim() };

    const yamlBlock = match[1];
    const content = match[2].replace(/^\r?\n/, '');
    const frontmatter = {};
    let currentKey = null;

    for (const line of yamlBlock.split(/\r?\n/)) {
      const arrayMatch = line.match(/^\s+-\s+(.*)$/);
      if (arrayMatch && currentKey) {
        if (!Array.isArray(frontmatter[currentKey])) frontmatter[currentKey] = [];
        frontmatter[currentKey].push(arrayMatch[1]);
        continue;
      }
      const kvMatch = line.match(/^(\w+):\s*(.*)$/);
      if (kvMatch) {
        currentKey = kvMatch[1];
        const val = kvMatch[2].trim();
        if (val === '' || val === '[]') {
          frontmatter[currentKey] = [];
        } else {
          frontmatter[currentKey] = val.replace(/^["']|["']$/g, '');
        }
      }
    }

    return { ...frontmatter, content };
  }

  // ── Skill Matching ───────────────────────────────────

  findForInput(input) {
    const matches = [];
    for (const skill of this.skills.values()) {
      if (!skill.enabled) continue;
      if (skill.matchesTrigger(input)) {
        matches.push(skill);
      }
    }
    return matches;
  }

  // ── Auto-Generate Skill ──────────────────────────────

  generateSkill(description) {
    const name = description.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    const manifest = {
      name: `auto-${name}`,
      version: '1.0.0',
      description: description,
      author: 'auto-generated',
      category: 'custom',
      permissions: ['file-read', 'file-write'],
      trigger: name.split('-').join('|'),
      entrypoint: null,
    };

    // Create skill directory
    const skillDir = path.join(this.skillsDir, `auto-${name}`);
    if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });

    // Generate SKILL.md
    const skillMd = `---
name: "${manifest.name}"
version: "${manifest.version}"
description: "${manifest.description}"
author: "${manifest.author}"
category: "${manifest.category}"
permissions:
${manifest.permissions.map(p => `  - ${p}`).join('\n')}
trigger: "${manifest.trigger}"
---

# ${manifest.name}

${manifest.description}

## Usage

This skill was auto-generated. Customize it by editing this file.

## Steps

1. Describe what you want to do
2. The skill will execute the appropriate actions
`;

    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');

    return this.register({ ...manifest, path: skillDir });
  }

  // ── Statistics ───────────────────────────────────────

  getStats() {
    const skills = [...this.skills.values()];
    const categories = {};
    for (const skill of skills) {
      categories[skill.category] = (categories[skill.category] || 0) + 1;
    }
    return {
      total: skills.length,
      enabled: skills.filter(s => s.enabled).length,
      builtin: skills.filter(s => s.entrypoint?.startsWith('builtin:')).length,
      installed: skills.filter(s => !s.entrypoint?.startsWith('builtin:')).length,
      categories,
    };
  }

  // ── Permission Check ─────────────────────────────────

  checkPermissions(skillName, grantedPermissions) {
    const skill = this.skills.get(skillName);
    if (!skill) return { allowed: false, reason: 'Skill not found' };
    if (!skill.enabled) return { allowed: false, reason: 'Skill is disabled' };

    const missing = skill.permissions.filter(p => !grantedPermissions.includes(p));
    if (missing.length > 0) {
      return { allowed: false, reason: `Missing permissions: ${missing.join(', ')}`, missing };
    }

    return { allowed: true };
  }
}

module.exports = { SkillEngine, Skill };
