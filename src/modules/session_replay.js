/**
 * Cross-Platform Session Replay with DOM State Serialization
 *
 * Captures full fidelity traces: serialized DOM snapshots, HAR-style
 * network logs, console/error streams, and performance timeline events.
 * Packages into .aastreplay files. Includes a browser-based replay viewer.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * DOM snapshot serializer — captures and reconstructs DOM state
 */
class DOMSerializer {
  /**
   * Serialize the current DOM state into a lightweight diff-friendly format
   */
  static async serialize(page) {
    return await page.evaluate(() => {
      function serializeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return { type: 'text', content: node.textContent };
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return null;

        const el = node;
        const attrs = {};
        for (const attr of el.attributes) {
          attrs[attr.name] = attr.value;
        }

        const computed = window.getComputedStyle(el);
        const box = el.getBoundingClientRect();

        const serialized = {
          type: 'element',
          tag: el.tagName.toLowerCase(),
          attrs,
          style: {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            position: computed.position,
            top: Math.round(box.top),
            left: Math.round(box.left),
            width: Math.round(box.width),
            height: Math.round(box.height),
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
            fontFamily: computed.fontFamily,
          },
          bounds: {
            top: Math.round(box.top),
            left: Math.round(box.left),
            width: Math.round(box.width),
            height: Math.round(box.height),
          },
          children: [],
        };

        // Only include inline text content (no deep children to keep it small)
        if (el.childNodes.length <= 3 && el.textContent.length < 200) {
          serialized.textContent = el.textContent.trim();
        }

        // Limit children to important elements
        const importantChildren = Array.from(el.children).filter((child) => {
          const tag = child.tagName.toLowerCase();
          return ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'a', 'button', 'input', 'select', 'textarea', 'img', 'table',
            'ul', 'ol', 'li', 'form', 'section', 'nav', 'header', 'footer',
            'main', 'article', 'aside', 'label', 'video', 'canvas'].includes(tag);
        }).slice(0, 50);

        for (const child of importantChildren) {
          const serialized_child = serializeNode(child);
          if (serialized_child) serialized.children.push(serialized_child);
        }

        return serialized;
      }

      return {
        title: document.title,
        url: window.location.href,
        doctype: document.doctype ? document.doctype.name : null,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        tree: serializeNode(document.documentElement),
        timestamp: Date.now(),
      };
    });
  }
}

/**
 * Network log recorder in HAR-like format
 */
class NetworkRecorder {
  constructor() {
    this.entries = [];
  }

  attachToPage(page) {
    page.on('request', (request) => {
      this.entries.push({
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData() || null,
        startedAt: Date.now(),
        resourceType: request.resourceType(),
      });
    });

    page.on('response', async (response) => {
      const entry = this.entries.find(
        (e) => e.url === response.url() && e.method === response.request().method() && !e.status
      );
      if (entry) {
        entry.status = response.status();
        entry.statusText = response.statusText();
        entry.responseHeaders = response.headers();
        entry.completedAt = Date.now();
        entry.durationMs = entry.completedAt - entry.startedAt;

        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            entry.responseBody = await response.json().catch(() => null);
          } else if (contentType.includes('text')) {
            const text = await response.text().catch(() => null);
            entry.responseBody = text ? text.substring(0, 5000) : null;
          }
        } catch (e) {
          // Response body may not be available
        }
      }
    });
  }

  getEntries() {
    return this.entries;
  }
}

/**
 * Performance timeline recorder
 */
class PerformanceRecorder {
  constructor() {
    this.metrics = [];
  }

  async capture(page) {
    const perfData = await page.evaluate(() => {
      const perf = performance;
      const entries = perf.getEntriesByType('navigation').map((e) => ({
        type: 'navigation',
        name: e.name,
        startTime: Math.round(e.startTime),
        duration: Math.round(e.duration),
        domContentLoaded: Math.round(e.domContentLoadedEventEnd),
        loadComplete: Math.round(e.loadEventEnd),
        domInteractive: Math.round(e.domInteractive),
        responseStart: Math.round(e.responseStart),
        responseEnd: Math.round(e.responseEnd),
      }));

      const paintEntries = perf.getEntriesByType('paint').map((e) => ({
        type: 'paint',
        name: e.name,
        startTime: Math.round(e.startTime),
      }));

      const resourceEntries = perf.getEntriesByType('resource').map((e) => ({
        type: 'resource',
        name: e.name,
        duration: Math.round(e.duration),
        transferSize: e.transferSize,
        initiatorType: e.initiatorType,
      }));

      const longTasks = perf.getEntriesByType('longtask').map((e) => ({
        type: 'longtask',
        startTime: Math.round(e.startTime),
        duration: Math.round(e.duration),
      }));

      return {
        navigation: entries,
        paint: paintEntries,
        resources: resourceEntries.slice(0, 50),
        longTasks,
        memory: perf.memory
          ? {
              usedJSHeapSize: perf.memory.usedJSHeapSize,
              totalJSHeapSize: perf.memory.totalJSHeapSize,
            }
          : null,
      };
    });

    perfData.capturedAt = Date.now();
    this.metrics.push(perfData);
    return perfData;
  }

