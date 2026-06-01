/**
 * Tests for AI-Powered Test Oracle & Assertion Generator
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { TestOracle, InteractionRecorder, InvariantInferenceEngine, AssertionGenerator } = require('../src/modules/oracle');
const fs = require('fs');

describe('InteractionRecorder', () => {
  it('should initialize with empty data', () => {
    const recorder = new InteractionRecorder();
    const recording = recorder.getRecording();
    assert.equal(recording.summary.totalMutations, 0);
    assert.equal(recording.summary.totalApiCalls, 0);
    assert.equal(recording.summary.totalInteractions, 0);
  });

  it('should capture page state data', () => {
    const recorder = new InteractionRecorder();
    // Manually push test state
    recorder.pageStates.push({
      title: 'Test Page',
      url: 'https://example.com',
      forms: [{ action: '/submit', method: 'POST', fields: [{ type: 'text', name: 'email', required: true }] }],
      links: [{ href: 'https://example.com/about', text: 'About' }],
      headings: [{ level: 'H1', text: 'Welcome' }],
      buttons: [{ text: 'Submit', type: 'submit', disabled: false }],
      images: [{ src: '/logo.png', alt: 'Logo', hasAlt: true, loaded: true }],
      tableCount: 0,
      iframeCount: 0,
      totalElements: 50,
    });
    const recording = recorder.getRecording();
    assert.equal(recording.summary.totalPages, 1);
  });
});

describe('InvariantInferenceEngine', () => {
  let engine;

  before(() => {
    engine = new InvariantInferenceEngine();
  });

  it('should infer API status invariants', () => {
    const recording = {
      apiResponses: [
        { url: 'https://api.example.com/users', method: 'GET', status: 200, body: { type: 'object', keys: { name: 'string' } } },
        { url: 'https://api.example.com/users', method: 'GET', status: 200, body: { type: 'object', keys: { name: 'string' } } },
      ],
      pageStates: [],
      interactions: [],
      consoleErrors: [],
    };

    const assertions = engine.infer(recording);
    const apiAssertions = assertions.filter((a) => a.type === 'api-status');
    assert.ok(apiAssertions.length > 0);
    assert.ok(apiAssertions[0].invariant.includes('200'));
  });

  it('should infer API schema invariants', () => {
    const recording = {
      apiResponses: [
        { url: 'https://api.example.com/data', method: 'GET', status: 200, body: { type: 'object', keys: { id: 'number', name: 'string' } } },
        { url: 'https://api.example.com/data', method: 'GET', status: 200, body: { type: 'object', keys: { id: 'number', name: 'string' } } },
      ],
      pageStates: [],
      interactions: [],
      consoleErrors: [],
    };

    const assertions = engine.infer(recording);
    const schemaAssertions = assertions.filter((a) => a.type === 'api-schema');
    assert.ok(schemaAssertions.length > 0);
  });

  it('should infer form invariants', () => {
    const recording = {
      apiResponses: [],
      pageStates: [
        {
          title: 'Form Page',
          url: 'https://example.com/form',
          forms: [
            { action: '/submit', method: 'POST', fields: [
              { type: 'email', name: 'email', required: true },
              { type: 'text', name: 'name', required: true },
              { type: 'checkbox', name: 'agree', required: false },
            ]},
          ],
          links: [],
          headings: [],
          buttons: [],
          images: [],
          tableCount: 0,
          iframeCount: 0,
          totalElements: 20,
        },
      ],
      interactions: [],
      consoleErrors: [],
    };

    const assertions = engine.infer(recording);
    const formAssertions = assertions.filter((a) => a.type === 'form-required');
    assert.ok(formAssertions.length > 0);
    assert.ok(formAssertions[0].requiredFields.includes('email'));
    assert.ok(formAssertions[0].requiredFields.includes('name'));
  });

  it('should infer page structure invariants', () => {
    const recording = {
      apiResponses: [],
      pageStates: [
        {
          title: 'Home',
          url: 'https://example.com',
          forms: [],
          links: [],
          headings: [{ level: 'H1', text: 'Welcome' }, { level: 'H2', text: 'About' }],
          buttons: [],
          images: [],
          tableCount: 0,
          iframeCount: 0,
          totalElements: 50,
        },
      ],
      interactions: [],
      consoleErrors: [],
    };

    const assertions = engine.infer(recording);
    const structureAssertions = assertions.filter((a) => a.type === 'page-structure');
    assert.ok(structureAssertions.length > 0);
    assert.ok(structureAssertions[0].invariant.includes('2 heading'));
  });

  it('should infer accessibility invariants', () => {
    const recording = {
      apiResponses: [],
      pageStates: [
        {
          title: 'Page',
          url: 'https://example.com',
          forms: [],
          links: [],
          headings: [],
          buttons: [],
          images: [
            { src: '/img1.png', alt: '', hasAlt: false, loaded: true },
            { src: '/img2.png', alt: 'Logo', hasAlt: true, loaded: true },
          ],
          tableCount: 0,
          iframeCount: 0,
          totalElements: 30,
        },
      ],
      interactions: [],
      consoleErrors: [],
    };

    const assertions = engine.infer(recording);
    const a11yAssertions = assertions.filter((a) => a.type === 'accessibility');
    assert.ok(a11yAssertions.length > 0);
    assert.ok(a11yAssertions.some((a) => a.invariant.includes('alt text')));
  });

  it('should infer error invariants from console errors', () => {
    const recording = {
      apiResponses: [
        { url: 'https://api.example.com/fail', method: 'GET', status: 500 },
      ],
      pageStates: [],
      interactions: [],
      consoleErrors: [
        { text: 'Uncaught TypeError: undefined is not a function', timestamp: Date.now() },
      ],
    };

    const assertions = engine.infer(recording);
    assert.ok(assertions.some((a) => a.type === 'api-error'));
    assert.ok(assertions.some((a) => a.type === 'console-error'));
  });
});

describe('AssertionGenerator', () => {
  const testDir = './test-oracle-output';

  after(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should generate test scripts from assertions', () => {
    const generator = new AssertionGenerator({ outputDir: testDir });
    const assertions = [
      { type: 'api-status', severity: 'high', invariant: 'GET /api/users returns 200', endpoint: '/api/users', expectedStatus: 200, confidence: 0.9 },
      { type: 'page-structure', severity: 'low', invariant: 'Page has H1 heading', url: 'https://example.com', expectedHeadings: ['H1: Welcome'], confidence: 0.7 },
      { type: 'accessibility', severity: 'medium', invariant: 'No images missing alt text', url: 'https://example.com', confidence: 0.95 },
    ];

    const script = generator.generateTestScript(assertions, 'https://example.com');
    assert.equal(script.assertions.length, 3);
    assert.ok(script.testCode.includes('describe'));
    assert.ok(script.testCode.includes('test('));
    assert.ok(script.stats.avgConfidence > 0);
    assert.equal(script.stats.byType['api-status'], 1);
  });

  it('should filter by confidence threshold', () => {
    const generator = new AssertionGenerator({ outputDir: testDir, minConfidence: 0.8 });
    const assertions = [
      { type: 'api-status', severity: 'high', invariant: 'test', confidence: 0.9 },
      { type: 'page-structure', severity: 'low', invariant: 'test2', confidence: 0.3 },
    ];

    const script = generator.generateTestScript(assertions, 'https://example.com');
    assert.equal(script.assertions.length, 1); // Only high-confidence passes
  });

  it('should save to disk', () => {
    const generator = new AssertionGenerator({ outputDir: testDir });
    const assertions = [
      { type: 'api-status', severity: 'high', invariant: 'GET /api works', endpoint: '/api', expectedStatus: 200, confidence: 0.9 },
    ];

    const result = generator.save(assertions, 'https://example.com');
    assert.ok(fs.existsSync(result.jsonPath));
    assert.ok(fs.existsSync(result.testPath));
  });
});
