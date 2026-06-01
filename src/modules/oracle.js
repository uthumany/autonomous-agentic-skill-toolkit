/**
 * AI-Powered Test Oracle & Assertion Generator
 *
 * During an exploratory crawl, records DOM mutations, API response schemas,
 * and user interaction sequences. A heuristic engine infers invariant
 * properties and auto-generates test assertions in the toolkit's native format.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Records DOM mutations, API schemas, and interaction sequences during exploration
 */
class InteractionRecorder {
  constructor() {
    this.domMutations = [];
    this.apiResponses = [];
    this.interactions = [];
    this.pageStates = [];
    this.consoleErrors = [];
  }

  /**
   * Inject recording hooks into a Playwright page
   */
  async injectRecordingHooks(page) {
    // Record DOM mutations
    await page.evaluate(() => {
      window.__aast_mutations = [];
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          window.__aast_mutations.push({
            type: m.type,
            target: m.target.tagName + (m.target.id ? '#' + m.target.id : '') + (m.target.className ? '.' + String(m.target.className).split(' ')[0] : ''),
            attributeName: m.attributeName,
            addedNodes: m.addedNodes.length,
            removedNodes: m.removedNodes.length,
            timestamp: Date.now(),
          });
        });
      });
      observer.observe(document.body, { childList: true, attributes: true, subtree: true, characterData: true });
    });

    // Record network requests/responses
    const apiResponses = [];
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';

      let body = null;
      if (contentType.includes('json')) {
        try {
          body = await response.json();
        } catch (e) {
          // Ignore non-JSON responses
        }
      }

      apiResponses.push({
        url,
        method: response.request().method(),
        status,
        contentType,
        body: body ? this._summarizeSchema(body) : null,
        timestamp: Date.now(),
      });
    });
    this.apiResponses = apiResponses;

    // Record console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push({
          text: msg.text(),
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Capture the current page state
   */
  async capturePageState(page) {
    const state = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map((f) => ({
        action: f.action,
        method: f.method,
        fields: Array.from(f.elements).map((e) => ({
          type: e.type,
          name: e.name,
          required: e.required,
          tagName: e.tagName,
        })),
      }));

      const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 50).map((a) => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 50),
      }));

      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map((h) => ({
        level: h.tagName,
        text: h.textContent.trim().substring(0, 100),
      }));

      const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]')).map((b) => ({
        text: b.textContent?.trim().substring(0, 50) || b.value || '',
        type: b.type,
        disabled: b.disabled,
      }));

      const images = Array.from(document.querySelectorAll('img')).map((img) => ({
        src: img.src,
        alt: img.alt,
        hasAlt: img.hasAttribute('alt'),
        loaded: img.complete && img.naturalWidth > 0,
      }));

      const tables = document.querySelectorAll('table').length;
      const iframes = document.querySelectorAll('iframe').length;
      const totalElements = document.querySelectorAll('*').length;

      return {
        title: document.title,
        url: window.location.href,
        forms,
        links: links.slice(0, 20),
        headings,
        buttons,
        images: images.slice(0, 20),
        tableCount: tables,
        iframeCount: iframes,
        totalElements,
      };
    });

    state.capturedAt = Date.now();
    this.pageStates.push(state);
    return state;
  }

  /**
   * Simulate interactions (clicks, form fills, scrolls)
   */
  async exploreInteractions(page, maxInteractions = 20) {
    const interactable = await page.$$eval(
      'a[href], button, input, select, [role="button"], [onclick]',
      (elements) =>
        elements.slice(0, maxInteractions).map((el, i) => ({
          index: i,
          tag: el.tagName,
          text: el.textContent?.trim().substring(0, 50) || '',
          type: el.type || '',
          href: el.href || '',
        }))
    );

    for (const item of interactable) {
      try {
        const element = await page.$(`:nth-child(${item.index + 1})`);
        if (element) {
          await element.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(500);

          this.interactions.push({
            type: 'click',
            target: `${item.tag}: ${item.text}`,
            url: page.url(),
            timestamp: Date.now(),
          });

          // Capture state after interaction
          await this.capturePageState(page);
        }
      } catch (e) {
        // Element may not be clickable
      }
    }
  }

  _summarizeSchema(data) {
    if (Array.isArray(data)) {
      return {
        type: 'array',
        length: data.length,
        itemSchema: data.length > 0 ? this._summarizeSchema(data[0]) : null,
      };
    }
    if (data !== null && typeof data === 'object') {
      const schema = {};
      for (const [key, value] of Object.entries(data).slice(0, 20)) {
        schema[key] = typeof value;
      }
      return { type: 'object', keys: schema };
    }
    return { type: typeof data };
  }

  getRecording() {
    return {
      domMutations: this.domMutations,
      apiResponses: this.apiResponses,
      interactions: this.interactions,
      pageStates: this.pageStates,
      consoleErrors: this.consoleErrors,
      summary: {
        totalMutations: this.domMutations.length,
        totalApiCalls: this.apiResponses.length,
        totalInteractions: this.interactions.length,
        totalPages: this.pageStates.length,
        totalErrors: this.consoleErrors.length,
      },
    };
  }
}

