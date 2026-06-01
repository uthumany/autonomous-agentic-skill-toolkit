/**
 * Intelligent Baseline Comparison for Visual Regression
 *
 * Establishes baseline screenshot libraries tagged by viewport/device/OS.
 * Captures candidate screenshots and runs them through a perceptual diff
 * pipeline. Categorizes differences into dynamic content, noise, and
 * critical regressions.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

/**
 * Simple pixel-level image diff with structural similarity approximation
 */
class PerceptualDiff {
  constructor(options = {}) {
    this.pixelThreshold = options.pixelThreshold || 0.1; // 10% color difference per pixel
    this.structuralThreshold = options.structuralThreshold || 0.95; // SSIM-like threshold
    this.ignoreRegions = options.ignoreRegions || []; // [{x,y,width,height}]
  }

  /**
   * Compare two PNG buffers, return diff result
   */
  compare(baselineBuffer, candidateBuffer) {
    const baseline = PNG.sync.read(baselineBuffer);
    const candidate = PNG.sync.read(candidateBuffer);

    // Handle size mismatch
    if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
      return {
        match: false,
        category: 'critical',
        reason: 'dimensions-mismatch',
        baselineSize: { width: baseline.width, height: baseline.height },
        candidateSize: { width: candidate.width, height: candidate.height },
        diffPercentage: 100,
      };
    }

    const width = baseline.width;
    const height = baseline.height;
    const totalPixels = width * height;
    const diff = new PNG({ width, height });

    let diffPixels = 0;
    let totalColorDiff = 0;
    const diffRegions = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Skip ignored regions
        if (this._isIgnoredRegion(x, y)) {
          diff.data[idx] = baseline.data[idx];
          diff.data[idx + 1] = baseline.data[idx + 1];
          diff.data[idx + 2] = baseline.data[idx + 2];
          diff.data[idx + 3] = 255;
          continue;
        }

        const rDiff = Math.abs(baseline.data[idx] - candidate.data[idx]);
        const gDiff = Math.abs(baseline.data[idx + 1] - candidate.data[idx + 1]);
        const bDiff = Math.abs(baseline.data[idx + 2] - candidate.data[idx + 2]);

        const pixelDiff = (rDiff + gDiff + bDiff) / (3 * 255);

        if (pixelDiff > this.pixelThreshold) {
          diffPixels++;
          totalColorDiff += pixelDiff;

          // Mark diff pixels in red
          diff.data[idx] = 255;
          diff.data[idx + 1] = 0;
          diff.data[idx + 2] = 0;
          diff.data[idx + 3] = 255;

          // Track diff region
          if (diffRegions.length < 100) {
            diffRegions.push({ x, y, intensity: pixelDiff });
          }
        } else {
          // Gray out non-diff pixels
          const gray = (baseline.data[idx] + baseline.data[idx + 1] + baseline.data[idx + 2]) / 3;
          diff.data[idx] = gray;
          diff.data[idx + 1] = gray;
          diff.data[idx + 2] = gray;
          diff.data[idx + 3] = 128;
        }
      }
    }

    const diffPercentage = (diffPixels / totalPixels) * 100;
    const avgColorDiff = diffPixels > 0 ? totalColorDiff / diffPixels : 0;

    // Compute structural similarity approximation (block-based)
    const ssiScore = this._computeBlockSSI(baseline, candidate, width, height);

    // Generate diff image buffer
    const diffBuffer = PNG.sync.write(diff);

    // Categorize the difference
    const category = this._categorizeDiff(diffPercentage, avgColorDiff, ssiScore, diffRegions, width, height);

    return {
      match: diffPercentage === 0,
      category,
      diffPercentage: Math.round(diffPercentage * 100) / 100,
      avgColorDiff: Math.round(avgColorDiff * 1000) / 1000,
      ssiScore: Math.round(ssiScore * 10000) / 10000,
      diffPixelCount: diffPixels,
      totalPixels,
      diffRegions: diffRegions.slice(0, 10),
      diffImageBuffer: diffBuffer,
      baselineSize: { width, height },
    };
  }

  _isIgnoredRegion(x, y) {
    return this.ignoreRegions.some(
      (r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height
    );
  }

  _computeBlockSSI(baseline, candidate, width, height) {
    const blockSize = 8;
    let totalBlocks = 0;
    let similarBlocks = 0;

    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        let baselineVariance = 0;
        let candidateVariance = 0;
        let crossVariance = 0;
        let baselineSum = 0;
        let candidateSum = 0;
        let count = 0;

        for (let dy = 0; dy < blockSize && by + dy < height; dy++) {
          for (let dx = 0; dx < blockSize && bx + dx < width; dx++) {
            const idx = ((by + dy) * width + (bx + dx)) * 4;
            const bGray = (baseline.data[idx] + baseline.data[idx + 1] + baseline.data[idx + 2]) / 3;
            const cGray = (candidate.data[idx] + candidate.data[idx + 1] + candidate.data[idx + 2]) / 3;
            baselineSum += bGray;
            candidateSum += cGray;
            count++;
          }
        }

        const bMean = baselineSum / count;
        const cMean = candidateSum / count;

        for (let dy = 0; dy < blockSize && by + dy < height; dy++) {
          for (let dx = 0; dx < blockSize && bx + dx < width; dx++) {
            const idx = ((by + dy) * width + (bx + dx)) * 4;
            const bGray = (baseline.data[idx] + baseline.data[idx + 1] + baseline.data[idx + 2]) / 3;
            const cGray = (candidate.data[idx] + candidate.data[idx + 1] + candidate.data[idx + 2]) / 3;
            baselineVariance += (bGray - bMean) ** 2;
            candidateVariance += (cGray - cMean) ** 2;
            crossVariance += (bGray - bMean) * (cGray - cMean);
          }
        }

        const c1 = (0.01 * 255) ** 2;
        const c2 = (0.03 * 255) ** 2;
        const ssim =
          ((2 * bMean * cMean + c1) * (2 * crossVariance + c2)) /
          ((bMean ** 2 + cMean ** 2 + c1) * (baselineVariance + candidateVariance + c2));

        totalBlocks++;
        if (ssim > 0.95) similarBlocks++;
      }
    }

    return totalBlocks > 0 ? similarBlocks / totalBlocks : 1;
  }

  _categorizeDiff(diffPercentage, avgColorDiff, ssiScore, diffRegions, width, height) {
    // Critical regression: large structural changes
    if (diffPercentage > 5 && ssiScore < 0.8) return 'critical';
    if (diffPercentage > 15) return 'critical';

    // Acceptable noise: small anti-aliasing shifts
    if (diffPercentage < 0.5 && avgColorDiff < 0.05) return 'noise';
    if (diffPercentage < 1 && ssiScore > 0.98) return 'noise';

    // Expected dynamic content: medium diffs in known areas (dates, ads, etc.)
    if (diffPercentage < 5) return 'dynamic';

    // Everything else is a potential regression
    return 'critical';
  }
}

