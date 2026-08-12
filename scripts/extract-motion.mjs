import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argumentsOf(argv) {
  const result = { input: "", output: path.join(PROJECT_ROOT, "src/data/performance.motion.json"), fps: 24, stride: 2 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--output") result.output = path.resolve(argv[++index] ?? "");
    else if (value === "--fps") result.fps = Number(argv[++index]);
    else if (value === "--stride") result.stride = Number(argv[++index]);
    else if (!result.input) result.input = path.resolve(value);
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!result.input) throw new Error("usage: npm run track -- <reference.mp4> [--output path] [--fps 24] [--stride 2]");
  if (!Number.isFinite(result.fps) || result.fps <= 0 || result.fps > 60) throw new Error("--fps must be between 0 and 60");
  if (!Number.isInteger(result.stride) || result.stride < 1 || result.stride > 12) throw new Error("--stride must be an integer between 1 and 12");
  return result;
}

const options = argumentsOf(process.argv.slice(2));
const sourceBytes = await fs.readFile(options.input);
const sourceContentHash = `sha256:${crypto.createHash("sha256").update(sourceBytes).digest("hex")}`;
const server = await createServer({ root: path.join(PROJECT_ROOT, "tools"), logLevel: "error", server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error("The local tracker page did not start.");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.setInputFiles("#source", options.input);
  const document = await page.evaluate(async ({ fps, stride }) => {
    if (!window.__extractFrameDiffMotion) throw new Error("The motion tracker did not initialize.");
    return window.__extractFrameDiffMotion(fps, stride);
  }, { fps: options.fps, stride: options.stride });
  document.sourceContentHash = sourceContentHash;
  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, `${JSON.stringify(document, null, 2)}\n`);
  process.stdout.write(`tracked ${document.frames.length}/${document.frameCount} frames → ${path.relative(PROJECT_ROOT, options.output)}\n`);
} finally {
  await browser?.close();
  await server.close();
}
