/**
 * Headless browser recording for the ConsentChain demo video.
 * Mocks /api/gateway/step-up and /api/gateway/token so the full UI flow runs without Auth0 login.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const outputDir = path.join(repoRoot, "output");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function dismissGithubCookie(page) {
  const accept = page.getByRole("button", { name: /accept|agree/i }).first();
  try {
    await accept.click({ timeout: 4000 });
  } catch {
    /* no banner */
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 },
    },
  });

  await context.route("**/api/gateway/step-up", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        verified: true,
        verifiedAt: new Date().toISOString(),
      }),
    });
  });

  await context.route("**/api/gateway/token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        meta: {
          connection: "google-oauth2",
          audience: "https://calendar.googleapis.com/",
          scopes: ["calendar.write"],
          issuedAt: new Date().toISOString(),
          expiresIn: 3600,
        },
      }),
    });
  });

  const page = await context.newPage();

  // --- Scene: original ConsentChain repo ---
  await page.goto("https://github.com/coreyalejandro/consentchain", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await dismissGithubCookie(page);
  await delay(12000);
  await page.evaluate(() => window.scrollBy(0, 500));
  await delay(6000);

  // --- Schema-backed inventory (local app) ---
  await page.goto("http://127.0.0.1:3000/component-inventory.json", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await delay(18000);

  await page.goto("http://127.0.0.1:3000/components-schema.json", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await delay(18000);

  // --- Live demo: high-risk path with mocked vault APIs ---
  await page.goto("http://127.0.0.1:3000/", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await delay(4000);

  await page.getByRole("button", { name: /Delete All Events/i }).click();
  await delay(4500);
  await page.getByRole("button", { name: /Re-Authenticate with Auth0/i }).click();
  await delay(5000);
  await page.getByRole("button", { name: /Approve — Issue connection-scoped token/i }).click();
  await delay(8000);
  await page.getByRole("button", { name: /Reset gateway/i }).click();
  await delay(4000);

  // --- Extracted product repo ---
  await page.goto("https://github.com/coreyalejandro/consent-gateway-auth0", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await dismissGithubCookie(page);
  await delay(14000);

  const recording = page.video();
  await context.close();
  await browser.close();
  const videoPath = await recording.path();

  fs.writeFileSync(path.join(outputDir, "video-path.txt"), videoPath, "utf8");
  console.log("Recording saved:", videoPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
