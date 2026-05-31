const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function captureScreenshot(url, outputPath = 'screenshot.png') {
  console.log(`Capturing screenshot of ${url} to ${outputPath}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await page.screenshot({ path: outputPath });
  await browser.close();
  console.log(`Screenshot saved to ${outputPath}`);
  return outputPath;
}

async function recordVideo(url, outputPath = 'video.webm', duration = 5) {
  console.log(`Recording video of ${url} to ${outputPath} for ${duration} seconds`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: { dir: path.dirname(outputPath) }
  });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForTimeout(duration * 1000);
  await browser.close();
  const videoPath = page.video().path();
  fs.renameSync(videoPath, outputPath);
  console.log(`Video saved to ${outputPath}`);
  return outputPath;
}

module.exports = { captureScreenshot, recordVideo };
