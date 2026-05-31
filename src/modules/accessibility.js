const axe = require("axe-core");
const { chromium } = require("playwright");

async function runAccessibilityTest(url) {
  console.log(`Running accessibility test for: ${url}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const results = await page.evaluate(() => {
    return axe.run(document);
  });

  if (results.violations.length > 0) {
    console.error("Accessibility violations found:", JSON.stringify(results.violations, null, 2));
  } else {
    console.log("No accessibility violations found.");
  }

  await browser.close();
  return results;
}

module.exports = { runAccessibilityTest };
