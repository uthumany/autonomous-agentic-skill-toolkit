/**
 * Tests for Cross-Platform Session Replay with DOM State Serialization
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { SessionTrace, ReplayViewer } = require('../src/modules/session_replay');
const fs = require('fs');
const path = require('path');

describe('SessionTrace', () => {
  const testDir = './test-trace-output';

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should initialize with URL and generate unique ID', () => {
    const trace = new SessionTrace('https://example.com');
    assert.equal(trace.url, 'https://example.com');
    assert.ok(trace.id.startsWith('trace_'));
    assert.ok(trace.timeline.length === 0);
  });

  it('should add snapshots to timeline', () => {
    const trace = new SessionTrace('https://example.com');
    trace.addSnapshot({ title: 'Page 1', url: 'https://example.com', tree: {} });
    trace.addSnapshot({ title: 'Page 2', url: 'https://example.com/page2', tree: {} });
    assert.equal(trace.timeline.length, 2);
    assert.equal(trace.timeline[0].type, 'dom-snapshot');
    assert.equal(trace.timeline[0].index, 0);
  });

  it('should add network entries', () => {
    const trace = new SessionTrace('https://example.com');
    trace.addNetworkEntry({ method: 'GET', url: 'https://example.com/api', status: 200 });
    assert.equal(trace.networkEntries.length, 1);
  });

  it('should categorize console entries', () => {
    const trace = new SessionTrace('https://example.com');
    trace.addConsoleEntry({ type: 'log', text: 'Hello' });
    trace.addConsoleEntry({ type: 'error', text: 'Something broke' });
    assert.equal(trace.consoleLogs.length, 1);
    assert.equal(trace.consoleErrors.length, 1);
  });

  it('should add performance snapshots', () => {
    const trace = new SessionTrace('https://example.com');
    trace.addPerformanceSnapshot({ navigation: [{ domContentLoaded: 500 }], paint: [], resources: [] });
    assert.equal(trace.performanceMetrics.length, 1);
  });

  it('should package into correct format', () => {
    const trace = new SessionTrace('https://example.com');
    trace.addSnapshot({ title: 'Test', tree: {} });
    trace.addNetworkEntry({ method: 'GET', url: 'https://example.com', status: 200 });

    const payload = trace.package();
    assert.equal(payload.version, '1.0.0');
    assert.equal(payload.format, 'aastreplay');
    assert.equal(payload.metadata.totalSnapshots, 1);
    assert.equal(payload.metadata.totalNetworkEntries, 1);
    assert.equal(payload.metadata.url, 'https://example.com');
  });

  it('should serialize to compressed buffer', () => {
    const trace = new SessionTrace('https://example.com');
    trace.addSnapshot({ title: 'Test', tree: { tag: 'html' } });

    const buffer = trace.serialize();
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
  });

  it('should save and load .aastreplay file', () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const trace = new SessionTrace('https://example.com');
    trace.addSnapshot({ title: 'Page 1', tree: { tag: 'html' } });
    trace.addNetworkEntry({ method: 'GET', url: 'https://example.com/api', status: 200 });

    const outputPath = path.join(testDir, 'test-trace.aastreplay');
    trace.save(outputPath);
    assert.ok(fs.existsSync(outputPath));

    const loaded = SessionTrace.load(outputPath);
    assert.equal(loaded.format, 'aastreplay');
    assert.equal(loaded.timeline.length, 1);
    assert.equal(loaded.network.length, 1);
    assert.equal(loaded.metadata.url, 'https://example.com');
  });
});

describe('ReplayViewer', () => {
  const testDir = './test-replay-output';

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should generate valid HTML viewer', () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    const traceData = {
      version: '1.0.0',
      format: 'aastreplay',
      metadata: {
        url: 'https://example.com',
        createdAt: new Date().toISOString(),
        totalSnapshots: 1,
        duration: 5000,
        viewport: { width: 1280, height: 720 },
      },
      timeline: [
        {
          index: 0,
          type: 'dom-snapshot',
          timestamp: Date.now(),
          data: {
            title: 'Example',
            url: 'https://example.com',
            viewport: { width: 1280, height: 720 },
            tree: { tag: 'html', bounds: { top: 0, left: 0, width: 1280, height: 720 }, children: [] },
          },
        },
      ],
      network: [
        { method: 'GET', url: 'https://example.com', status: 200, durationMs: 100, completedAt: Date.now() },
      ],
      console: [{ type: 'log', text: 'Page loaded', timestamp: Date.now() }],
      errors: [],
      performance: [{
        navigation: [{ domContentLoaded: 500, loadComplete: 1000, domInteractive: 300, responseStart: 100, responseEnd: 200 }],
        paint: [{ name: 'first-contentful-paint', startTime: 300 }],
        resources: [],
      }],
    };

    const outputPath = path.join(testDir, 'viewer.html');
    const html = ReplayViewer.generateViewerHTML(traceData, outputPath);

    assert.ok(fs.existsSync(outputPath));
    assert.ok(html.includes('AAST Replay Viewer'));
    assert.ok(html.includes('example.com'));
    assert.ok(html.includes('data-tab'));
    assert.ok(html.includes('function renderSnapshot'));

    // Verify HTML is parseable
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('</html>'));
  });
});
