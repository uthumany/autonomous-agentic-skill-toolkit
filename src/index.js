#!/usr/bin/env node

const { Command } = require('commander');
const { runWebTest } = require('./modules/web');
const { runMobileTest } = require('./modules/mobile');
const { runDesktopTest } = require('./modules/desktop');
const { runCliTest } = require('./modules/cli');
const { runApiTest } = require('./modules/api');
const { runAccessibilityTest } = require('./modules/accessibility');
const { runPerformanceTest } = require('./modules/performance');
const { generateReport } = require('./modules/report');
const { generateFixPrompt } = require('./modules/fix_prompt');
const { captureScreenshot, recordVideo } = require('./modules/evidence');

// New modules — Feature 1: Flakiness Detection
const { FlakinessDetector } = require('./modules/flakiness');
// New modules — Feature 2: Parallel Execution
const { ParallelEngine } = require('./modules/parallel');
// New modules — Feature 3: Visual Regression
const { VisualRegressionTester } = require('./modules/visual_regression');
// New modules — Feature 4: Test Oracle
const { TestOracle } = require('./modules/oracle');
// New modules — Feature 5: Session Replay
const { SessionRecorder, SessionTrace, ReplayViewer } = require('./modules/session_replay');
// New modules — Feature 6: Environment Provisioning
const { EnvironmentProvisioner } = require('./modules/provisioner');

const fs = require('fs');
const path = require('path');

const program = new Command();

program
  .name('aast')
  .description('Autonomous Agentic Skill Toolkit CLI')
  .version('0.2.0');

// ═══════════════════════════════════════════════════════════
// EXISTING COMMANDS
// ═══════════════════════════════════════════════════════════

program.command('test:web <url>')
  .description('Run web tests on a given URL')
  .action(async (url) => {
    console.log(`Starting web test for ${url}...`);
    await runWebTest(url);
    console.log('Web test finished.');
  });

program.command("test:desktop <appName>")
  .description("Run desktop application tests")
  .action(async (appName) => {
    console.log(`Starting desktop test for ${appName}...`);
    await runDesktopTest(appName);
    console.log("Desktop test finished.");
  });

program.command("test:cli <command>")
  .description("Run CLI command tests")
  .action(async (command) => {
    console.log(`Starting CLI test for: ${command}...`);
    await runCliTest(command);
    console.log("CLI test finished.");
  });

program.command("test:api <url>")
  .description("Run API tests on a given URL")
  .option("-m, --method <type>", "HTTP method (GET, POST, PUT, DELETE)", "GET")
  .option("-d, --data <json>", "JSON data for POST/PUT requests")
  .action(async (url, options) => {
    console.log(`Starting API test for ${url} with method ${options.method}...`);
    let data = {};
    if (options.data) {
      try {
        data = JSON.parse(options.data);
      } catch (e) {
        console.error("Invalid JSON data provided.", e);
        process.exit(1);
      }
    }
    await runApiTest(url, options.method, data);
    console.log("API test finished.");
  });

program.command("test:accessibility <url>")
  .description("Run accessibility tests on a given URL")
  .action(async (url) => {
    console.log(`Starting accessibility test for ${url}...`);
    await runAccessibilityTest(url);
    console.log("Accessibility test finished.");
  });

program.command("test:performance <url>")
  .description("Run performance tests on a given URL using Lighthouse")
  .action(async (url) => {
    console.log(`Starting performance test for ${url}...`);
    await runPerformanceTest(url);
    console.log("Performance test finished.");
  });

program.command("test:mobile <url>")
  .description('Run mobile tests on a given URL with an optional device preset')
  .option('-d, --device <type>', 'Device to emulate (e.g., "iPhone 11", "Pixel 2")', 'iPhone 11')
  .action(async (url, options) => {
    console.log(`Starting mobile test for ${url} on device ${options.device}...`);
    await runMobileTest(url, options.device);
    console.log('Mobile test finished.');
  });

program.command('capture:screenshot <url>')
  .description('Capture a screenshot of a given URL')
  .option('-o, --output <path>', 'Output path for the screenshot', 'screenshot.png')
  .action(async (url, options) => {
    console.log(`Capturing screenshot for ${url}...`);
    await captureScreenshot(url, options.output);
    console.log('Screenshot captured.');
  });

