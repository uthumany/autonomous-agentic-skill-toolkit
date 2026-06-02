/**
 * UTHY AGENTIC OS — Chat Input Panel
 * Multi-line text area with file upload support (@filepath syntax)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════
// FILE ATTACHMENT HANDLER
// ═══════════════════════════════════════════════════════════

const SUPPORTED_EXTENSIONS = new Set([
  // Code
  '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h',
  '.cs', '.php', '.swift', '.kt', '.scala', '.lua', '.sh', '.bash', '.zsh', '.fish',
  '.ps1', '.bat', '.cmd', '.sql', '.r', '.m', '.pl', '.ex', '.exs', '.erl', '.hs',
  // Config
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env', '.xml',
  // Web
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
  // Docs
  '.md', '.txt', '.rst', '.tex', '.log', '.csv', '.tsv',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico',
  // Data
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Archives
  '.zip', '.tar', '.gz', '.7z', '.rar',
]);

function getFileTypeInfo(ext) {
  const types = {
    '.js': { icon: '📜', label: 'JavaScript' },
    '.ts': { icon: '🔷', label: 'TypeScript' },
    '.py': { icon: '🐍', label: 'Python' },
    '.json': { icon: '📋', label: 'JSON' },
    '.md': { icon: '📝', label: 'Markdown' },
    '.html': { icon: '🌐', label: 'HTML' },
    '.css': { icon: '🎨', label: 'CSS' },
    '.png': { icon: '🖼️', label: 'PNG Image' },
    '.jpg': { icon: '🖼️', label: 'JPEG Image' },
    '.gif': { icon: '🖼️', label: 'GIF Image' },
    '.svg': { icon: '🖼️', label: 'SVG Image' },
    '.pdf': { icon: '📄', label: 'PDF Document' },
    '.yaml': { icon: '⚙️', label: 'YAML Config' },
    '.yml': { icon: '⚙️', label: 'YAML Config' },
    '.sh': { icon: '💻', label: 'Shell Script' },
    '.sql': { icon: '🗄️', label: 'SQL' },
    '.go': { icon: '🔵', label: 'Go' },
    '.rs': { icon: '🦀', label: 'Rust' },
    '.java': { icon: '☕', label: 'Java' },
    '.rb': { icon: '💎', label: 'Ruby' },
    '.vue': { icon: '💚', label: 'Vue' },
    '.svelte': { icon: '🔥', label: 'Svelte' },
    '.xml': { icon: '📰', label: 'XML' },
    '.env': { icon: '🔐', label: 'Environment' },
    '.txt': { icon: '📄', label: 'Text' },
    '.log': { icon: '📊', label: 'Log' },
    '.csv': { icon: '📊', label: 'CSV Data' },
  };
  return types[ext] || { icon: '📎', label: ext.replace('.', '').toUpperCase() };
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function isTextFile(ext) {
  const textExts = new Set([
    '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h',
    '.cs', '.php', '.swift', '.kt', '.scala', '.lua', '.sh', '.bash', '.zsh', '.fish',
    '.ps1', '.bat', '.cmd', '.sql', '.r', '.m', '.pl', '.ex', '.exs', '.erl', '.hs',
    '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env', '.xml',
    '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
    '.md', '.txt', '.rst', '.tex', '.log', '.csv', '.tsv',
  ]);
  return textExts.has(ext);
}

function readAttachedFile(filePath) {
  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return { error: `File not found: ${filePath}` };
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return { error: `Is a directory: ${filePath}` };
    }

    const ext = path.extname(resolved).toLowerCase();
    const typeInfo = getFileTypeInfo(ext);
    const size = stat.size;

    if (size > 10 * 1024 * 1024) {
      return { error: `File too large (${formatFileSize(size)}). Max: 10 MB` };
    }

    if (isTextFile(ext)) {
      const content = fs.readFileSync(resolved, 'utf8');
      const lines = content.split('\n').length;
      return {
        path: resolved,
        name: path.basename(resolved),
        ext,
        typeInfo,
        size,
        sizeFormatted: formatFileSize(size),
        lines,
        content,
        isText: true,
      };
    } else {
      // Binary file — just metadata
      return {
        path: resolved,
        name: path.basename(resolved),
        ext,
        typeInfo,
        size,
        sizeFormatted: formatFileSize(size),
        isText: false,
        content: null,
      };
    }
  } catch (err) {
    return { error: `Cannot read file: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════
// CHAT INPUT PANEL RENDERER
// ═══════════════════════════════════════════════════════════

function renderChatPrompt(theme, attachments = []) {
  const t = theme;
  const lines = [];

  // Top border with rounded corners
  const W = 70;
  const topBorder = `${t.muted}╭${'─'.repeat(W - 2)}╮${t.reset}`;
  lines.push(topBorder);

  // Attached files preview
  if (attachments.length > 0) {
    for (const att of attachments) {
      if (att.error) {
        lines.push(`${t.muted}│${t.reset} ${t.error}⚠ ${t.error}${att.error}${t.reset}`);
      } else {
        const icon = att.typeInfo.icon;
        const name = `${t.primary}${att.name}${t.reset}`;
        const meta = att.isText
          ? `${t.muted}${att.sizeFormatted} · ${att.lines} lines${t.reset}`
          : `${t.muted}${att.sizeFormatted} · ${att.typeInfo.label}${t.reset}`;
        lines.push(`${t.muted}│${t.reset}  ${icon} ${name}  ${meta}`);
      }
    }
    lines.push(`${t.muted}│${t.reset} ${t.muted}${'┈'.repeat(W - 4)}${t.reset}`);
  }

  // Input area marker
  const inputLine = `${t.muted}│${t.reset}  ${t.secondary}▸${t.reset} `;
  lines.push(inputLine);

  // Bottom border with instructions
  const instructions = `${t.muted}@file to attach · Enter to send · /help for commands${t.reset}`;
  const instrLen = instructions.replace(/\x1b\[[0-9;]*m/g, '').length;
  const instrPad = Math.max(0, W - 4 - instrLen);
  lines.push(`${t.muted}│${t.reset} ${instructions}${' '.repeat(instrPad)} ${t.muted}│${t.reset}`);
  lines.push(`${t.muted}╰${'─'.repeat(W - 2)}╯${t.reset}`);

  return lines;
}

function parseAttachments(input) {
  const attachments = [];
  const parts = input.split(/(\s+@)/);
  let cleanText = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.trim() === '@' || part.endsWith('@')) {
      // Next part is a file path
      const nextPart = parts[i + 1];
      if (nextPart) {
        const filePath = nextPart.trim().split(/\s/)[0];
        if (filePath) {
          const att = readAttachedFile(filePath);
          attachments.push(att);
          // Remove the file reference from clean text
          cleanText += ' ';
          i++; // skip the path part
          continue;
        }
      }
    }
    cleanText += part;
  }

  return {
    text: cleanText.trim(),
    attachments,
  };
}

// ═══════════════════════════════════════════════════════════
// CHAT HISTORY RENDERER
// ═══════════════════════════════════════════════════════════

function renderChatMessage(role, content, theme) {
  const t = theme;
  const W = 70;

  if (role === 'user') {
    const lines = content.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length));
    const output = [];
    output.push(`${t.primary}┌─ ${t.bold}You${t.reset}${t.primary} ${'─'.repeat(Math.max(1, W - 8))}┐${t.reset}`);
    for (const line of lines) {
      const pad = Math.max(0, maxLen - line.length);
      output.push(`${t.primary}│${t.reset} ${line}${' '.repeat(pad + (W - maxLen - 4))} ${t.primary}│${t.reset}`);
    }
    output.push(`${t.primary}└${'─'.repeat(W - 2)}┘${t.reset}`);
    return output.join('\n');
  }

  if (role === 'assistant') {
    const lines = content.split('\n');
    const output = [];
    output.push(`${t.accent}┌─ ${t.bold}UTHY${t.reset}${t.accent} ${'─'.repeat(Math.max(1, W - 9))}┐${t.reset}`);
    for (const line of lines) {
      const stripped = line;
      const maxLen = Math.max(...lines.map(l => l.length));
      const pad = Math.max(0, maxLen - stripped.length);
      output.push(`${t.accent}│${t.reset} ${stripped}${' '.repeat(pad + (W - maxLen - 4))} ${t.accent}│${t.reset}`);
    }
    output.push(`${t.accent}└${'─'.repeat(W - 2)}┘${t.reset}`);
    return output.join('\n');
  }

  return content;
}

// ═══════════════════════════════════════════════════════════
// FILE TREE WALKER (for @dir/ syntax)
// ═══════════════════════════════════════════════════════════

function walkDirectory(dirPath, maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];

  const entries = [];
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;

      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        entries.push({
          name: item.name,
          path: fullPath,
          isDir: true,
          children: walkDirectory(fullPath, maxDepth, currentDepth + 1),
        });
      } else {
        const ext = path.extname(item.name).toLowerCase();
        const stat = fs.statSync(fullPath);
        entries.push({
          name: item.name,
          path: fullPath,
          isDir: false,
          ext,
          size: stat.size,
          typeInfo: getFileTypeInfo(ext),
        });
      }
    }
  } catch (err) {
    // Permission denied or other error
  }

  return entries;
}

function renderFileTree(entries, theme, prefix = '') {
  const t = theme;
  const lines = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    if (entry.isDir) {
      lines.push(`${prefix}${connector}${t.primary}📁 ${entry.name}/${t.reset}`);
      if (entry.children && entry.children.length > 0) {
        lines.push(...renderFileTree(entry.children, theme, childPrefix));
      }
    } else {
      const icon = entry.typeInfo.icon;
      const size = formatFileSize(entry.size);
      lines.push(`${prefix}${connector}${icon} ${entry.name} ${t.muted}(${size})${t.reset}`);
    }
  }

  return lines;
}

module.exports = {
  parseAttachments,
  readAttachedFile,
  renderChatPrompt,
  renderChatMessage,
  renderFileTree,
  walkDirectory,
  getFileTypeInfo,
  formatFileSize,
  isTextFile,
  SUPPORTED_EXTENSIONS,
};
