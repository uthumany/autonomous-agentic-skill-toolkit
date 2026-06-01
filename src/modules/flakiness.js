/**
 * Smart Test Flakiness Detection & Self-Healing
 *
 * Runs each test case multiple times across identical environments,
 * compares outcomes, timing, and DOM selector resolution paths.
 * Flags flaky tests and auto-applies healing strategies.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  iterations: 5,
  flakinessThreshold: 0.5, // >50% pass rate variance = flaky
  healingStrategies: ['selector-swap', 'dynamic-wait', 'retry-backoff'],
  timeout: 30000,
  outputDir: './aast-flakiness-results',
};

/**
 * Healer: attempts to fix a flaky test by applying strategies in order
 */
class TestHealer {
  constructor(config) {
    this.config = config;
  }

  /**
   * Strategy 1: Switch from CSS selectors to data-testid attributes
   */
  async selectorSwapHealing(page, failingSelector) {
    const dataTestId = failingSelector
      .replace(/\.([\w-]+)/g, '[data-testid="$1"]')
      .replace(/#([\w-]+)/g, '[data-testid="$1"]');

    try {
      const element = await page.$(dataTestId);
      if (element) {
        return {
          strategy: 'selector-swap',
          originalSelector: failingSelector,
          healedSelector: dataTestId,
          success: true,
        };
      }
    } catch (e) {
      // Fall through
    }

    // Try finding by role or text
    const labelMatch = failingSelector.match(/label[.:=](\w+)/i);
    if (labelMatch) {
      const roleSelector = `[role="button"], button:has-text("${labelMatch[1]}"), a:has-text("${labelMatch[1]}")`;
      try {
        const element = await page.$(roleSelector);
        if (element) {
          return {
            strategy: 'selector-swap-role',
            originalSelector: failingSelector,
            healedSelector: roleSelector,
            success: true,
          };
        }
      } catch (e) {
        // Fall through
      }
    }

    return { strategy: 'selector-swap', originalSelector: failingSelector, success: false };
  }

  /**
   * Strategy 2: Inject dynamic wait conditions based on network idle
   */
  async dynamicWaitHealing(page) {
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      return {
        strategy: 'dynamic-wait',
        waitType: 'networkidle',
        success: true,
      };
    } catch (e) {
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
        return {
          strategy: 'dynamic-wait',
          waitType: 'domcontentloaded',
          success: true,
        };
      } catch (e2) {
        return { strategy: 'dynamic-wait', success: false };
      }
    }
  }

  /**
   * Strategy 3: Retry with exponential backoff
   */
  async retryBackoffHealing(testFn, maxRetries = 3) {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      try {
        await testFn();
        return {
          strategy: 'retry-backoff',
          attempts: attempt + 1,
          backoffMs,
          success: true,
        };
      } catch (e) {
        lastError = e;
      }
    }
    return { strategy: 'retry-backoff', success: false, lastError: lastError?.message };
  }
}

/**
 * Core flakiness detection engine
 */
