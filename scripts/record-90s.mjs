import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = "http://127.0.0.1:8080/";
const outDir = "/tmp/pw-video";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(12000); // 0:00–0:12 one-liner + hash
await page.getByRole("button", { name: "Success path" }).click();
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Policy check" }).click();
await page.waitForTimeout(14000); // 0:12–0:28
await page.getByRole("button", { name: "Dry-run" }).click();
await page.waitForTimeout(20000); // 0:28–0:48
await page.getByRole("button", { name: "Execute" }).click();
await page.waitForTimeout(22000); // 0:48–1:10
await page.getByRole("button", { name: "Policy reject" }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Policy check" }).click();
await page.waitForTimeout(15000); // 1:10–1:25
await page.waitForTimeout(5000); // close
const video = page.video();
await context.close();
const path = video ? await video.path() : null;
await browser.close();
console.log(JSON.stringify({ path }));
