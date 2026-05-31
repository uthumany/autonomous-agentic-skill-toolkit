const { chromium } = require('playwright');

async function runWebTest(url) {
  console.log(`Running web test for: ${url}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.screenshot({ path: 'screenshot_web.png' });
  await browser.close();
  console.log('Web test completed. Screenshot saved to screenshot_web.png');
}

module.exports = { runWebTest };
