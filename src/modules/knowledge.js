'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.ts', '.py', '.md', '.txt', '.json', '.yaml', '.yml', '.html', '.css'
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

const CHUNK_LINES = 40;
const CHUNK_OVERLAP = 5;

const STOPWORDS = new Set([
  'the','is','at','which','on','a','an','and','or','but','in','with','to',
  'for','of','not','no','can','had','has','have','will','do','this','that',
  'these','those','it','its','be','as','was','were','been','from','by','are',
  'if','then','than','so','such','what','when','how','all','each','every',
  'both','few','more','most','other','some','any'
]);

function tokenize(text) {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 0 && !STOPWORDS.has(t));
  return tokens;
}

function tokenizeRaw(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 0);
}

function makeId(filePath) {
  return crypto.createHash('md5').update(path.resolve(filePath)).digest('hex');
}

function chunkContent(content) {
  const lines = content.split('\n');
  const chunks = [];
  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + CHUNK_LINES, lines.length);
    const text = lines.slice(start, end).join('\n');
    chunks.push({ text, startLine: start + 1, endLine: end });
    start += CHUNK_LINES - CHUNK_OVERLAP;
    if (start >= lines.length) break;
    if (CHUNK_OVERLAP >= CHUNK_LINES) break;
  }
  return chunks;
}

function getExt(filePath) {
  return path.extname(filePath).toLowerCase();
}

function walkDir(dirPath, callback) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkDir(full, callback);
    } else if (entry.isFile()) {
      callback(full);
    }
  }
}

class KnowledgeEngine {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(os.homedir(), '.uthy', 'knowledge');
    this.indexPath = path.join(this.baseDir, 'index.json');
    this._entries = {}; // path -> entry (internal store)
  }

  async init() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (fs.existsSync(this.indexPath)) {
      try {
        const data = fs.readFileSync(this.indexPath, 'utf8');
        this._entries = JSON.parse(data);
      } catch {
        this._entries = {};
      }
    } else {
      this._entries = {};
      this._save();
    }
    return this;
  }

  _save() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    fs.writeFileSync(this.indexPath, JSON.stringify(this._entries, null, 2), 'utf8');
  }

  indexFile(filePath) {
    const resolved = path.resolve(filePath);
    const ext = getExt(resolved);
    if (!SUPPORTED_EXTENSIONS.has(ext)) return null;

    let stat;
    try {
      stat = fs.statSync(resolved);
    } catch {
      return null;
    }
    if (stat.size > MAX_FILE_SIZE) return null;

    let content;
    try {
      content = fs.readFileSync(resolved, 'utf8');
    } catch {
      return null;
    }

    const chunks = chunkContent(content);
    const entry = {
      id: makeId(resolved),
      path: resolved,
      name: path.basename(resolved),
      content,
      chunks,
      lastIndexed: new Date().toISOString(),
      size: stat.size,
      type: ext.replace('.', '')
    };
    this._entries[resolved] = entry;
    return entry;
  }

  index(dirPath) {
    const resolved = path.resolve(dirPath);
    const result = { indexed: 0, skipped: 0, errors: 0 };
    walkDir(resolved, (filePath) => {
      const ext = getExt(filePath);
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        result.skipped++;
        return;
      }
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_FILE_SIZE) {
          result.skipped++;
          return;
        }
      } catch {
        result.errors++;
        return;
      }
      try {
        const entry = this.indexFile(filePath);
        if (entry) {
          result.indexed++;
        } else {
          result.skipped++;
        }
      } catch {
        result.errors++;
      }
    });
    this._save();
    return result;
  }

  search(query, limit = 10) {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    // Gather all chunks across all entries
    const allChunks = [];
    const entries = Object.values(this._entries);
    for (const entry of entries) {
      for (let i = 0; i < entry.chunks.length; i++) {
        const chunk = entry.chunks[i];
        const tokens = tokenizeRaw(chunk.text);
        allChunks.push({ entry, chunkIndex: i, chunk, tokens });
      }
    }

    const totalChunks = allChunks.length;
    if (totalChunks === 0) return [];

    // Build document frequency for each query term
    const df = {};
    for (const qt of queryTokens) {
      df[qt] = 0;
      for (const ac of allChunks) {
        if (ac.tokens.includes(qt)) {
          df[qt]++;
        }
      }
    }

    // Score each chunk
    const results = [];
    for (const ac of allChunks) {
      const tokenCount = ac.tokens.length;
      if (tokenCount === 0) continue;

      let score = 0;
      // Build term frequency map for this chunk
      const tfMap = {};
      for (const t of ac.tokens) {
        tfMap[t] = (tfMap[t] || 0) + 1;
      }

      for (const qt of queryTokens) {
        const tf = (tfMap[qt] || 0) / tokenCount;
        if (tf === 0) continue;
        const containing = df[qt] || 0;
        const idf = containing > 0 ? Math.log(totalChunks / containing) : 0;
        score += tf * idf;
      }

      if (score > 0) {
        const snippet = ac.chunk.text.substring(0, 200).replace(/\n/g, ' ');
        results.push({
          path: ac.entry.path,
          chunk: ac.chunk,
          score,
          snippet
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  stats() {
    const entries = Object.values(this._entries);
    let totalChunks = 0;
    let totalChars = 0;
    const byType = {};
    for (const entry of entries) {
      totalChunks += entry.chunks.length;
      totalChars += (entry.content || '').length;
      const t = entry.type || 'unknown';
      if (!byType[t]) byType[t] = { files: 0, chunks: 0, chars: 0 };
      byType[t].files++;
      byType[t].chunks += entry.chunks.length;
      byType[t].chars += (entry.content || '').length;
    }
    return {
      totalFiles: entries.length,
      totalChunks,
      totalChars,
      byType
    };
  }

  forget(filePath) {
    const resolved = path.resolve(filePath);
    if (this._entries[resolved]) {
      delete this._entries[resolved];
      this._save();
      return true;
    }
    // Try matching by basename or partial path
    for (const key of Object.keys(this._entries)) {
      if (key.endsWith(filePath) || this._entries[key].name === filePath) {
        delete this._entries[key];
        this._save();
        return true;
      }
    }
    return false;
  }

  forgetAll() {
    this._entries = {};
    this._save();
  }

  rebuild(dirPath) {
    this.forgetAll();
    return this.index(dirPath);
  }

  export() {
    return JSON.stringify(this._entries, null, 2);
  }

  import(jsonStr) {
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return 0;
    }
    let count = 0;
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && entry.path && entry.chunks) {
        this._entries[key] = entry;
        count++;
      }
    }
    this._save();
    return count;
  }
}

module.exports = {
  KnowledgeEngine,
};