/**
 * Heuristic engine that infers invariant properties from recorded interactions
 */
class InvariantInferenceEngine {
  constructor() {
    this.assertions = [];
  }

  /**
   * Analyze recorded data and infer invariants
   */
  infer(recording) {
    this.assertions = [];

    this._inferApiInvariants(recording.apiResponses);
    this._inferFormInvariants(recording.pageStates);
    this._inferNavigationInvariants(recording.interactions, recording.pageStates);
    this._inferErrorInvariants(recording.consoleErrors, recording.apiResponses);
    this._inferAccessibilityInvariants(recording.pageStates);
    this._inferContentInvariants(recording.pageStates);

    return this.assertions;
  }

  _inferApiInvariants(apiResponses) {
    // Group by URL pattern
    const byUrl = {};
    for (const resp of apiResponses) {
      const pattern = resp.url.replace(/\d+/g, ':id').split('?')[0];
      if (!byUrl[pattern]) byUrl[pattern] = [];
      byUrl[pattern].push(resp);
    }

    for (const [pattern, responses] of Object.entries(byUrl)) {
      const statuses = [...new Set(responses.map((r) => r.status))];
      const methods = [...new Set(responses.map((r) => r.method))];

      // Infer: this endpoint always returns specific status codes
      if (statuses.length === 1) {
        this.assertions.push({
          type: 'api-status',
          severity: 'high',
          invariant: `GET ${pattern} always returns ${statuses[0]}`,
          endpoint: pattern,
          expectedStatus: statuses[0],
          confidence: Math.min(0.95, 0.5 + responses.length * 0.1),
          evidenceCount: responses.length,
        });
      }

      // Infer: response has expected schema
      const bodies = responses.filter((r) => r.body);
      if (bodies.length > 0) {
        const firstSchema = bodies[0].body;
        const consistentSchema = bodies.every(
          (b) => JSON.stringify(b.body) === JSON.stringify(firstSchema)
        );

        if (consistentSchema) {
          this.assertions.push({
            type: 'api-schema',
            severity: 'medium',
            invariant: `${pattern} returns consistent schema`,
            endpoint: pattern,
            expectedSchema: firstSchema,
            confidence: Math.min(0.9, 0.4 + bodies.length * 0.1),
            evidenceCount: bodies.length,
          });
        }
      }
    }
  }

  _inferFormInvariants(pageStates) {
    const formPatterns = {};
    for (const state of pageStates) {
      for (const form of state.forms) {
        const key = `${form.method || 'GET'}:${form.action}`;
        if (!formPatterns[key]) formPatterns[key] = [];
        formPatterns[key].push(form.fields);
      }
    }

    for (const [key, fieldSets] of Object.entries(formPatterns)) {
      const [method, action] = key.split(':');
      const requiredFields = fieldSets[0].filter((f) => f.required).map((f) => f.name || f.type);

      if (requiredFields.length > 0) {
        this.assertions.push({
          type: 'form-required',
          severity: 'high',
          invariant: `Form at ${action} requires fields: ${requiredFields.join(', ')}`,
          action,
          method,
          requiredFields,
          confidence: 0.85,
          evidenceCount: fieldSets.length,
        });
      }
    }
  }