/**
 * Baseline screenshot library manager
 */
class BaselineStore {
  constructor(config = {}) {
    this.baselineDir = config.baselineDir || './aast-visual-baselines';
    this.manifestPath = path.join(this.baselineDir, 'manifest.json');
    this.manifest = this._loadManifest();
  }

  _loadManifest() {
    if (fs.existsSync(this.manifestPath)) {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
    }
    return { baselines: {}, created: new Date().toISOString() };
  }

  _saveManifest() {
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true });
    }
    fs.writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  /**
   * Generate a key for a baseline screenshot
   */
  static getKey(url, viewport, device, os) {
    const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);
    const viewSlug = `${viewport.width}x${viewport.height}`;
    const deviceSlug = (device || 'default').replace(/\s/g, '_');
    const osSlug = (os || 'unknown').replace(/\s/g, '_');
    return `${urlSlug}__${viewSlug}__${deviceSlug}__${osSlug}`;
  }

  /**
   * Store a baseline screenshot
   */
  store(key, pngBuffer, metadata = {}) {
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true });
    }

    const filename = `${key}.png`;
    const filePath = path.join(this.baselineDir, filename);
    fs.writeFileSync(filePath, pngBuffer);

    this.manifest.baselines[key] = {
      filename,
      timestamp: new Date().toISOString(),
      size: pngBuffer.length,
      metadata,
    };
    this._saveManifest();

    return filePath;
  }

  /**
   * Retrieve a baseline screenshot
   */
  retrieve(key) {
    const entry = this.manifest.baselines[key];
    if (!entry) return null;

    const filePath = path.join(this.baselineDir, entry.filename);
    if (!fs.existsSync(filePath)) return null;

    return {
      buffer: fs.readFileSync(filePath),
      metadata: entry.metadata,
      timestamp: entry.timestamp,
    };
  }

  /**
   * Check if a baseline exists
   */
  has(key) {
    return !!this.manifest.baselines[key];
  }

  /**
   * List all baselines
   */
  list() {
    return Object.entries(this.manifest.baselines).map(([key, entry]) => ({
      key,
      ...entry,
    }));
  }
}

/**
 * Visual regression test runner
 */