  getMetrics() {
    return this.metrics;
  }
}

/**
 * Session trace — the complete recording
 */
class SessionTrace {
  constructor(url) {
    this.url = url;
    this.id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.timeline = [];
    this.networkEntries = [];
    this.consoleLogs = [];
    this.consoleErrors = [];
    this.performanceMetrics = [];
    this.metadata = {
      createdAt: new Date().toISOString(),
      url,
      userAgent: null,
      viewport: null,
    };
  }

  addSnapshot(snapshot) {
    this.timeline.push({
      index: this.timeline.length,
      type: 'dom-snapshot',
      timestamp: Date.now(),
      data: snapshot,
    });
  }

  addNetworkEntry(entry) {
    this.networkEntries.push(entry);
  }

  addConsoleEntry(entry) {
    if (entry.type === 'error') {
      this.consoleErrors.push(entry);
    } else {
      this.consoleLogs.push(entry);
    }
  }

  addPerformanceSnapshot(metrics) {
    this.performanceMetrics.push(metrics);
  }

  /**
   * Package into .aastreplay format (compressed JSON)
   */
  package() {
    this.metadata.totalSnapshots = this.timeline.length;
    this.metadata.totalNetworkEntries = this.networkEntries.length;
    this.metadata.totalConsoleLogs = this.consoleLogs.length;
    this.metadata.totalErrors = this.consoleErrors.length;
    this.metadata.duration = this.timeline.length > 0
      ? this.timeline[this.timeline.length - 1].timestamp - this.timeline[0].timestamp
      : 0;

    const payload = {
      version: '1.0.0',
      format: 'aastreplay',
      metadata: this.metadata,
      timeline: this.timeline,
      network: this.networkEntries,
      console: this.consoleLogs,
      errors: this.consoleErrors,
      performance: this.performanceMetrics,
    };

    return payload;
  }

  /**
   * Serialize to buffer (compressed)
   */
  serialize() {
    const payload = this.package();
    const json = JSON.stringify(payload);
    return zlib.gzipSync(Buffer.from(json, 'utf8'));
  }

