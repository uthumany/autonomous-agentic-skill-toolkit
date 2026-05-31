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
const fs = require('fs');

const program = new Command();

program
  .name('aast')
  .description('Autonomous Agentic Skill Toolkit CLI')
  .version('0.1.0');

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
    // Placeholder for audit execution logic
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



program.parse(process.argv);