  _inferNavigationInvariants(interactions, pageStates) {
    const clickTargets = interactions.filter((i) => i.type === 'click');
    const successfulNavigations = clickTargets.filter((i) => {
      // If we captured a state after the click, it navigated
      return true; // Simplified
    });

    // Infer: page has expected structure
    for (const state of pageStates) {
      if (state.headings.length > 0) {
        this.assertions.push({
          type: 'page-structure',
          severity: 'low',
          invariant: `Page "${state.title}" has ${state.headings.length} heading(s)`,
          url: state.url,
          expectedHeadings: state.headings.map((h) => `${h.level}: ${h.text}`),
          confidence: 0.7,
          evidenceCount: 1,
        });
      }

      // Infer: buttons are not all disabled
      const enabledButtons = state.buttons.filter((b) => !b.disabled);
      if (state.buttons.length > 0 && enabledButtons.length === 0) {
        this.assertions.push({
          type: 'ui-state',
          severity: 'medium',
          invariant: `Page "${state.title}" has no enabled buttons — may indicate broken state`,
          url: state.url,
          confidence: 0.6,
          evidenceCount: 1,
        });
      }
    }
  }

  _inferErrorInvariants(consoleErrors, apiResponses) {
    // Infer: certain API calls should not error
    const errorProne = apiResponses.filter((r) => r.status >= 400);
    for (const resp of errorProne) {
      this.assertions.push({
        type: 'api-error',
        severity: 'high',
        invariant: `${resp.method} ${resp.url} returned error status ${resp.status}`,
        endpoint: resp.url,
        expectedStatus: `< ${resp.status}`,
        confidence: 0.9,
        evidenceCount: 1,
      });
    }

    if (consoleErrors.length > 0) {
      const uniqueErrors = [...new Set(consoleErrors.map((e) => e.text.substring(0, 100)))];
      for (const errorText of uniqueErrors) {
        this.assertions.push({
          type: 'console-error',
          severity: 'medium',
          invariant: `Console error detected: "${errorText}"`,
          confidence: 0.8,
          evidenceCount: consoleErrors.filter((e) => e.text.startsWith(errorText.substring(0, 30))).length,
        });
      }
    }
  }

  _inferAccessibilityInvariants(pageStates) {
    for (const state of pageStates) {
      // Images without alt text
      const missingAlt = state.images.filter((img) => !img.hasAlt);
      if (missingAlt.length > 0) {
        this.assertions.push({
          type: 'accessibility',
          severity: 'medium',
          invariant: `${missingAlt.length} image(s) missing alt text on ${state.url}`,
          url: state.url,
          confidence: 0.95,
          evidenceCount: missingAlt.length,
        });
      }

      // Missing main heading
      const hasH1 = state.headings.some((h) => h.level === 'H1');
      if (!hasH1 && state.totalElements > 20) {
        this.assertions.push({
          type: 'accessibility',
          severity: 'low',
          invariant: `Page "${state.title}" missing H1 heading`,
          url: state.url,
          confidence: 0.8,
          evidenceCount: 1,
        });
      }
    }
  }

  _inferContentInvariants(pageStates) {
    for (const state of pageStates) {
      if (state.totalElements < 5) {
        this.assertions.push({
          type: 'content',
          severity: 'high',
          invariant: `Page "${state.title}" has very few elements (${state.totalElements}) — may be blank or broken`,
          url: state.url,
          confidence: 0.85,
          evidenceCount: 1,
        });
      }

      if (state.images.length > 0) {
        const brokenImages = state.images.filter((img) => !img.loaded);
        if (brokenImages.length > 0) {
          this.assertions.push({
            type: 'content',
            severity: 'medium',
            invariant: `${brokenImages.length} broken image(s) on ${state.url}`,
            url: state.url,
            confidence: 0.9,
            evidenceCount: brokenImages.length,
          });
        }
      }
    }
  }
}

/**
 * Test script generator — converts inferred assertions into executable tests
 */
