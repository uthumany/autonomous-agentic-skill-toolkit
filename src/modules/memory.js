const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const VALID_CATEGORIES = ['user_pref', 'project', 'tool', 'general', 'lesson'];
const DEFAULT_BASE_DIR = path.join(os.homedir(), '.uthy', 'memory');
const MEMORY_FILE = 'memory.json';

class MemoryEngine {
  /**
   * @param {string} [baseDir] - Directory to store memory.json. Defaults to ~/.uthy/memory/
   */
  constructor(baseDir) {
    this.baseDir = baseDir || DEFAULT_BASE_DIR;
    this.filePath = path.join(this.baseDir, MEMORY_FILE);
    this.entries = [];
    this._initialized = false;
  }

  /**
   * Create the memory directory if needed and load or create memory.json.
   * Must be called (and awaited) before using any other method.
   */
  async init() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      try {
        this.entries = JSON.parse(raw);
      } catch {
        this.entries = [];
      }
    } else {
      this.entries = [];
      this._save();
    }

    this._initialized = true;
    return this;
  }

  // ── Internal helpers ───────────────────────────────────────────────

  _assertInit() {
    if (!this._initialized) {
      throw new Error('MemoryEngine not initialised. Call init() first.');
    }
  }

  _save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
  }

  _genId() {
    return crypto.randomBytes(8).toString('hex');
  }

  _now() {
    return new Date().toISOString();
  }

  /**
   * Compute a relevance score for an entry.
   * Formula combines:
   *   recency   – exponential decay based on hours since creation
   *   access    – logarithmic boost for every time it was accessed
   *   freshness – how recently it was accessed
   *
   * Final score is clamped 0-100.
   */
  _computeScore(entry) {
    const now = Date.now();
    const created = new Date(entry.created).getTime();
    const accessed = new Date(entry.accessed).getTime();

    // Recency: decays over 30 days (720 hours)
    const hoursSinceCreated = (now - created) / (1000 * 60 * 60);
    const recency = Math.max(0, 100 * Math.exp(-hoursSinceCreated / 720));

    // Access frequency boost (log scale, capped)
    const accessCount = entry.accessCount || 0;
    const accessBoost = Math.min(50, Math.log2(accessCount + 1) * 10);

    // Freshness: decays over 7 days (168 hours) since last access
    const hoursSinceAccessed = (now - accessed) / (1000 * 60 * 60);
    const freshness = Math.max(0, 100 * Math.exp(-hoursSinceAccessed / 168));

    // Weighted combination
    const score = recency * 0.3 + accessBoost * 0.3 + freshness * 0.4;
    return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
  }

  _refreshScores() {
    for (const entry of this.entries) {
      entry.score = this._computeScore(entry);
    }
  }

  _validateCategory(category) {
    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category "${category}". Valid: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  // ── Public CRUD API ────────────────────────────────────────────────

  /**
   * Add a new memory entry.
   * @param {string} content  - The memory content / fact
   * @param {string} [category] - One of: user_pref, project, tool, general, lesson
   * @param {string[]} [tags]  - Searchable tags
   * @returns {object} The created entry
   */
  add(content, category, tags) {
    this._assertInit();
    if (!content || typeof content !== 'string') {
      throw new Error('content must be a non-empty string');
    }
    category = category || 'general';
    this._validateCategory(category);
    tags = Array.isArray(tags) ? tags.map(String) : [];

    const now = this._now();
    const entry = {
      id: this._genId(),
      content: content.trim(),
      category,
      tags,
      created: now,
      accessed: now,
      accessCount: 0,
      score: 0,
    };
    entry.score = this._computeScore(entry);

    this.entries.push(entry);
    this._save();
    return { ...entry };
  }

  /**
   * List memory entries sorted by score (descending).
   * @param {object} [options]
   * @param {string} [options.category] - Filter by category
   * @param {string[]} [options.tags] - Filter to entries containing ALL given tags
   * @param {number} [options.limit] - Max entries to return
   * @param {number} [options.minScore] - Minimum score threshold
   * @returns {object[]} Matching entries
   */
  list(options) {
    this._assertInit();
    options = options || {};
    this._refreshScores();

    let results = [...this.entries];

    if (options.category) {
      results = results.filter(e => e.category === options.category);
    }

    if (Array.isArray(options.tags) && options.tags.length > 0) {
      results = results.filter(e =>
        options.tags.every(t => e.tags.includes(t))
      );
    }

    if (typeof options.minScore === 'number') {
      results = results.filter(e => e.score >= options.minScore);
    }

    results.sort((a, b) => b.score - a.score);

    if (typeof options.limit === 'number' && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results.map(e => ({ ...e }));
  }

  /**
   * Search memory by keyword. Matches against content and tags (case-insensitive).
   * @param {string} query - Search term
   * @param {number} [limit=10] - Max results
   * @returns {object[]} Matching entries sorted by score
   */
  search(query, limit) {
    this._assertInit();
    if (!query || typeof query !== 'string') {
      throw new Error('query must be a non-empty string');
    }
    limit = typeof limit === 'number' && limit > 0 ? limit : 10;

    this._refreshScores();

    const lowerQuery = query.toLowerCase();
    const queryTokens = lowerQuery.split(/\s+/).filter(Boolean);

    const scored = [];

    for (const entry of this.entries) {
      const contentLower = entry.content.toLowerCase();
      const tagsLower = entry.tags.map(t => t.toLowerCase());
      let matched = false;

      // Check if any query token appears in content or tags
      for (const token of queryTokens) {
        if (contentLower.includes(token) || tagsLower.some(t => t.includes(token))) {
          matched = true;
          break;
        }
      }

      if (matched) {
        scored.push({ ...entry });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Get a single entry by ID and update its accessed timestamp.
   * @param {string} id
   * @returns {object|null} The entry, or null if not found
   */
  get(id) {
    this._assertInit();
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return null;

    entry.accessed = this._now();
    entry.accessCount = (entry.accessCount || 0) + 1;
    entry.score = this._computeScore(entry);
    this._save();

    return { ...entry };
  }

  /**
   * Update an existing entry.
   * @param {string} id
   * @param {string} [content]
   * @param {string} [category]
   * @param {string[]} [tags]
   * @returns {object|null} Updated entry, or null if not found
   */
  update(id, content, category, tags) {
    this._assertInit();
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return null;

    if (content !== undefined && content !== null) {
      entry.content = String(content).trim();
    }
    if (category !== undefined && category !== null) {
      this._validateCategory(category);
      entry.category = category;
    }
    if (Array.isArray(tags)) {
      entry.tags = tags.map(String);
    }

    entry.accessed = this._now();
    entry.score = this._computeScore(entry);
    this._save();

    return { ...entry };
  }

  /**
   * Remove an entry by ID.
   * @param {string} id
   * @returns {boolean} true if removed, false if not found
   */
  remove(id) {
    this._assertInit();
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx === -1) return false;

    this.entries.splice(idx, 1);
    this._save();
    return true;
  }

  // ── Maintenance ────────────────────────────────────────────────────

  /**
   * Run decay analysis. Returns entries flagged below the score threshold
   * and entries that are still healthy.
   * @param {number} [threshold=10] - Score below this is "flagged"
   * @returns {{ flagged: object[], healthy: object[] }}
   */
  decay(threshold) {
    this._assertInit();
    threshold = typeof threshold === 'number' ? threshold : 10;

    this._refreshScores();

    const flagged = [];
    const healthy = [];

    for (const entry of this.entries) {
      if (entry.score < threshold) {
        flagged.push({ ...entry });
      } else {
        healthy.push({ ...entry });
      }
    }

    return { flagged, healthy };
  }

  /**
   * Export all memory entries as a JSON string (for backup).
   * @returns {string} JSON string of all entries
   */
  export() {
    this._assertInit();
    this._refreshScores();
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Import entries from a JSON string. Deduplicates by ID.
   * @param {string} jsonStr - JSON string (array of entries or { entries: [...] })
   * @returns {number} Count of newly imported entries
   */
  import(jsonStr) {
    this._assertInit();
    if (!jsonStr || typeof jsonStr !== 'string') {
      throw new Error('jsonStr must be a non-empty string');
    }

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      throw new Error('Invalid JSON string');
    }

    // Accept either a raw array or an object with an entries key
    if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.entries)) {
      data = data.entries;
    }
    if (!Array.isArray(data)) {
      throw new Error('Import data must be an array of entries');
    }

    const existingIds = new Set(this.entries.map(e => e.id));
    let imported = 0;

    for (const item of data) {
      if (!item || !item.id || !item.content) continue;
      if (existingIds.has(item.id)) continue;

      const entry = {
        id: item.id,
        content: String(item.content),
        category: VALID_CATEGORIES.includes(item.category) ? item.category : 'general',
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        created: item.created || this._now(),
        accessed: item.accessed || this._now(),
        accessCount: typeof item.accessCount === 'number' ? item.accessCount : 0,
        score: 0,
      };
      entry.score = this._computeScore(entry);

      this.entries.push(entry);
      existingIds.add(entry.id);
      imported++;
    }

    if (imported > 0) {
      this._save();
    }

    return imported;
  }

  /**
   * Get statistics about the memory store.
   * @returns {{ total: number, byCategory: object, avgScore: number }}
   */
  stats() {
    this._assertInit();
    this._refreshScores();

    const byCategory = {};
    for (const cat of VALID_CATEGORIES) {
      byCategory[cat] = 0;
    }

    let totalScore = 0;

    for (const entry of this.entries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      totalScore += entry.score;
    }

    return {
      total: this.entries.length,
      byCategory,
      avgScore: this.entries.length > 0
        ? Math.round((totalScore / this.entries.length) * 100) / 100
        : 0,
    };
  }
}

module.exports = { MemoryEngine };
