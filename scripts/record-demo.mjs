import { mkdir, rename } from "node:fs/promises";
import { chromium } from "playwright";

const siteUrl = "https://farllok.github.io/matchpulse-agent/";

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
await page.goto(siteUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(1600);

await page.getByRole("button", { name: "Load demo" }).click();
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