class AssertionGenerator {
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || './aast-generated-assertions',
      minConfidence: config.minConfidence || 0.5,
      ...config,
    };
  }

  /**
   * Generate test scripts from assertions
   */
  generateTestScript(assertions, url) {
    const filtered = assertions.filter((a) => a.confidence >= this.config.minConfidence);

    const script = {
      url,
      generatedAt: new Date().toISOString(),
      assertions: filtered,
      testCode: this._toTestCode(filtered, url),
      stats: {
        total: filtered.length,
        byType: {},
        avgConfidence: filtered.length > 0
          ? filtered.reduce((sum, a) => sum + a.confidence, 0) / filtered.length
          : 0,
      },
    };

    // Count by type
    for (const a of filtered) {
      script.stats.byType[a.type] = (script.stats.byType[a.type] || 0) + 1;
    }

    return script;
  }

  _toTestCode(assertions, url) {
    const lines = [
      `// Auto-generated assertions for ${url}`,
      `// Generated at ${new Date().toISOString()}`,
      `// Confidence threshold: ${this.config.minConfidence}`,
      '',
      'const { chromium } = require("playwright");',
      '',
      `describe("Auto-generated tests for ${url}", () => {`,
      `  let browser, page;`,
      '',
      `  beforeAll(async () => {`,
      `    browser = await chromium.launch({ headless: true });`,
      `    const context = await browser.newPage();`,
      `    page = await context.newPage();`,
      `    await page.goto("${url}", { waitUntil: "networkidle" });`,
      `  });`,
      '',
      `  afterAll(async () => { await browser.close(); });`,
      '',
    ];

    for (const assertion of assertions) {
      lines.push(`  test("${assertion.invariant.replace(/"/g, '\\"')}", async () => {`);
      lines.push(`    // Type: ${assertion.type} | Confidence: ${assertion.confidence}`);

      switch (assertion.type) {
        case 'api-status':
          lines.push(`    const response = await page.goto("${assertion.endpoint}");`);
          lines.push(`    expect(response.status()).toBe(${assertion.expectedStatus});`);
          break;
        case 'api-schema':
          lines.push(`    const response = await page.goto("${assertion.endpoint}");`);
          lines.push(`    const data = await response.json();`);
          lines.push(`    expect(typeof data).toBe("object");`);
          break;
        case 'page-structure':
          for (const heading of assertion.expectedHeadings || []) {
            lines.push(`    await expect(page.locator("${heading.split(':')[0].toLowerCase()}")).toBeVisible();`);
          }
          break;
        case 'accessibility':
          if (assertion.invariant.includes('alt text')) {
            lines.push(`    const images = await page.$$("img:not([alt])");`);
            lines.push(`    expect(images.length).toBe(0);`);
          }
          break;
        case 'console-error':
          lines.push(`    const errors = [];`);
          lines.push(`    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });`);
          lines.push(`    await page.reload();`);
          lines.push(`    expect(errors.length).toBe(0);`);
          break;
        case 'content':
          lines.push(`    const elementCount = await page.$$eval("*", els => els.length);`);
          lines.push(`    expect(elementCount).toBeGreaterThan(5);`);
          break;
        default:
          lines.push(`    // TODO: Implement test for ${assertion.type}`);
      }

      lines.push(`  });`);
      lines.push('');
    }

    lines.push('});');
    return lines.join('\n');
  }

  /**
   * Save generated assertions to disk
   */
  save(assertions, url) {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const script = this.generateTestScript(assertions, url);
    const slug = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);

    const jsonPath = path.join(this.config.outputDir, `${slug}_assertions.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(script, null, 2));

    const testPath = path.join(this.config.outputDir, `${slug}_test.js`);
    fs.writeFileSync(testPath, script.testCode);

    console.log(`[Oracle] Saved ${assertions.length} assertions to ${jsonPath}`);
    console.log(`[Oracle] Generated test script: ${testPath}`);
    return { jsonPath, testPath };
  }
}

/**
 * Main orchestrator — crawls a URL and generates assertions
 */
class TestOracle {
  constructor(config = {}) {
    this.config = config;
    this.recorder = new InteractionRecorder();
    this.inferenceEngine = new InvariantInferenceEngine();
    this.generator = new AssertionGenerator(config);
  }

  /**
   * Explore a URL and generate test assertions
   */
  async explore(url, options = {}) {
    console.log(`\n[Oracle] Exploring ${url}...`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Inject recording hooks
    await this.recorder.injectRecordingHooks(page);

    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await this.recorder.capturePageState(page);

    // Explore interactions
    const maxInteractions = options.maxInteractions || 20;
    await this.recorder.exploreInteractions(page, maxInteractions);

    // Capture DOM mutations
    const mutations = await page.evaluate(() => window.__aast_mutations || []);
    this.recorder.domMutations = mutations;

    await browser.close();

    // Get full recording
    const recording = this.recorder.getRecording();
    console.log(`[Oracle] Recording complete: ${recording.summary.totalMutations} mutations, ${recording.summary.totalApiCalls} API calls`);

    // Infer invariants
    const assertions = this.inferenceEngine.infer(recording);
    console.log(`[Oracle] Inferred ${assertions.length} assertions`);

    // Generate test script
    if (options.save !== false) {
      this.generator.save(assertions, url);
    }

    return { recording, assertions };
  }
}

module.exports = { TestOracle, InteractionRecorder, InvariantInferenceEngine, AssertionGenerator };