  /**
   * Save as .aastreplay file
   */
  save(outputPath) {
    const buffer = this.serialize();
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    fs.writeFileSync(outputPath, buffer);
    console.log(`[Replay] Trace saved to ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return outputPath;
  }

  /**
   * Load from .aastreplay file
   */
  static load(filePath) {
    const buffer = fs.readFileSync(filePath);
    const json = zlib.gunzipSync(buffer).toString('utf8');
    return JSON.parse(json);
  }
}

/**
 * Session recorder — orchestrates the recording process
 */
class SessionRecorder {
  constructor(config = {}) {
    this.config = {
      captureInterval: config.captureInterval || 1000, // ms between DOM snapshots
      recordNetwork: config.recordNetwork !== false,
      recordPerformance: config.recordPerformance !== false,
      recordConsole: config.recordConsole !== false,
      outputDir: config.outputDir || './aast-traces',
      ...config,
    };
  }

  /**
   * Record a full session trace for a URL
   */
  async record(url, options = {}) {
    console.log(`\n[Replay] Recording session for ${url}...`);
    const duration = (options.duration || 10) * 1000;
    const trace = new SessionTrace(url);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: options.viewport || { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    trace.metadata.userAgent = await context.browser().newContext ? 'playwright' : 'unknown';
    trace.metadata.viewport = options.viewport || { width: 1280, height: 720 };

    // Attach network recorder
    const networkRecorder = new NetworkRecorder();
    if (this.config.recordNetwork) {
      networkRecorder.attachToPage(page);
    }

    // Attach console listeners
    if (this.config.recordConsole) {
      page.on('console', (msg) => {
        trace.addConsoleEntry({
          type: msg.type(),
          text: msg.text(),
          timestamp: Date.now(),
        });
      });

      page.on('pageerror', (error) => {
        trace.addConsoleEntry({
          type: 'error',
          text: error.message,
          timestamp: Date.now(),
        });
      });
    }

    // Navigate
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Record snapshots at intervals
    const startTime = Date.now();
    const perfRecorder = new PerformanceRecorder();

    while (Date.now() - startTime < duration) {
      // DOM snapshot
      const snapshot = await DOMSerializer.serialize(page);
      trace.addSnapshot(snapshot);

      // Performance metrics (less frequent)
      if (this.config.recordPerformance && trace.timeline.length % 5 === 0) {
        const metrics = await perfRecorder.capture(page);
        trace.addPerformanceSnapshot(metrics);
      }

      await page.waitForTimeout(this.config.captureInterval);
    }

    // Final snapshot
    const finalSnapshot = await DOMSerializer.serialize(page);
    trace.addSnapshot(finalSnapshot);

    // Collect network entries
    trace.networkEntries = networkRecorder.getEntries();

    await browser.close();

    // Save trace
    const filename = options.output || `${trace.id}.aastreplay`;
    const outputPath = path.join(this.config.outputDir, filename);
    trace.save(outputPath);

    console.log(`[Replay] Recording complete: ${trace.timeline.length} snapshots, ${trace.networkEntries.length} network entries`);

    return {
      traceId: trace.id,
      outputPath,
      stats: {
        snapshots: trace.timeline.length,
        networkEntries: trace.networkEntries.length,
        consoleLogs: trace.consoleLogs.length,
        consoleErrors: trace.consoleErrors.length,
        durationMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Replay viewer — generates an HTML page to visualize a trace
 */
class ReplayViewer {
  /**
   * Generate a self-contained HTML viewer for a .aastreplay file
   */
  static generateViewerHTML(traceData, outputPath) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AAST Replay Viewer — ${traceData.metadata.url}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; }
    .header { background: #161b22; padding: 12px 20px; border-bottom: 1px solid #30363d; display: flex; align-items: center; gap: 16px; }
    .header h1 { font-size: 14px; color: #58a6ff; }
    .header .meta { font-size: 12px; color: #8b949e; }
    .controls { background: #161b22; padding: 10px 20px; border-bottom: 1px solid #30363d; display: flex; align-items: center; gap: 12px; }
    .controls button { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .controls button:hover { background: #30363d; }
    .controls button.active { background: #1f6feb; border-color: #1f6feb; }
    .controls input[type="range"] { flex: 1; accent-color: #58a6ff; }
    .controls .timestamp { font-size: 12px; color: #8b949e; min-width: 100px; }
    .main { display: grid; grid-template-columns: 1fr 360px; height: calc(100vh - 90px); }
    .viewport { background: #fff; position: relative; overflow: auto; }
    .sidebar { background: #161b22; border-left: 1px solid #30363d; overflow-y: auto; }
    .sidebar h3 { font-size: 12px; text-transform: uppercase; padding: 10px 14px; color: #8b949e; border-bottom: 1px solid #30363d; }
    .sidebar .tab-bar { display: flex; border-bottom: 1px solid #30363d; }
    .sidebar .tab { padding: 8px 14px; font-size: 12px; cursor: pointer; color: #8b949e; border-bottom: 2px solid transparent; }
    .sidebar .tab.active { color: #58a6ff; border-bottom-color: #58a6ff; }
    .sidebar .panel { display: none; padding: 10px 14px; }
    .sidebar .panel.active { display: block; }
    .log-entry { font-size: 11px; padding: 4px 0; border-bottom: 1px solid #21262d; font-family: monospace; }
    .log-entry.error { color: #f85149; }
    .log-entry.warn { color: #d29922; }
    .log-entry.info { color: #8b949e; }
    .network-entry { font-size: 11px; padding: 4px 0; border-bottom: 1px solid #21262d; }
    .network-entry .method { color: #58a6ff; font-weight: bold; }
    .network-entry .status { font-weight: bold; }
    .network-entry .status.ok { color: #3fb950; }
    .network-entry .status.error { color: #f85149; }
    .network-entry .url { color: #8b949e; word-break: break-all; }
    .element-overlay { position: absolute; border: 1px solid rgba(31, 111, 235, 0.4); background: rgba(31, 111, 235, 0.1); pointer-events: none; }
    .element-label { font-size: 9px; color: #1f6feb; position: absolute; top: -14px; left: 0; white-space: nowrap; background: #fff; padding: 0 2px; }
    .perf-metric { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #21262d; font-size: 12px; }
    .perf-metric .label { color: #8b949e; }
    .perf-metric .value { color: #c9d1d9; font-family: monospace; }
    .snapshot-info { background: #0d1117; padding: 10px 14px; border-bottom: 1px solid #30363d; font-size: 11px; color: #8b949e; }
    .empty { text-align: center; padding: 20px; color: #484f58; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AAST Replay Viewer</h1>
    <div class="meta">${traceData.metadata.url} | ${traceData.metadata.totalSnapshots} snapshots | ${new Date(traceData.metadata.createdAt).toLocaleString()}</div>
  </div>
  <div class="controls">
    <button id="btn-first" title="First">⏮</button>
    <button id="btn-prev" title="Previous">◀</button>
    <input type="range" id="slider" min="0" max="${Math.max(0, traceData.timeline.length - 1)}" value="0">
    <button id="btn-next" title="Next">▶</button>
    <button id="btn-last" title="Last">⏭</button>
    <button id="btn-play" title="Auto-play">▶ Play</button>
    <span class="timestamp" id="timestamp">-</span>
  </div>
  <div class="main">
    <div>
      <div class="snapshot-info" id="snapshot-info">Snapshot 0 / ${traceData.timeline.length}</div>
      <div class="viewport" id="viewport"></div>
    </div>
    <div class="sidebar">
      <div class="tab-bar">
        <div class="tab active" data-tab="dom">DOM Tree</div>
        <div class="tab" data-tab="network">Network (${traceData.network.length})</div>
        <div class="tab" data-tab="console">Console (${traceData.console.length + traceData.errors.length})</div>
        <div class="tab" data-tab="perf">Performance</div>
      </div>
      <div class="panel active" id="panel-dom"></div>
      <div class="panel" id="panel-network"></div>
      <div class="panel" id="panel-console"></div>
      <div class="panel" id="panel-perf"></div>
    </div>
  </div>
  <script>
    const DATA = ${JSON.stringify(traceData)};
    const timeline = DATA.timeline;
    let currentIndex = 0;
    let playing = false;
    let playInterval = null;

    const slider = document.getElementById('slider');
    const viewport = document.getElementById('viewport');
    const snapshotInfo = document.getElementById('snapshot-info');
    const timestamp = document.getElementById('timestamp');

    function renderSnapshot(index) {
      const snap = timeline[index];
      if (!snap) return;
      currentIndex = index;
      slider.value = index;
      snapshotInfo.textContent = \`Snapshot \${index + 1} / \${timeline.length}\`;
      timestamp.textContent = new Date(snap.timestamp).toLocaleTimeString();

      // Render DOM elements as overlays
      viewport.innerHTML = '';
      const d = snap.data;
      if (d && d.viewport) {
        viewport.style.width = d.viewport.width + 'px';
        viewport.style.minHeight = d.viewport.height + 'px';
      }

      // Build simple DOM representation
      function renderNode(node, parent) {
        if (!node || node.type === 'text') return;
        if (node.bounds && node.bounds.width > 0 && node.bounds.height > 0) {
          const el = document.createElement('div');
          el.className = 'element-overlay';
          el.style.top = node.bounds.top + 'px';
          el.style.left = node.bounds.left + 'px';
          el.style.width = node.bounds.width + 'px';
          el.style.height = node.bounds.height + 'px';
          if (node.tag !== 'div' || node.textContent) {
            const label = document.createElement('div');
            label.className = 'element-label';
            label.textContent = node.tag + (node.textContent ? ': ' + node.textContent.substring(0, 30) : '');
            el.appendChild(label);
          }
          parent.appendChild(el);
        }
        if (node.children) {
          node.children.forEach(c => renderNode(c, parent));
        }
      }

      if (d && d.tree) renderNode(d.tree, viewport);

      // Update sidebar tabs
      renderDomTree(d);
      renderNetwork(index);
      renderConsole();
      renderPerformance(index);
    }

    function renderDomTree(snapshot) {
      const panel = document.getElementById('panel-dom');
      if (!snapshot || !snapshot.tree) { panel.innerHTML = '<div class="empty">No DOM data</div>'; return; }
      let html = '';
      function render(node, depth) {
        if (!node || node.type === 'text') return;
        const indent = '  '.repeat(depth);
        html += \`<div class="log-entry" style="padding-left:\${depth*12}px">\${node.tag}\${node.textContent ? ': ' + node.textContent.substring(0, 40) : ''}</div>\`;
        if (node.children) node.children.slice(0, 20).forEach(c => render(c, depth + 1));
      }
      render(snapshot.tree, 0);
      panel.innerHTML = html;
    }

    function renderNetwork(snapIndex) {
      const panel = document.getElementById('panel-network');
      const entries = DATA.network.filter(e => e.completedAt <= timeline[snapIndex].timestamp);
      if (entries.length === 0) { panel.innerHTML = '<div class="empty">No network activity</div>'; return; }
      panel.innerHTML = entries.map(e => {
        const statusClass = e.status < 400 ? 'ok' : 'error';
        return \`<div class="network-entry"><span class="method">\${e.method}</span> <span class="status \${statusClass}">\${e.status || '...'}</span> <span class="url">\${e.url.substring(0, 80)}</span></div>\`;
      }).join('');
    }

    function renderConsole() {
      const panel = document.getElementById('panel-console');
      const all = [...DATA.console, ...DATA.errors.map(e => ({...e, type: 'error'}))].sort((a,b) => a.timestamp - b.timestamp);
      if (all.length === 0) { panel.innerHTML = '<div class="empty">No console output</div>'; return; }
      panel.innerHTML = all.map(e => \`<div class="log-entry \${e.type}">[\${e.type}] \${e.text.substring(0, 120)}</div>\`).join('');
    }

    function renderPerformance(snapIndex) {
      const panel = document.getElementById('panel-perf');
      if (DATA.performance.length === 0) { panel.innerHTML = '<div class="empty">No performance data</div>'; return; }
      const perf = DATA.performance[Math.min(snapIndex, DATA.performance.length - 1)];
      if (!perf) { panel.innerHTML = '<div class="empty">No perf data for this frame</div>'; return; }
      let html = '';
      if (perf.navigation && perf.navigation[0]) {
        const nav = perf.navigation[0];
        html += \`<div class="perf-metric"><span class="label">DOM Interactive</span><span class="value">\${nav.domInteractive}ms</span></div>\`;
        html += \`<div class="perf-metric"><span class="label">DOM Content Loaded</span><span class="value">\${nav.domContentLoaded}ms</span></div>\`;
        html += \`<div class="perf-metric"><span class="label">Load Complete</span><span class="value">\${nav.loadComplete}ms</span></div>\`;
      }
      if (perf.paint) {
        perf.paint.forEach(p => {
          html += \`<div class="perf-metric"><span class="label">\${p.name}</span><span class="value">\${p.startTime}ms</span></div>\`;
        });
      }
      if (perf.resources) {
        html += \`<div class="perf-metric"><span class="label">Resources Loaded</span><span class="value">\${perf.resources.length}</span></div>\`;
        const totalTransfer = perf.resources.reduce((s, r) => s + (r.transferSize || 0), 0);
        html += \`<div class="perf-metric"><span class="label">Total Transfer</span><span class="value">\${(totalTransfer / 1024).toFixed(1)} KB</span></div>\`;
      }
      panel.innerHTML = html;
    }

    // Controls
    document.getElementById('btn-first').onclick = () => renderSnapshot(0);
    document.getElementById('btn-prev').onclick = () => renderSnapshot(Math.max(0, currentIndex - 1));
    document.getElementById('btn-next').onclick = () => renderSnapshot(Math.min(timeline.length - 1, currentIndex + 1));
    document.getElementById('btn-last').onclick = () => renderSnapshot(timeline.length - 1);
    slider.oninput = (e) => renderSnapshot(parseInt(e.target.value));
    document.getElementById('btn-play').onclick = function() {
      playing = !playing;
      this.textContent = playing ? '⏸ Pause' : '▶ Play';
      this.classList.toggle('active', playing);
      if (playing) {
        playInterval = setInterval(() => {
          if (currentIndex >= timeline.length - 1) { playing = false; this.textContent = '▶ Play'; this.classList.remove('active'); clearInterval(playInterval); return; }
          renderSnapshot(currentIndex + 1);
        }, ${traceData.metadata.duration > 0 ? Math.max(100, Math.round(traceData.metadata.duration / traceData.timeline.length)) : 500});
      } else {
        clearInterval(playInterval);
      }
    };

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      };
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') renderSnapshot(Math.max(0, currentIndex - 1));
      if (e.key === 'ArrowRight') renderSnapshot(Math.min(timeline.length - 1, currentIndex + 1));
      if (e.key === ' ') { e.preventDefault(); document.getElementById('btn-play').click(); }
    });

    // Initial render
    renderSnapshot(0);
  </script>
</body>
</html>`;

    if (outputPath) {
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      fs.writeFileSync(outputPath, html);
      console.log(`[Replay] Viewer generated: ${outputPath}`);
    }
    return html;
  }
}

module.exports = { SessionRecorder, SessionTrace, DOMSerializer, ReplayViewer };
