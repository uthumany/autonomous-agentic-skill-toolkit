'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── YAML frontmatter helpers ────────────────────────────────────────────────

function serializeFrontmatter(obj) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
    } else if (value === undefined || value === null) {
      lines.push(`${key}: ""`);
    } else {
      lines.push(`${key}: ${JSON.stringify(String(value))}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: raw };

  const yamlBlock = match[1];
  const content = match[2].replace(/^\r?\n/, '');
  const frontmatter = {};

  let currentKey = null;
  let inArray = false;

  for (const line of yamlBlock.split(/\r?\n/)) {
    // array item line: "  - value"
    const arrayMatch = line.match(/^\s+-\s+(.*)$/);
    if (arrayMatch && currentKey) {
      if (!Array.isArray(frontmatter[currentKey])) frontmatter[currentKey] = [];
      frontmatter[currentKey].push(arrayMatch[1]);
      inArray = true;
      continue;
    }

    // key: value
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      let val = kvMatch[2].trim();

      if (val === '' || val === '[]') {
        // could be start of array or empty
        if (val === '[]') {
          frontmatter[currentKey] = [];
          inArray = true;
        } else {
          // empty — could be followed by array items
          frontmatter[currentKey] = '';
          inArray = false;
        }
      } else {
        // try JSON parse for quoted strings, then fall back
        try {
          frontmatter[currentKey] = JSON.parse(val);
        } catch (_) {
          frontmatter[currentKey] = val;
        }
        inArray = false;
      }
    }
  }

  return { frontmatter, content };
}

// ── Built-in skill definitions ───────────────────────────────────────────────

const BUILTIN_SKILLS = [
  {
    filename: 'web-audit.md',
    frontmatter: {
      name: 'web-audit',
      description: 'Run full web audit: accessibility, performance, visual regression',
      tags: ['audit', 'accessibility', 'performance', 'visual', 'web'],
      category: 'analysis',
      version: '1.0.0',
    },
    body: `## Web Audit Workflow

### 1. Accessibility Check
- Run automated a11y scanner (axe-core, Lighthouse)
- Validate ARIA attributes and semantic HTML
- Check color contrast ratios (WCAG 2.1 AA minimum)
- Test keyboard navigation paths

### 2. Performance Audit
- Measure Core Web Vitals (LCP, FID, CLS)
- Analyze bundle size and unused JavaScript
- Check image optimization and lazy loading
- Review caching headers and service worker strategy

### 3. Visual Regression
- Capture baseline screenshots at key viewport sizes
- Compare against previous baseline for layout shifts
- Flag pixel-level differences exceeding threshold
- Generate visual diff report

### 4. Report
- Aggregate findings into prioritized list
- Categorize by severity: critical, warning, info
- Suggest fixes with estimated effort
- Output summary to stdout and detailed report to file`,
  },
  {
    filename: 'deploy-check.md',
    frontmatter: {
      name: 'deploy-check',
      description: 'Pre-deployment checklist: tests, build, lint, environment vars',
      tags: ['deploy', 'ci', 'checklist', 'build', 'testing'],
      category: 'deployment',
      version: '1.0.0',
    },
    body: `## Pre-Deployment Checklist

### 1. Code Quality
- Run linter with zero-tolerance for errors
- Ensure no TODO/FIXME comments in changed files
- Verify no debug statements (console.log, debugger)
- Check for hardcoded secrets or credentials

### 2. Tests
- Execute full test suite — must pass 100%
- Check test coverage meets minimum threshold (80%)
- Run integration tests against staging environment
- Verify no skipped or pending tests

### 3. Build
- Clean build from scratch (no cached artifacts)
- Verify build output matches expected structure
- Check bundle size against budget limits
- Validate source maps are generated

### 4. Environment
- Confirm all required env vars are set
- Validate database migrations are applied
- Check third-party service dependencies are healthy
- Review feature flags configuration

### 5. Deploy
- Tag release with semantic version
- Run smoke tests on staging
- Execute canary deployment (if applicable)
- Monitor error rates post-deploy for 15 minutes`,
  },
  {
    filename: 'code-review.md',
    frontmatter: {
      name: 'code-review',
      description: 'Review code changes: diff analysis, test coverage, style check',
      tags: ['review', 'code-quality', 'diff', 'testing', 'style'],
      category: 'analysis',
      version: '1.0.0',
    },
    body: `## Code Review Workflow

### 1. Diff Analysis
- Summarize changed files and lines of code
- Identify the scope of change (feature, fix, refactor)
- Flag files with unusually large diffs for deeper review
- Check for unintended file changes

### 2. Code Quality
- Verify consistent naming conventions
- Check for code duplication introduced
- Ensure proper error handling patterns
- Validate input sanitization and security practices
- Review for performance anti-patterns (N+1 queries, blocking I/O)

### 3. Test Coverage
- Confirm new code has corresponding tests
- Verify edge cases are covered
- Check that tests are deterministic and isolated
- Flag any decrease in overall coverage percentage

### 4. Style & Conventions
- Enforce project style guide (formatting, imports)
- Verify documentation is updated (README, JSDoc, types)
- Check commit messages follow conventional format
- Ensure no binary files or large assets committed

### 5. Summary
- Provide approval/request-changes recommendation
- List specific action items with line references
- Rate overall quality: pass, needs-work, block`,
  },
  {
    filename: 'api-test.md',
    frontmatter: {
      name: 'api-test',
      description: 'API endpoint testing workflow: schema, auth, performance, error handling',
      tags: ['api', 'testing', 'schema', 'auth', 'performance'],
      category: 'testing',
      version: '1.0.0',
    },
    body: `## API Endpoint Testing Workflow

### 1. Schema Validation
- Validate request/response against OpenAPI/Swagger spec
- Check required fields and data types
- Verify pagination and filtering query parameters
- Test boundary values and invalid inputs

### 2. Authentication & Authorization
- Test without auth — expect 401
- Test with invalid/expired tokens — expect 401
- Test with valid token but insufficient permissions — expect 403
- Test rate limiting behavior

### 3. CRUD Operations
- Create: verify 201 status, response shape, persistence
- Read: verify 200, correct data returned, 404 for missing
- Update: verify 200, partial update (PATCH) vs replace (PUT)
- Delete: verify 204, subsequent read returns 404

### 4. Performance
- Measure response time (p50, p95, p99)
- Load test with concurrent requests
- Verify timeout behavior for slow queries
- Check response payload size

### 5. Error Handling
- Test malformed JSON body — expect 400
- Test invalid Content-Type header
- Verify error response format is consistent
- Check that stack traces are not leaked in production mode`,
  },
  {
    filename: 'monitor.md',
    frontmatter: {
      name: 'monitor',
      description: 'Set up monitoring: uptime checks, error tracking, performance baselines',
      tags: ['monitoring', 'uptime', 'errors', 'performance', 'observability'],
      category: 'automation',
      version: '1.0.0',
    },
    body: `## Monitoring Setup Workflow

### 1. Uptime Checks
- Configure health check endpoints for all services
- Set up periodic polling (30s intervals recommended)
- Define response time thresholds for degraded status
- Configure multi-region checks for geographic coverage

### 2. Error Tracking
- Integrate error reporting SDK (Sentry, Bugsnag, etc.)
- Configure source maps for readable stack traces
- Set up error grouping and fingerprinting
- Define alert rules: new errors, error rate spikes

### 3. Performance Baselines
- Capture initial baseline metrics for key endpoints
- Track p50/p95/p99 latency over time
- Monitor memory usage trends and garbage collection
- Set up alerts for regression beyond baseline threshold

### 4. Log Aggregation
- Ensure structured logging format (JSON)
- Configure log shipping to central aggregator
- Set retention policies (30 days minimum)
- Create saved queries for common debugging patterns

### 5. Dashboards & Alerts
- Create overview dashboard: uptime, error rate, latency
- Set up PagerDuty/Slack alerts for critical thresholds
- Configure escalation policies
- Schedule weekly status reports`,
  },
];

// ── SkillEngine class ───────────────────────────────────────────────────────

class SkillEngine {
  /**
   * @param {string} [baseDir] — directory where skill .md files live.
   *   Defaults to ~/.uthy/skills/
   */
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy', 'skills');
  }

  /**
   * Create the skills directory and write any missing built-in skills.
   */
  async init() {
    await fs.promises.mkdir(this.baseDir, { recursive: true });

    for (const skill of BUILTIN_SKILLS) {
      const filePath = path.join(this.baseDir, skill.filename);
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        // file exists — skip
      } catch {
        const raw = this._buildRaw(skill.frontmatter, skill.body);
        await fs.promises.writeFile(filePath, raw, 'utf8');
      }
    }
  }

  /**
   * List all skills, optionally filtered.
   * @param {object} [options]
   * @param {string} [options.category] — filter by category
   * @param {string[]} [options.tags] — filter by tags (any match)
   * @returns {Promise<Array<{name, description, tags, category, path}>>}
   */
  async list(options = {}) {
    const files = await this._mdFiles();
    const results = [];

    for (const file of files) {
      const raw = await fs.promises.readFile(file, 'utf8');
      const { frontmatter } = parseFrontmatter(raw);

      if (options.category && frontmatter.category !== options.category) continue;

      if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
        const skillTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
        const hasMatch = options.tags.some(t => skillTags.includes(t));
        if (!hasMatch) continue;
      }

      results.push({
        name: frontmatter.name || path.basename(file, '.md'),
        description: frontmatter.description || '',
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        category: frontmatter.category || 'custom',
        path: file,
      });
    }

    return results;
  }

  /**
   * Get a skill by name.
   * @param {string} name
   * @returns {Promise<{frontmatter: object, content: string, raw: string}>}
   */
  async get(name) {
    const filePath = this._resolvePath(name);
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const { frontmatter, content } = parseFrontmatter(raw);
    return { frontmatter, content, raw };
  }

  /**
   * Create a new skill.
   * @param {string} name
   * @param {string} description
   * @param {string[]} tags
   * @param {string} category
   * @param {string} body — markdown body content
   * @returns {Promise<string>} path to created file
   */
  async create(name, description, tags, category, body) {
    const filePath = this._resolvePath(name);
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      throw new Error(`Skill "${name}" already exists at ${filePath}`);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    const frontmatter = {
      name,
      description: description || '',
      tags: tags || [],
      category: category || 'custom',
      version: '1.0.0',
    };

    const raw = this._buildRaw(frontmatter, body || '');
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, raw, 'utf8');
    return filePath;
  }

  /**
   * Update an existing skill's frontmatter fields and/or body.
   * @param {string} name
   * @param {object} fields — may include: name, description, tags, category, version, body
   * @returns {Promise<{frontmatter, content, raw}>}
   */
  async update(name, fields) {
    const filePath = this._resolvePath(name);
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const { frontmatter, content } = parseFrontmatter(raw);

    // merge frontmatter fields
    const skip = new Set(['body']);
    for (const [key, value] of Object.entries(fields)) {
      if (skip.has(key)) continue;
      frontmatter[key] = value;
    }

    const newBody = fields.body !== undefined ? fields.body : content;

    // if name changed, write to new path and remove old
    const newRaw = this._buildRaw(frontmatter, newBody);
    if (fields.name && fields.name !== name) {
      const newPath = this._resolvePath(fields.name);
      await fs.promises.writeFile(newPath, newRaw, 'utf8');
      await fs.promises.unlink(filePath);
    } else {
      await fs.promises.writeFile(filePath, newRaw, 'utf8');
    }

    return { frontmatter, content: newBody, raw: newRaw };
  }

  /**
   * Remove a skill by name.
   * @param {string} name
   * @returns {Promise<string>} path of deleted file
   */
  async remove(name) {
    const filePath = this._resolvePath(name);
    await fs.promises.unlink(filePath);
    return filePath;
  }

  /**
   * Search skills by query string (matches name, description, tags).
   * @param {string} query
   * @returns {Promise<Array<{name, description, tags, category, path, score}>>}
   */
  async search(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return this.list();

    const all = await this.list();
    const terms = q.split(/\s+/);

    const scored = [];
    for (const skill of all) {
      const haystack = [
        skill.name,
        skill.description,
        ...(Array.isArray(skill.tags) ? skill.tags : []),
        skill.category,
      ].join(' ').toLowerCase();

      let matches = 0;
      for (const term of terms) {
        if (haystack.includes(term)) matches++;
      }

      if (matches > 0) {
        scored.push({ ...skill, score: matches / terms.length });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Load a skill's full markdown content for injection into context.
   * @param {string} name
   * @returns {Promise<string>} full raw markdown content
   */
  async load(name) {
    const filePath = this._resolvePath(name);
    return fs.promises.readFile(filePath, 'utf8');
  }

  /**
   * List unique categories across all skills.
   * @returns {Promise<string[]>}
   */
  async categories() {
    const all = await this.list();
    const cats = new Set(all.map(s => s.category));
    return [...cats].sort();
  }

  /**
   * Aggregate stats about stored skills.
   * @returns {Promise<{total: number, byCategory: object}>}
   */
  async stats() {
    const all = await this.list();
    const byCategory = {};
    for (const skill of all) {
      byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
    }
    return { total: all.length, byCategory };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Resolve a skill name to its file path.
   * Accepts "web-audit", "web-audit.md", or a full path.
   */
  _resolvePath(name) {
    if (path.isAbsolute(name)) return name;
    const filename = name.endsWith('.md') ? name : `${name}.md`;
    return path.join(this.baseDir, filename);
  }

  /**
   * List all .md files in baseDir.
   */
  async _mdFiles() {
    try {
      const entries = await fs.promises.readdir(this.baseDir);
      return entries
        .filter(f => f.endsWith('.md'))
        .map(f => path.join(this.baseDir, f));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  /**
   * Build a raw .md string from frontmatter object + body string.
   */
  _buildRaw(frontmatter, body) {
    const fm = serializeFrontmatter(frontmatter);
    return `${fm}\n\n${body}\n`;
  }
}

module.exports = { SkillEngine };
