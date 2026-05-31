const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");

async function runPerformanceTest(url) {
  console.log(`Running performance test for: ${url}`);
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
  const options = { logLevel: "info", output: "json", port: chrome.port };
  const runnerResult = await lighthouse(url, options);

  console.log("Lighthouse scores:");
  for (const category in runnerResult.lhr.categories) {
    console.log(
      `${runnerResult.lhr.categories[category].title}: ${runnerResult.lhr.categories[category].score * 100}`
    );
  }

  await chrome.kill();
  return runnerResult.lhr;
}

module.exports = { runPerformanceTest };
