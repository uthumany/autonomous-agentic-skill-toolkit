// Auto-generated assertions for https://example.com
// Generated at 2026-06-01T02:09:12.957Z
// Confidence threshold: 0.5

const { chromium } = require("playwright");

describe("Auto-generated tests for https://example.com", () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newPage();
    page = await context.newPage();
    await page.goto("https://example.com", { waitUntil: "networkidle" });
  });

  afterAll(async () => { await browser.close(); });

  test("GET https://api.example.com/users always returns 200", async () => {
    // Type: api-status | Confidence: 0.7
    const response = await page.goto("https://api.example.com/users");
    expect(response.status()).toBe(200);
  });

  test("https://api.example.com/users returns consistent schema", async () => {
    // Type: api-schema | Confidence: 0.6000000000000001
    const response = await page.goto("https://api.example.com/users");
    const data = await response.json();
    expect(typeof data).toBe("object");
  });

  test("GET https://api.example.com/auth always returns 401", async () => {
    // Type: api-status | Confidence: 0.6
    const response = await page.goto("https://api.example.com/auth");
    expect(response.status()).toBe(401);
  });

  test("Form at /login requires fields: email, pass", async () => {
    // Type: form-required | Confidence: 0.85
    // TODO: Implement test for form-required
  });

  test("Page \"Home\" has 1 heading(s)", async () => {
    // Type: page-structure | Confidence: 0.7
    await expect(page.locator("h1")).toBeVisible();
  });

  test("POST https://api.example.com/auth returned error status 401", async () => {
    // Type: api-error | Confidence: 0.9
    // TODO: Implement test for api-error
  });

  test("Console error detected: \"Uncaught TypeError: Cannot read property of null\"", async () => {
    // Type: console-error | Confidence: 0.8
    const errors = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    await page.reload();
    expect(errors.length).toBe(0);
  });

  test("1 image(s) missing alt text on https://example.com", async () => {
    // Type: accessibility | Confidence: 0.95
    const images = await page.$$("img:not([alt])");
    expect(images.length).toBe(0);
  });

});