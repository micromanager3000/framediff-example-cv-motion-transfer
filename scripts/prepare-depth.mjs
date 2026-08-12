import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENDPOINT = "fal-ai/depth-anything-video";

function argumentsOf(argv) {
  const result = {
    input: "",
    look: "",
    artifact: "",
    model: "VDA-Large",
    modelRevision: "CVPR-2025",
    width: 480,
    height: 854,
    fps: 24,
    frameCount: 96,
    ingestOnly: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--look") result.look = path.resolve(argv[++index] ?? "");
    else if (value === "--ingest-only") result.ingestOnly = true;
    else if (value === "--artifact") result.artifact = path.resolve(argv[++index] ?? "");
    else if (value === "--model") result.model = argv[++index] ?? "";
    else if (value === "--model-revision") result.modelRevision = argv[++index] ?? "";
    else if (value === "--width") result.width = Number(argv[++index]);
    else if (value === "--height") result.height = Number(argv[++index]);
    else if (value === "--fps") result.fps = Number(argv[++index]);
    else if (value === "--frames") result.frameCount = Number(argv[++index]);
    else if (!result.input) result.input = path.resolve(value);
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!result.input) throw new Error("usage: npm run depth -- <reference.mp4> [--look target.png] [--artifact depth.mp4 --model VDA-Small --model-revision revision] [--ingest-only]");
  if (!result.model || !result.modelRevision) throw new Error("--model and --model-revision must be non-empty");
  for (const field of ["width", "height", "fps", "frameCount"]) {
    if (!Number.isFinite(result[field]) || result[field] <= 0) throw new Error(`--${field} must be positive`);
  }
  return result;
}

async function falKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  let directory = PROJECT_ROOT;
  for (let depth = 0; depth < 8; depth += 1) {
    try {
      const secrets = JSON.parse(await fs.readFile(path.join(directory, ".framediff/secrets.json"), "utf8"));
      if (secrets.fal?.key) return secrets.fal.key;
    } catch {}
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error("No fal key found. Set FAL_KEY or add it in FrameDiff Services.");
}

function mimeFor(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".webm") return "video/webm";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "video/mp4";
}

