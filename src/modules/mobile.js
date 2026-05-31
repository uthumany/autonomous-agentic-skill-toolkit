const { webkit, devices } = require("playwright");

async function runMobileTest(url, device = "iPhone 11") {
  console.log(`Running mobile test for: ${url} on ${device}`);
  const browser = await webkit.launch();
  const context = await browser.newContext({ ...devices[device] });
  const page = await context.newPage();
  await page.goto(url);
  await page.screenshot({ path: `screenshot_mobile_${device.replace(/\s/g, "_")}.png` });
  await browser.close();
  console.log("Mobile test completed. Screenshot saved.");
}

module.exports = { runMobileTest };