class FlakinessDetector {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.healer = new TestHealer(this.config);
  }

  /**
   * Run a single test action and capture results
   */
  async runSingleIteration(page, testFn, iterationIndex) {
    const startTime = Date.now();
    const selectorResults = [];
    let passed = false;
    let error = null;
    let selectorResolution = [];

    try {
      // Intercept selector resolution
      const origQuerySelector = await page.evaluate(() => {
        const results = [];
        const orig = document.querySelectorAll.bind(document);
        document.querySelectorAll = function (selector) {
          const r = orig(selector);
          results.push({ selector, found: r.length > 0, count: r.length });
          return r;
        };
        return results;
      });

      await testFn(page);
      passed = true;

      // Collect DOM selector resolution paths
      selectorResolution = await page.evaluate(() => {
        return window.__aast_selectorLog || [];
      });
    } catch (e) {
      error = {
        message: e.message,
        name: e.name,
        stack: e.stack,
      };
    }

    const endTime = Date.now();

    return {
      iteration: iterationIndex,
      passed,
      error,
      timing: {
        start: startTime,
        end: endTime,
        durationMs: endTime - startTime,
      },
      selectorResolution,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detect flakiness by running the same test multiple times
   */
  async detectFlakiness(name, testFn, url) {
    console.log(`\n[Flakiness] Testing "${name}" across ${this.config.iterations} iterations...`);
    const iterations = [];
    let browser = null;

    for (let i = 0; i < this.config.iterations; i++) {
      console.log(`  Iteration ${i + 1}/${this.config.iterations}...`);
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      if (url) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
      }

      const result = await this.runSingleIteration(page, testFn, i + 1);
      iterations.push(result);
      await browser.close();
    }

    // Analyze results
    const passCount = iterations.filter((r) => r.passed).length;
    const failCount = iterations.length - passCount;
    const passRate = passCount / iterations.length;
    const timings = iterations.map((r) => r.timing.durationMs);
    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    const timingVariance = timings.reduce((sum, t) => sum + Math.pow(t - avgTiming, 2), 0) / timings.length;

    // Determine flakiness score (0 = stable, 1 = completely flaky)
    let flakinessScore = 0;
    if (failCount > 0 && passCount > 0) {
      flakinessScore = 1 - Math.abs(passRate - 0.5) * 2; // Max flakiness at 50/50
    } else if (failCount === iterations.length) {
      flakinessScore = 0; // Consistently failing = not flaky, just broken
    } else {
      flakinessScore = 0; // Consistently passing = stable
    }

    const isFlaky = flakinessScore > this.config.flakinessThreshold;

    // Identify error patterns
    const errorPatterns = {};
    iterations
      .filter((r) => r.error)
      .forEach((r) => {
        const key = r.error.message.substring(0, 100);
        errorPatterns[key] = (errorPatterns[key] || 0) + 1;
      });

    return {
      name,
      totalIterations: iterations.length,
      passCount,
      failCount,
      passRate,
      flakinessScore,
      isFlaky,
      timingStats: {
        avgMs: Math.round(avgTiming),
        minMs: Math.min(...timings),
        maxMs: Math.max(...timings),
        varianceMs: Math.round(timingVariance),
      },
      errorPatterns,
      iterations,
    };
  }

  /**
   * Apply self-healing to a flaky test
   */
  async selfHeal(name, testFn, url, flakinessResult) {
    console.log(`\n[Healing] Attempting to heal flaky test "${name}"...`);
    const healingResults = [];

    // Try each configured healing strategy
    if (this.config.healingStrategies.includes('dynamic-wait')) {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      if (url) await page.goto(url, { waitUntil: 'domcontentloaded' });

      const waitResult = await this.healer.dynamicWaitHealing(page);
      healingResults.push(waitResult);
      await browser.close();

      if (waitResult.success) {
        console.log(`  [Healed] Applied dynamic-wait (${waitResult.waitType})`);
      }
    }

    if (this.config.healingStrategies.includes('selector-swap')) {
      // Try to find failing selectors from the error patterns
      const failingSelectors = Object.keys(flakinessResult.errorPatterns)
        .map((msg) => {
          const match = msg.match(/selector|element|locator[:\s]+(\S+)/i);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      if (failingSelectors.length > 0) {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        if (url) await page.goto(url, { waitUntil: 'domcontentloaded' });

        for (const selector of failingSelectors) {
          const swapResult = await this.healer.selectorSwapHealing(page, selector);
          healingResults.push(swapResult);
          if (swapResult.success) {
            console.log(`  [Healed] Swapped selector: ${selector} -> ${swapResult.healedSelector}`);
          }
        }
        await browser.close();
      }
    }

    if (this.config.healingStrategies.includes('retry-backoff')) {
      let retryResult = null;
      try {
        retryResult = await this.healer.retryBackoffHealing(async () => {
          const b = await chromium.launch({ headless: true });
          const p = await b.newPage();
          if (url) await p.goto(url, { waitUntil: 'domcontentloaded' });
          await testFn(p);
          await b.close();
        });
      } catch (e) {
        retryResult = { strategy: 'retry-backoff', success: false, lastError: e.message };
      }
      healingResults.push(retryResult);
      if (retryResult.success) {
        console.log(`  [Healed] Retry succeeded after ${retryResult.attempts} attempts`);
      }
    }

    const healedCount = healingResults.filter((r) => r.success).length;
    return {
      testName: name,
      strategiesAttempted: healingResults.length,
      strategiesSucceeded: healedCount,
      results: healingResults,
      recommendation: healedCount > 0
        ? `Apply the successful healing strategies to make test more robust`
        : `Manual intervention required — no automated healing worked`,
    };
  }

  /**
   * Generate stabilization patch recommendations
   */
  generateStabilizationPatch(flakinessResult, healingResult) {
    const patches = [];

    if (healingResult.strategiesSucceeded > 0) {
      healingResult.results
        .filter((r) => r.success)
        .forEach((r) => {
          if (r.strategy === 'selector-swap' || r.strategy === 'selector-swap-role') {
            patches.push({
              type: 'selector',
              before: r.originalSelector,
              after: r.healedSelector,
              reason: 'CSS selector unstable — switched to data-testid',
            });
          }
          if (r.strategy === 'dynamic-wait') {
            patches.push({
              type: 'wait',
              before: 'none',
              after: `await page.waitForLoadState('${r.waitType}')`,
              reason: 'Test needs explicit wait condition',
            });
          }
          if (r.strategy === 'retry-backoff') {
            patches.push({
              type: 'retry',
              before: 'none',
              after: `// Add retry wrapper with ${r.backoffMs}ms initial backoff`,
              reason: `Test needs retry logic (succeeded after ${r.attempts} attempts)`,
            });
          }
        });
    }

    // Timing-based recommendations
    if (flakinessResult.timingStats.varianceMs > 5000) {
      patches.push({
        type: 'timing',
        before: 'implicit wait',
        after: 'explicit waitForSelector / waitForLoadState',
        reason: `High timing variance (${flakinessResult.timingStats.varianceMs}ms) suggests race conditions`,
      });
    }

    return {
      testName: flakinessResult.name,
      flakinessScore: flakinessResult.flakinessScore,
      patches,
      summary: patches.length > 0
        ? `${patches.length} stabilization patch(es) recommended`
        : 'No patches needed — test is stable',
    };
  }

  /**
   * Save results to disk
   */
  saveResults(results, filename) {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    const filePath = path.join(this.config.outputDir, filename || `flakiness-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    console.log(`[Flakiness] Results saved to ${filePath}`);
    return filePath;
  }
}

module.exports = { FlakinessDetector, TestHealer, DEFAULT_CONFIG };