class VisualRegressionTester {
  constructor(config = {}) {
    this.config = {
      baselineDir: config.baselineDir || './aast-visual-baselines',
      outputDir: config.outputDir || './aast-visual-results',
      ignoreRegions: config.ignoreRegions || [],
      pixelThreshold: config.pixelThreshold || 0.1,
      structuralThreshold: config.structuralThreshold || 0.95,
      viewports: config.viewports || [{ width: 1280, height: 720, device: 'Desktop', os: 'unknown' }],
      blockOnCritical: config.blockOnCritical !== false,
      ...config,
    };

    this.store = new BaselineStore({ baselineDir: this.config.baselineDir });
    this.diffEngine = new PerceptualDiff({
      pixelThreshold: this.config.pixelThreshold,
      structuralThreshold: this.config.structuralThreshold,
      ignoreRegions: this.config.ignoreRegions,
    });
  }

  /**
   * Capture screenshots across all configured viewports
   */
  async captureScreenshots(url, options = {}) {
    const screenshots = [];
    const browser = await chromium.launch({ headless: true });

    for (const viewport of this.config.viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for any animations to settle
      if (options.settleTime) {
        await page.waitForTimeout(options.settleTime);
      } else {
        await page.waitForTimeout(500);
      }

      const screenshot = await page.screenshot({ fullPage: options.fullPage || false });
      const key = BaselineStore.getKey(url, viewport, viewport.device, viewport.os);

      screenshots.push({
        key,
        buffer: screenshot,
        viewport,
        url,
        timestamp: new Date().toISOString(),
      });

      await context.close();
    }

    await browser.close();
    return screenshots;
  }

  /**
   * Run visual regression: compare current screenshots against baselines
   */
  async runRegression(url, options = {}) {
    console.log(`\n[Visual Regression] Testing ${url}...`);
    const startTime = Date.now();
    const candidateScreenshots = await this.captureScreenshots(url, options);
    const results = [];

    for (const candidate of candidateScreenshots) {
      const baseline = this.store.retrieve(candidate.key);
      let diffResult;

      if (!baseline || options.updateBaseline) {
        // First run or forced update — establish baseline
        this.store.store(candidate.key, candidate.buffer, {
          url,
          viewport: candidate.viewport,
        });
        results.push({
          key: candidate.key,
          status: options.updateBaseline ? 'baseline-updated' : 'baseline-established',
          url,
          viewport: candidate.viewport,
        });
        console.log(`  [${candidate.key}] Baseline ${options.updateBaseline ? 'updated' : 'established'}`);
      } else {
        // Compare against baseline
        diffResult = this.diffEngine.compare(baseline.buffer, candidate.buffer);
        const result = {
          key: candidate.key,
          url,
          viewport: candidate.viewport,
          ...diffResult,
          baselineTimestamp: baseline.timestamp,
        };
        results.push(result);

        const statusIcon = diffResult.match ? '✓' : diffResult.category === 'noise' ? '~' : diffResult.category === 'dynamic' ? '?' : '✗';
        console.log(
          `  [${statusIcon}] ${candidate.key}: ${diffResult.match ? 'MATCH' : `${diffResult.diffPercentage}% diff (${diffResult.category})`}`
        );

        // Save diff image for regressions
        if (!diffResult.match && diffResult.diffImageBuffer) {
          this._saveDiffImage(candidate.key, diffResult.diffImageBuffer);
        }

        // Block on critical if configured
        if (diffResult.category === 'critical' && this.config.blockOnCritical) {
          console.log(`  [BLOCKING] Critical regression detected at ${candidate.key}`);
        }
      }
    }

    // Save full report
    const report = {
      url,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      viewports: this.config.viewports.length,
      results,
      summary: this._buildSummary(results),
    };

    this._saveReport(report);
    return report;
  }

  _saveDiffImage(key, diffBuffer) {
    const outputDir = path.join(this.config.outputDir, 'diffs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(outputDir, `${key}__diff.png`);
    fs.writeFileSync(filePath, diffBuffer);
    return filePath;
  }

  _saveReport(report) {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    const filePath = path.join(this.config.outputDir, `visual-regression-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    console.log(`[Visual Regression] Report saved to ${filePath}`);
    return filePath;
  }

  _buildSummary(results) {
    const matchCount = results.filter((r) => r.status === 'baseline-established' || r.status === 'baseline-updated' || r.match).length;
    const noiseCount = results.filter((r) => r.category === 'noise').length;
    const dynamicCount = results.filter((r) => r.category === 'dynamic').length;
    const criticalCount = results.filter((r) => r.category === 'critical').length;

    return {
      total: results.length,
      matches: matchCount,
      noise: noiseCount,
      dynamic: dynamicCount,
      critical: criticalCount,
      hasBlockingRegressions: criticalCount > 0 && this.config.blockOnCritical,
    };
  }
}

module.exports = { VisualRegressionTester, PerceptualDiff, BaselineStore };