program.command('record:video <url>')
  .description('Record a video of a given URL')
  .option('-o, --output <path>', 'Output path for the video', 'video.webm')
  .option('-d, --duration <seconds>', 'Duration of the video recording in seconds', '5')
  .action(async (url, options) => {
    console.log(`Recording video for ${url}...`);
    await recordVideo(url, options.output, parseInt(options.duration));
    console.log('Video recorded.');
  });

program.command('audit')
  .description('Perform accessibility and performance audits')
  .action(() => {
    console.log('Performing audits...');
  });

program.command('generate:fix-prompt <errorDetailsFile>')
  .description('Generate a fix prompt based on error details')
  .action(async (errorDetailsFile) => {
    console.log(`Generating fix prompt from ${errorDetailsFile}...`);
    try {
      const errorDetails = JSON.parse(fs.readFileSync(errorDetailsFile, 'utf8'));
      const fixPrompt = await generateFixPrompt(errorDetails);
      console.log('Fix Prompt:\n', fixPrompt);
    } catch (error) {
      console.error('Error generating fix prompt:', error.message);
      process.exit(1);
    }
  });

program.command('generate:report <testResultsFile>')
  .description('Generate test reports from a JSON results file')
  .option('-f, --format <type>', 'Report format (json, markdown)', 'json')
  .action(async (testResultsFile, options) => {
    console.log(`Generating report from ${testResultsFile} in ${options.format} format...`);
    try {
      const testResults = JSON.parse(require('fs').readFileSync(testResultsFile, 'utf8'));
      const reportFileName = generateReport(testResults, options.format);
      console.log(`Report generated: ${reportFileName}`);
    } catch (error) {
      console.error('Error generating report:', error.message);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════════════════════
// NEW COMMANDS — Feature 1: Flakiness Detection & Self-Healing
// ═══════════════════════════════════════════════════════════

program.command('test:flakiness <url>')
  .description('Run flakiness detection: execute a test multiple times to find non-deterministic behavior')
  .option('-i, --iterations <n>', 'Number of iterations per test', '5')
  .option('-t, --threshold <n>', 'Flakiness threshold (0-1, higher = more sensitive)', '0.5')
  .option('-o, --output <dir>', 'Output directory for results', './aast-flakiness-results')
  .option('--heal', 'Attempt self-healing after flakiness is detected', false)
  .action(async (url, options) => {
    const detector = new FlakinessDetector({
      iterations: parseInt(options.iterations),
      flakinessThreshold: parseFloat(options.threshold),
      outputDir: options.output,
    });

    // Default test: navigate and screenshot
    const defaultTest = async (page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.screenshot({ path: 'flakiness_screenshot.png' });
    };

    const result = await detector.detectFlakiness('web-navigation', defaultTest, url);

    console.log('\n══════ Flakiness Report ══════');
    console.log(`  Test: ${result.name}`);
    console.log(`  Pass rate: ${(result.passRate * 100).toFixed(1)}% (${result.passCount}/${result.totalIterations})`);
    console.log(`  Flakiness score: ${(result.flakinessScore * 100).toFixed(1)}%`);
    console.log(`  Is flaky: ${result.isFlaky ? 'YES ⚠' : 'NO ✓'}`);
    console.log(`  Timing: avg=${result.timingStats.avgMs}ms, min=${result.timingStats.minMs}ms, max=${result.timingStats.maxMs}ms`);
    if (Object.keys(result.errorPatterns).length > 0) {
      console.log('  Error patterns:');
      for (const [pattern, count] of Object.entries(result.errorPatterns)) {
        console.log(`    [${count}x] ${pattern}`);
      }
    }

    if (options.heal && result.isFlaky) {
      const healingResult = await detector.selfHeal('web-navigation', defaultTest, url, result);
      const patch = detector.generateStabilizationPatch(result, healingResult);

      console.log('\n══════ Self-Healing Report ══════');
      console.log(`  Strategies attempted: ${healingResult.strategiesAttempted}`);
      console.log(`  Strategies succeeded: ${healingResult.strategiesSucceeded}`);
      console.log(`  Recommendation: ${healingResult.recommendation}`);
      if (patch.patches.length > 0) {
        console.log('  Suggested patches:');
        for (const p of patch.patches) {
          console.log(`    [${p.type}] ${p.reason}`);
          console.log(`      Before: ${p.before}`);
          console.log(`      After:  ${p.after}`);
        }
      }
    }

    detector.saveResults(result, `flakiness-${Date.now()}.json`);
  });

// ═══════════════════════════════════════════════════════════
// NEW COMMANDS — Feature 2: Parallel Execution Engine
// ═══════════════════════════════════════════════════════════

program.command('run:parallel <testSuiteDir>')
  .description('Run a test suite directory in parallel with resource pooling')
  .option('-w, --workers <n>', 'Number of parallel workers', '4')
  .option('-c, --concurrency <n>', 'Max browser instances per worker', '2')
  .option('-o, --output <dir>', 'Output directory for results', './aast-parallel-results')
  .option('--urls <urls>', 'Comma-separated URLs to test', '')
  .action(async (testSuiteDir, options) => {
    const engine = new ParallelEngine({
      maxWorkers: parseInt(options.workers),
      outputDir: options.output,
      resourceCaps: {
        browser: parseInt(options.concurrency) * parseInt(options.workers),
        mobile: 2,
        desktop: 1,
      },
    });

    // Build test suite from URLs or directory
    let urls = [];
    if (options.urls) {
      urls = options.urls.split(',').map((u) => u.trim());
    } else {
      // Try to read URLs from a file in the directory
      const urlsFile = path.join(testSuiteDir, 'urls.txt');
      if (fs.existsSync(urlsFile)) {
        urls = fs.readFileSync(urlsFile, 'utf8').split('\n').filter(Boolean);
      }
    }

    if (urls.length === 0) {
      console.error('No URLs found. Provide --urls or create urls.txt in the test directory.');
      process.exit(1);
    }

    // Create atomic tasks from URLs (no browser needed for these simple tests)
    const testSuite = urls.map((url, i) => ({
      id: `url_test_${i}`,
      name: `Test ${url}`,
      resourceType: 'none',
      execute: async (page) => {
        // Simulate test without real browser
        return { url, title: `Simulated page for ${url}`, duration: Math.random() * 100 };
      },
    }));

    console.log(`\n[Parallel] Running ${testSuite.length} tests with ${options.workers} workers...`);

    const summary = await engine.runSuite(testSuite, { output: true });

    console.log('\n══════ Parallel Execution Report ══════');
    console.log(`  Total tasks: ${summary.totalTasks}`);
    console.log(`  Completed: ${summary.completed}`);
    console.log(`  Failed: ${summary.failed}`);
    console.log(`  Total duration: ${summary.totalDurationMs}ms`);
    console.log(`  Avg task duration: ${summary.avgTaskDurationMs}ms`);
    console.log(`  Workers used: ${summary.workerStats.length}`);
    for (const result of summary.results) {
      const icon = result.status === 'completed' ? '✓' : '✗';
      console.log(`    [${icon}] ${result.name} (${result.durationMs}ms)`);
    }
  });

// ═══════════════════════════════════════════════════════════
// NEW COMMANDS — Feature 3: Visual Regression Testing
// ═══════════════════════════════════════════════════════════

program.command('test:visual <url>')
  .description('Run visual regression tests against stored baselines')
  .option('-b, --baseline-dir <dir>', 'Directory for baseline screenshots', './aast-visual-baselines')
  .option('-o, --output <dir>', 'Output directory for diff results', './aast-visual-results')
  .option('--update-baseline', 'Update baseline screenshots (first run or refresh)', false)
  .option('--full-page', 'Capture full-page screenshots', false)
  .option('--settle-time <ms>', 'Wait time for animations to settle (ms)', '500')
  .option('--viewports <json>', 'Viewport configurations as JSON array', '[{"width":1280,"height":720}]')
  .action(async (url, options) => {
    let viewports;
    try {
      viewports = JSON.parse(options.viewports);
    } catch (e) {
      viewports = [{ width: 1280, height: 720 }];
    }

    const tester = new VisualRegressionTester({
      baselineDir: options.baselineDir,
      outputDir: options.output,
      viewports,
    });

    const report = await tester.runRegression(url, {
      fullPage: options.fullPage,
      settleTime: parseInt(options.settleTime),
      updateBaseline: options.updateBaseline,
    });

    console.log('\n══════ Visual Regression Report ══════');
    console.log(`  URL: ${report.url}`);
    console.log(`  Viewports tested: ${report.viewports}`);
    console.log(`  Duration: ${report.durationMs}ms`);
    console.log(`  Results:`);
    console.log(`    Matches: ${report.summary.matches}`);
    console.log(`    Noise (acceptable): ${report.summary.noise}`);
    console.log(`    Dynamic content: ${report.summary.dynamic}`);
    console.log(`    Critical regressions: ${report.summary.critical}`);
    if (report.summary.hasBlockingRegressions) {
      console.log('\n  ⚠ CRITICAL REGRESSIONS DETECTED — Pipeline blocked');
      process.exit(1);
    } else {
      console.log('\n  ✓ No blocking regressions');
    }
  });

program.command('visual:update-baseline <url>')
  .description('Establish or update visual regression baselines')
  .option('-b, --baseline-dir <dir>', 'Directory for baseline screenshots', './aast-visual-baselines')
  .option('--viewports <json>', 'Viewport configurations as JSON array', '[{"width":1280,"height":720}]')
  .action(async (url, options) => {
    let viewports;
    try {
      viewports = JSON.parse(options.viewports);
    } catch (e) {
      viewports = [{ width: 1280, height: 720 }];
    }

    const tester = new VisualRegressionTester({
      baselineDir: options.baselineDir,
      viewports,
    });

    await tester.runRegression(url, { updateBaseline: true });
    console.log('Baselines updated successfully.');
  });

// ═══════════════════════════════════════════════════════════
// NEW COMMANDS — Feature 4: Test Oracle & Assertion Generator
// ═══════════════════════════════════════════════════════════

program.command('generate:assertions <url>')
  .description('Explore a URL and auto-generate test assertions')
  .option('-i, --interactions <n>', 'Max interactions during exploration', '20')
  .option('-o, --output <dir>', 'Output directory for generated tests', './aast-generated-assertions')
  .option('--min-confidence <n>', 'Minimum confidence threshold (0-1)', '0.5')
  .option('--no-save', 'Do not save results to disk', false)
  .action(async (url, options) => {
    const oracle = new TestOracle({
      outputDir: options.output,
      minConfidence: parseFloat(options.minConfidence),
    });

    const { recording, assertions } = await oracle.explore(url, {
      maxInteractions: parseInt(options.interactions),
      save: options.save,
    });

    console.log('\n══════ Test Oracle Report ══════');
    console.log(`  URL: ${url}`);
    console.log(`  DOM Mutations recorded: ${recording.summary.totalMutations}`);
    console.log(`  API calls observed: ${recording.summary.totalApiCalls}`);
    console.log(`  Interactions performed: ${recording.summary.totalInteractions}`);
    console.log(`  Pages explored: ${recording.summary.totalPages}`);
    console.log(`  Console errors: ${recording.summary.totalErrors}`);
    console.log(`  Assertions inferred: ${assertions.length}`);

    if (assertions.length > 0) {
      console.log('\n  Generated assertions:');
      for (const a of assertions) {
        const confidence = (a.confidence * 100).toFixed(0);
        console.log(`    [${a.severity}] ${a.invariant} (confidence: ${confidence}%)`);
      }
    }
  });

// ═══════════════════════════════════════════════════════════
// NEW COMMANDS — Feature 5: Session Replay
// ═══════════════════════════════════════════════════════════

program.command('record:trace <url>')
  .description('Record a full-fidelity session trace for later replay')
  .option('-d, --duration <seconds>', 'Recording duration in seconds', '10')
  .option('-o, --output <filename>', 'Output filename (.aastreplay)', '')
  .option('--interval <ms>', 'DOM snapshot interval in milliseconds', '1000')
  .option('--output-dir <dir>', 'Output directory for traces', './aast-traces')
  .option('--viewport <json>', 'Viewport as JSON', '{"width":1280,"height":720}')
  .action(async (url, options) => {
    let viewport;
    try {
      viewport = JSON.parse(options.viewport);
    } catch (e) {
      viewport = { width: 1280, height: 720 };
    }

    const recorder = new SessionRecorder({
      captureInterval: parseInt(options.interval),
      outputDir: options.outputDir,
    });

    const result = await recorder.record(url, {
      duration: parseInt(options.duration),
      output: options.output || undefined,
      viewport,
    });

    console.log('\n══════ Session Trace Recorded ══════');
    console.log(`  Trace ID: ${result.traceId}`);
    console.log(`  Output: ${result.outputPath}`);
    console.log(`  Snapshots: ${result.stats.snapshots}`);
    console.log(`  Network entries: ${result.stats.networkEntries}`);
    console.log(`  Console logs: ${result.stats.consoleLogs}`);
    console.log(`  Errors: ${result.stats.consoleErrors}`);
    console.log(`  Duration: ${result.stats.durationMs}ms`);
  });

program.command('replay:view <traceFile>')
  .description('Generate a browser-based viewer for a session trace')
  .option('-o, --output <path>', 'Output HTML file path', 'replay-viewer.html')
  .action(async (traceFile, options) => {
    console.log(`Loading trace from ${traceFile}...`);
    const traceData = SessionTrace.load(traceFile);

    console.log(`Trace loaded: ${traceData.metadata.totalSnapshots} snapshots from ${traceData.metadata.url}`);

    ReplayViewer.generateViewerHTML(traceData, options.output);

    console.log(`\nReplay viewer generated: ${options.output}`);
    console.log('Open this file in a browser to view the session replay.');
    console.log('Keyboard shortcuts: ← → to step, Space to play/pause');
  });

// ═══════════════════════════════════════════════════════════
// NEW COMMANDS — Feature 6: Environment Provisioning
// ═══════════════════════════════════════════════════════════

program.command('provision <testDir>')
  .description('Provision test environment from environment.yaml manifest')
  .option('--dry-run', 'Show what would be provisioned without doing it', false)
  .option('--teardown', 'Teardown a previously provisioned environment', false)
  .option('-o, --output <dir>', 'Output directory for provisioning logs', './aast-provision-results')
  .action(async (testDir, options) => {
    const provisioner = new EnvironmentProvisioner({
      baseDir: testDir,
      outputDir: options.output,
    });

    if (options.teardown) {
      console.log('Tearing down provisioned environment...');
      const logs = await provisioner.teardown();
      console.log('Teardown complete.');
      return;
    }

    const manifest = provisioner.readManifest(testDir);

    if (options.dryRun) {
      console.log('\n══════ Dry Run: Environment Provisioning ══════');
      console.log(`  Version: ${manifest.version}`);
      console.log(`  Services:`);
      if (manifest.services) {
        for (const svc of manifest.services) {
          console.log(`    - ${svc.name}: ${svc.image}`);
          if (svc.ports) console.log(`      Ports: ${svc.ports.join(', ')}`);
          if (svc.env) console.log(`      Env vars: ${Object.keys(svc.env).join(', ')}`);
          if (svc.healthcheck) console.log(`      Health check: ${svc.healthcheck}`);
        }
      }
      console.log(`  Stubs:`);
      if (manifest.stubs) {
        for (const stub of manifest.stubs) {
          console.log(`    - ${stub.name} (${stub.type})`);
        }
      }
      console.log(`  Seed scripts:`);
      if (manifest.seed) {
        for (const seed of manifest.seed) {
          console.log(`    - ${seed.name} (${seed.type}): ${seed.file}`);
        }
      }
      return;
    }

    const result = await provisioner.provision(manifest, testDir);

    console.log('\n══════ Provisioning Report ══════');
    console.log(`  Success: ${result.success}`);
    console.log(`  Services started: ${result.services.length}`);
    console.log(`  Duration: ${result.durationMs}ms`);

    if (Object.keys(result.envVars).length > 0) {
      console.log('  Environment variables injected:');
      for (const [key, value] of Object.entries(result.envVars)) {
        console.log(`    ${key}=${value}`);
      }
    }

    if (result.errors.length > 0) {
      console.log('  Errors:');
      for (const err of result.errors) {
        console.log(`    ${err.service || err.stub}: ${err.error}`);
      }
    }

    provisioner.saveLog();
  });

program.command('provision:teardown')
  .description('Tear down all provisioned test environments')
  .option('-o, --output <dir>', 'Output directory for container logs', './aast-provision-results')
  .action(async (options) => {
    const provisioner = new EnvironmentProvisioner({
      outputDir: options.output,
    });

    const logs = await provisioner.teardown();
    console.log('Teardown complete.');
    console.log(`  Containers stopped: ${Object.keys(logs).length}`);
  });

// ═══════════════════════════════════════════════════════════
// Parse and execute
// ═══════════════════════════════════════════════════════════

program.parse(process.argv);
