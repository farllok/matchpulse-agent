import { mkdir, rename } from "node:fs/promises";
import { chromium } from "playwright";

const siteUrl = "https://farllok.github.io/matchpulse-agent/";
const expectedRelease = "2026.07.10.4";

await mkdir("demo/recordings", { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: {
    dir: "demo/recordings",
    size: { width: 1440, height: 900 },
  },
});

const page = await context.newPage();
let deployed = false;
for (let attempt = 1; attempt <= 24; attempt += 1) {
  await page.goto(`${siteUrl}?release=${expectedRelease}&attempt=${attempt}`, { waitUntil: "networkidle" });
  deployed = await page.locator(`meta[name="app-release"][content="${expectedRelease}"]`).count() === 1;
  if (deployed) break;
  await page.waitForTimeout(5_000);
}
if (!deployed) throw new Error(`GitHub Pages did not deploy release ${expectedRelease} within two minutes`);
await page.waitForTimeout(1600);

await page.getByRole("button", { name: "Restore demo snapshot" }).click();
await page.waitForTimeout(1000);

await page.mouse.move(900, 560, { steps: 18 });
await page.waitForTimeout(700);
await page.mouse.wheel(0, 600);
await page.waitForTimeout(1200);
await page.mouse.wheel(0, 650);
await page.waitForTimeout(1200);
await page.mouse.wheel(0, -1250);
await page.waitForTimeout(1300);

const video = page.video();
await context.close();
const recordingPath = await video.path();
await browser.close();

await rename(recordingPath, "demo/matchpulse-demo.webm");