async function upload(key, file, bytes) {
  const mime = mimeFor(file);
  const initiated = await fetch("https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
    method: "POST",
    headers: { authorization: `Key ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ file_name: path.basename(file), content_type: mime }),
  });
  const info = await initiated.json();
  if (!initiated.ok || !info.upload_url) throw new Error(`fal upload initialization failed (${initiated.status})`);
  const written = await fetch(info.upload_url, { method: "PUT", headers: { "content-type": mime }, body: bytes });
  if (!written.ok) throw new Error(`fal upload failed (${written.status})`);
  const url = info.file_url ?? info.access_url;
  if (!url) throw new Error("fal upload returned no public file URL");
  return url;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function runDepth(key, videoUrl, options) {
  const submitted = await fetch(`https://queue.fal.run/${ENDPOINT}`, {
    method: "POST",
    headers: { authorization: `Key ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      video_url: videoUrl,
      model: options.model,
      colormap: "grayscale",
      resolution: "480p",
      max_frames: options.frameCount,
      output_fps: options.fps,
      side_by_side: false,
      include_raw_depths: false,
    }),
  });
  const queue = await submitted.json();
  if (!submitted.ok || !queue.request_id) throw new Error(`Depth Anything submit failed (${submitted.status}): ${JSON.stringify(queue).slice(0, 300)}`);
  const statusUrl = queue.status_url ?? `https://queue.fal.run/${ENDPOINT}/requests/${queue.request_id}/status`;
  const responseUrl = queue.response_url ?? `https://queue.fal.run/${ENDPOINT}/requests/${queue.request_id}`;
  for (;;) {
    const response = await fetch(statusUrl, { headers: { authorization: `Key ${key}` } });
    const status = await response.json();
    if (!response.ok) throw new Error(`Depth Anything status failed (${response.status})`);
    if (status.status === "COMPLETED") break;
    if (status.status === "FAILED") throw new Error(`Depth Anything failed: ${JSON.stringify(status).slice(0, 300)}`);
    await wait(1200);
  }
  const response = await fetch(responseUrl, { headers: { authorization: `Key ${key}` } });
  const result = await response.json();
  if (!response.ok || !result.video?.url) throw new Error(`Depth Anything returned no video (${response.status})`);
  const media = await fetch(result.video.url);
  if (!media.ok) throw new Error(`Depth video download failed (${media.status})`);
  return { requestId: queue.request_id, bytes: Buffer.from(await media.arrayBuffer()) };
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function processingFingerprint(recipe) {
  const normalized = canonical({ ...recipe, inputs: [...recipe.inputs].sort((left, right) => `${left.name}:${left.contentHash}`.localeCompare(`${right.name}:${right.contentHash}`)) });
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex")}`;
}

function hash(bytes) {
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function cacheName(label, contentHash, extension) {
  return `${label}--sha256-${contentHash.slice("sha256:".length)}.${extension}`;
}

async function ingestAsset(manifest, id, label, file, bytes) {
  const contentHash = hash(bytes);
  const extension = path.extname(file).slice(1).toLowerCase() || (mimeFor(file).startsWith("image/") ? "png" : "mp4");
  const name = cacheName(label, contentHash, extension);
  await fs.mkdir(path.join(PROJECT_ROOT, "assets"), { recursive: true });
  await fs.writeFile(path.join(PROJECT_ROOT, "assets", name), bytes);
  manifest.assets[id] = {
    name: path.basename(file),
    contentHash,
    mime: mimeFor(file),
    bytes: bytes.length,
    sources: [`/__framediff-cache/${encodeURIComponent(contentHash)}`],
  };
  return { contentHash, name };
}

const options = argumentsOf(process.argv.slice(2));
const sourceBytes = await fs.readFile(options.input);
const manifestFile = path.join(PROJECT_ROOT, "framediff.assets.json");
const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
const source = await ingestAsset(manifest, "performance-source", "PerformanceSource", options.input, sourceBytes);
if (options.look) await ingestAsset(manifest, "target-look", "TargetLook", options.look, await fs.readFile(options.look));
await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
if (options.ingestOnly) {
  process.stdout.write("ingested source and target look without running paid depth processing\n");
  process.exit(0);
}

let depthResult;
if (options.artifact) {
  const bytes = await fs.readFile(options.artifact);
  depthResult = { requestId: `local:${hash(bytes)}`, bytes };
  process.stdout.write("imported an existing depth artifact without a paid provider call\n");
} else {
  const key = await falKey();
  process.stdout.write("uploaded reference performance to fal storage\n");
  const videoUrl = await upload(key, options.input, sourceBytes);
  depthResult = await runDepth(key, videoUrl, options);
}
const depthHash = hash(depthResult.bytes);
const depthName = cacheName("DepthGuide", depthHash, "mp4");
await fs.writeFile(path.join(PROJECT_ROOT, "assets", depthName), depthResult.bytes);
manifest.assets["depth-guide"] = {
  name: "DepthGuide.mp4",
  contentHash: depthHash,
  mime: "video/mp4",
  bytes: depthResult.bytes.length,
  sources: [`/__framediff-cache/${encodeURIComponent(depthHash)}`],
};
await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

const recipe = {
  version: 1,
  kind: "processing",
  id: "performance-depth",
  inputs: [{ name: "source", contentHash: source.contentHash, mime: "video/mp4" }],
  parameters: { model: options.model, colormap: "grayscale", resolution: "480p", sideBySide: false },
  provenance: {
    processor: options.artifact ? "video-depth-anything-local" : "fal-depth-anything-video",
    model: options.model.toLowerCase(),
    modelRevision: options.modelRevision,
    runtime: options.artifact ? "native-import" : "fal",
    runtimeRevision: options.artifact ? "user-supplied-artifact" : ENDPOINT,
  },
};
const recipeFingerprint = processingFingerprint(recipe);
const processDocument = {
  recipe,
  recipeFingerprint,
  artifact: {
    version: 1,
    kind: "processing-artifact",
    recipeFingerprint,
    inputs: recipe.inputs,
    provenance: recipe.provenance,
    channels: {
      depth: {
        name: "depth",
        contentHash: depthHash,
        mime: "video/mp4",
        container: "mp4",
        bytes: depthResult.bytes.length,
        dimensions: { width: options.width, height: options.height },
        timing: { fps: options.fps, frameCount: options.frameCount, durationSeconds: options.frameCount / options.fps },
      },
    },
  },
  pinnedRecipeFingerprint: recipeFingerprint,
};
await fs.writeFile(path.join(PROJECT_ROOT, "src/processing/DepthGuide.process.json"), `${JSON.stringify(processDocument, null, 2)}\n`);
process.stdout.write(`depth ${depthResult.requestId} → assets/${depthName}\n`);
