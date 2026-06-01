/**
 * Tests for Smart Test Flakiness Detection & Self-Healing
 *
 * Tests the core logic: detection, scoring, healing, and patching.
 * Browser-based tests are skipped to keep the suite fast.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { FlakinessDetector, TestHealer } = require('../src/modules/flakiness');
const fs = require('fs');

describe('FlakinessDetector', () => {
  let detector;

  before(() => {
    detector = new FlakinessDetector({
      iterations: 2,
      flakinessThreshold: 0.5,
      outputDir: './test-flakiness-output',
    });
  });

  after(() => {
    if (fs.existsSync('./test-flakiness-output')) {
      fs.rmSync('./test-flakiness-output', { recursive: true });
    }
  });

  it('should initialize with default config merged', () => {
    const d = new FlakinessDetector();
    assert.equal(d.config.iterations, 5);
    assert.equal(d.config.flakinessThreshold, 0.5);
    assert.ok(Array.isArray(d.config.healingStrategies));
  });

  it('should accept custom config overrides', () => {
    const d = new FlakinessDetector({ iterations: 10, timeout: 5000 });
    assert.equal(d.config.iterations, 10);
    assert.equal(d.config.timeout, 5000);
  });

  it('should save results to disk', async () => {
    // Test the save logic with a mock result
    const mockResult = {
      name: 'mock-test',
      totalIterations: 2,
      passCount: 2,
      failCount: 0,
      passRate: 1.0,
      flakinessScore: 0,
      isFlaky: false,
      timingStats: { avgMs: 100, minMs: 80, maxMs: 120, varianceMs: 200 },
      errorPatterns: {},
      iterations: [],
    };

    const filePath = detector.saveResults(mockResult, 'test-result.json');
    assert.ok(fs.existsSync(filePath));
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(saved.name, 'mock-test');
  });

  it('should generate stabilization patches', () => {
    const mockFlakiness = {
      name: 'test',
      flakinessScore: 0.8,
      timingStats: { avgMs: 500, minMs: 200, maxMs: 1000, varianceMs: 6000 },
      errorPatterns: { 'Element not found: .btn-submit': 2 },
    };

    const mockHealing = {
      strategiesAttempted: 3,
      strategiesSucceeded: 2,
      results: [
        { strategy: 'selector-swap', originalSelector: '.btn-submit', healedSelector: '[data-testid="btn-submit"]', success: true },
        { strategy: 'dynamic-wait', waitType: 'networkidle', success: true },
        { strategy: 'retry-backoff', success: false },
      ],
    };

    const patch = detector.generateStabilizationPatch(mockFlakiness, mockHealing);
    assert.equal(patch.testName, 'test');
    assert.ok(patch.patches.length >= 2);
    assert.ok(patch.summary.includes('stabilization patch'));
  });

  it('should recommend timing patches for high variance', () => {
    const mockFlakiness = {
      name: 'timing-test',
      flakinessScore: 0.3,
      timingStats: { avgMs: 500, minMs: 200, maxMs: 10000, varianceMs: 10000 },
      errorPatterns: {},
    };

    const mockHealing = {
      strategiesAttempted: 1,
      strategiesSucceeded: 0,
      results: [{ strategy: 'dynamic-wait', success: false }],
    };

    const patch = detector.generateStabilizationPatch(mockFlakiness, mockHealing);
    assert.ok(patch.patches.some((p) => p.type === 'timing'));
  });

  it('should say no patches needed for stable test', () => {
    const mockFlakiness = {
      name: 'stable-test',
      flakinessScore: 0,
      timingStats: { avgMs: 100, minMs: 90, maxMs: 110, varianceMs: 50 },
      errorPatterns: {},
    };

    const mockHealing = {
      strategiesAttempted: 0,
      strategiesSucceeded: 0,
      results: [],
    };

    const patch = detector.generateStabilizationPatch(mockFlakiness, mockHealing);
    assert.equal(patch.patches.length, 0);
    assert.ok(patch.summary.includes('No patches needed'));
  });
});

describe('TestHealer', () => {
  it('should initialize with config', () => {
    const healer = new TestHealer({ timeout: 30000 });
    assert.equal(healer.config.timeout, 30000);
  });
});
