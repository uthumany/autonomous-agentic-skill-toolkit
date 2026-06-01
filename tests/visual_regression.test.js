/**
 * Tests for Intelligent Baseline Comparison for Visual Regression
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PerceptualDiff, BaselineStore, VisualRegressionTester } = require('../src/modules/visual_regression');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

// Helper: create a simple PNG buffer
function createTestPNG(width, height, fillColor = [128, 128, 128]) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      png.data[idx] = fillColor[0];
      png.data[idx + 1] = fillColor[1];
      png.data[idx + 2] = fillColor[2];
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

// Helper: create a PNG with variation
function createVariedPNG(width, height, baseColor = [128, 128, 128], varRegion = null) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (varRegion && x >= varRegion.x && x < varRegion.x + varRegion.w && y >= varRegion.y && y < varRegion.y + varRegion.h) {
        png.data[idx] = 255;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
      } else {
        png.data[idx] = baseColor[0];
        png.data[idx + 1] = baseColor[1];
        png.data[idx + 2] = baseColor[2];
      }
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

describe('PerceptualDiff', () => {
  let diff;

  before(() => {
    diff = new PerceptualDiff({ pixelThreshold: 0.1 });
  });

  it('should detect identical images as matching', () => {
    const baseline = createTestPNG(100, 100, [128, 128, 128]);
    const result = diff.compare(baseline, baseline);
    assert.equal(result.match, true);
    assert.equal(result.diffPercentage, 0);
  });

  it('should detect different images as non-matching', () => {
    const baseline = createTestPNG(100, 100, [128, 128, 128]);
    const candidate = createTestPNG(100, 100, [255, 0, 0]);
    const result = diff.compare(baseline, candidate);
    assert.equal(result.match, false);
    assert.ok(result.diffPercentage > 0);
  });

  it('should handle dimension mismatches', () => {
    const small = createTestPNG(50, 50);
    const large = createTestPNG(100, 100);
    const result = diff.compare(small, large);
    assert.equal(result.match, false);
    assert.equal(result.category, 'critical');
    assert.equal(result.reason, 'dimensions-mismatch');
  });

  it('should produce a diff image buffer', () => {
    const baseline = createTestPNG(10, 10, [128, 128, 128]);
    const candidate = createTestPNG(10, 10, [255, 0, 0]);
    const result = diff.compare(baseline, candidate);
    assert.ok(result.diffImageBuffer);
    // Should be valid PNG
    const diffPng = PNG.sync.read(result.diffImageBuffer);
    assert.equal(diffPng.width, 10);
    assert.equal(diffPng.height, 10);
  });

  it('should respect ignore regions', () => {
    const diffWithIgnore = new PerceptualDiff({
      pixelThreshold: 0.1,
      ignoreRegions: [{ x: 0, y: 0, width: 50, height: 50 }],
    });
    const baseline = createTestPNG(100, 100, [128, 128, 128]);
    // Change only in ignored region
    const candidate = createVariedPNG(100, 100, [128, 128, 128], { x: 0, y: 0, w: 50, h: 50 });
    const result = diffWithIgnore.compare(baseline, candidate);
    // Should match because the changed region is ignored
    assert.equal(result.match, true);
  });

  it('should categorize small noise as noise', () => {
    const diffSmallNoise = new PerceptualDiff({ pixelThreshold: 0.15 });
    const baseline = createTestPNG(200, 200, [128, 128, 128]);
    // Tiny variation
    const candidate = createVariedPNG(200, 200, [128, 128, 128], { x: 0, y: 0, w: 2, h: 2 });
    const result = diffSmallNoise.compare(baseline, candidate);
    // With very small diff, should be noise or dynamic
    assert.ok(['noise', 'dynamic'].includes(result.category));
  });

  it('should calculate SSI score', () => {
    const baseline = createTestPNG(50, 50, [128, 128, 128]);
    const result = diff.compare(baseline, baseline);
    assert.ok(result.ssiScore > 0);
  });
});

describe('BaselineStore', () => {
  const testDir = './test-baseline-output';

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should generate consistent keys', () => {
    const key1 = BaselineStore.getKey('https://example.com', { width: 1280, height: 720 });
    const key2 = BaselineStore.getKey('https://example.com', { width: 1280, height: 720 });
    assert.equal(key1, key2);
  });

  it('should generate different keys for different viewports', () => {
    const key1 = BaselineStore.getKey('https://example.com', { width: 1280, height: 720 });
    const key2 = BaselineStore.getKey('https://example.com', { width: 375, height: 667 });
    assert.notEqual(key1, key2);
  });

  it('should store and retrieve baselines', () => {
    const store = new BaselineStore({ baselineDir: testDir });
    const key = 'test-baseline-key';
    const pngBuffer = createTestPNG(10, 10);

    store.store(key, pngBuffer, { url: 'https://example.com' });

    assert.ok(store.has(key));
    const retrieved = store.retrieve(key);
    assert.ok(retrieved);
    assert.ok(Buffer.isBuffer(retrieved.buffer));
    assert.equal(retrieved.metadata.url, 'https://example.com');
  });

  it('should return null for missing baselines', () => {
    const store = new BaselineStore({ baselineDir: testDir });
    assert.equal(store.retrieve('nonexistent'), null);
    assert.equal(store.has('nonexistent'), false);
  });

  it('should list all baselines', () => {
    const store = new BaselineStore({ baselineDir: testDir });
    const key = 'list-test-key';
    store.store(key, createTestPNG(5, 5));
    const list = store.list();
    assert.ok(list.length > 0);
    assert.ok(list.some((b) => b.key === key));
  });
});

describe('VisualRegressionTester', () => {
  const testDir = './test-visual-output';

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    if (fs.existsSync('./test-visual-baselines')) {
      fs.rmSync('./test-visual-baselines', { recursive: true });
    }
  });

  it('should initialize with correct config', () => {
    const tester = new VisualRegressionTester({
      baselineDir: testDir,
      viewports: [{ width: 375, height: 667 }],
    });
    assert.ok(tester.store);
    assert.ok(tester.diffEngine);
  });
});
