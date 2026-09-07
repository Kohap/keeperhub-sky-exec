import { chromium } from "playwright";
import { copyFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const url = process.env.DEMO_URL ?? "http://127.0.0.1:8080/";
const outDir = "/tmp/pw-video";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(8000);
await page.getByRole("link", { name: "Open the desk" }).click();
await page.waitForURL("**/desk");
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Success path" }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Policy check" }).click();
await page.waitForTimeout(8000);
await page.getByRole("button", { name: "Dry-run" }).click();
await page.waitForTimeout(10000);
await page.getByRole("button", { name: "Execute" }).click();
await page.waitForTimeout(12000);
await page.getByRole("button", { name: "Policy reject" }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Policy check" }).click();
await page.waitForTimeout(10000);
const video = page.video();
await context.close();
const webm = video ? await video.path() : null;
await browser.close();
if (!webm) {
  throw new Error("Playwright did not write a video");
}
const mp4 = "/workspace/docs/demo-90s.mp4";
const pub = "/workspace/public/demo-90s.mp4";
const ff = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    webm,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    mp4,
  ],
  { stdio: "inherit" },
);
if (ff.status !== 0) {
  copyFileSync(webm, mp4);
}
copyFileSync(mp4, pub);
console.log(JSON.stringify({ webm, mp4, pub }));
