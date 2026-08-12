import {
  FaceLandmarker,
  FilesetResolver,
  PoseLandmarker,
  type FaceLandmarkerResult,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { MotionCaptureDocument, MotionCaptureLandmark } from "framediff/vision";
import { FACE_GUIDE_LANDMARK_INDICES } from "framediff/vision";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let trackersPromise: Promise<{ face: FaceLandmarker; pose: PoseLandmarker }> | undefined;
// Five normalized-coordinate decimals stay comfortably below a source pixel
// while keeping recorded fixtures small enough for an eager example bundle.
const rounded = (value: number, digits = 5) => Number(value.toFixed(digits));

async function trackers(): Promise<{ face: FaceLandmarker; pose: PoseLandmarker }> {
  return trackersPromise ??= (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
    const [face, pose] = await Promise.all([
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      }),
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      }),
    ]);
    return { face, pose };
  })();
}

function normalizeLandmarks(landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | undefined): MotionCaptureLandmark[] | undefined {
  return landmarks?.map((landmark) => ({
    x: rounded(landmark.x),
    y: rounded(landmark.y),
    ...(Number.isFinite(landmark.z) ? { z: rounded(landmark.z!) } : {}),
    ...(Number.isFinite(landmark.visibility) ? { visibility: rounded(landmark.visibility!) } : {}),
  }));
}

interface FaceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}

function faceFrame(result: FaceLandmarkerResult, crop?: FaceCrop) {
  const raw = result.faceLandmarks[0];
  const fullLandmarks = crop && raw
    ? raw.map((landmark) => ({
        x: rounded((crop.x + landmark.x * crop.width) / crop.sourceWidth),
        y: rounded((crop.y + landmark.y * crop.height) / crop.sourceHeight),
        z: rounded(landmark.z * crop.width / crop.sourceWidth),
      }))
    : normalizeLandmarks(raw);
  if (!fullLandmarks) return undefined;
  const kept = new Set(FACE_GUIDE_LANDMARK_INDICES);
  const landmarks = fullLandmarks.map((landmark, index) => kept.has(index) ? landmark : null);
  const blendshapes = Object.fromEntries(
    (result.faceBlendshapes[0]?.categories ?? []).map((category) => [category.categoryName, rounded(category.score, 5)]),
  );
  return { landmarks, ...(Object.keys(blendshapes).length ? { blendshapes } : {}) };
}

function poseFrame(result: PoseLandmarkerResult) {
  const landmarks = normalizeLandmarks(result.landmarks[0]);
  if (!landmarks) return undefined;
  return { landmarks };
}

function faceInput(
  video: HTMLVideoElement,
  poseResult: PoseLandmarkerResult,
  canvas: HTMLCanvasElement,
): { image: HTMLVideoElement | HTMLCanvasElement; crop?: FaceCrop } {
  const pose = poseResult.landmarks[0];
  const head = pose?.slice(0, 11).filter((landmark) => (landmark.visibility ?? 1) >= 0.35);
  if (!head?.length) return { image: video };
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const xs = head.map((landmark) => landmark.x * sourceWidth);
  const ys = head.map((landmark) => landmark.y * sourceHeight);
  const shoulderWidth = pose[11] && pose[12]
    ? Math.abs(pose[11].x - pose[12].x) * sourceWidth
    : 0;
  const headWidth = Math.max(...xs) - Math.min(...xs);
  const headHeight = Math.max(...ys) - Math.min(...ys);
  const size = Math.min(
    Math.max(headWidth * 2.4, headHeight * 2.6, shoulderWidth * 0.78, 160),
    Math.min(sourceWidth, sourceHeight) * 0.62,
  );
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2 - size * 0.08;
  const x = Math.max(0, Math.min(sourceWidth - size, centerX - size / 2));
  const y = Math.max(0, Math.min(sourceHeight - size, centerY - size / 2));
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return { image: video };
  context.drawImage(video, x, y, size, size, 0, 0, canvas.width, canvas.height);
  return { image: canvas, crop: { x, y, width: size, height: size, sourceWidth, sourceHeight } };
}

async function seek(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.0005 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  await new Promise<void>((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(video.error ?? new Error("Video seek failed.")); };
    const cleanup = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", failed);
    };
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", failed, { once: true });
    video.currentTime = time;
  });
}

async function sourceVideo(): Promise<{ video: HTMLVideoElement; revoke: () => void }> {
  const input = document.querySelector<HTMLInputElement>("#source");
  const file = input?.files?.[0];
  if (!file) throw new Error("Choose a source performance video first.");
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(video.error ?? new Error("Video metadata failed to load.")), { once: true });
  });
  return { video, revoke: () => URL.revokeObjectURL(url) };
}

async function extractMotion(fps = 24, stride = 2): Promise<MotionCaptureDocument> {
  const { video, revoke } = await sourceVideo();
  try {
    if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 15) {
      throw new Error("The reference performance must be between 0 and 15 seconds.");
    }
    const frameCount = Math.max(1, Math.round(video.duration * fps));
    const { face, pose } = await trackers();
    const faceCanvas = document.createElement("canvas");
    const frames: MotionCaptureDocument["frames"] = [];
    for (let frame = 0; frame < frameCount; frame += stride) {
      const time = Math.min(video.duration - 0.001, frame / fps);
      await seek(video, Math.max(0, time));
      const timestampMs = Math.round((frame / fps) * 1000);
      const poseResult = pose.detectForVideo(video, timestampMs);
      const faceSource = faceInput(video, poseResult, faceCanvas);
      const faceResult = face.detectForVideo(faceSource.image, timestampMs);
      const faceValue = faceFrame(faceResult, faceSource.crop);
      const poseValue = poseFrame(poseResult);
      if (faceValue || poseValue) frames.push({ frame, ...(faceValue ? { face: faceValue } : {}), ...(poseValue ? { pose: poseValue } : {}) });
    }
    if (!frames.length) throw new Error("MediaPipe found no face or body landmarks in the reference video.");
    return {
      version: 1,
      width: video.videoWidth,
      height: video.videoHeight,
      fps,
      frameCount,
      frames,
    };
  } finally {
    revoke();
  }
}

declare global {
  interface Window { __extractFrameDiffMotion: (fps?: number, stride?: number) => Promise<MotionCaptureDocument>; }
}

window.__extractFrameDiffMotion = extractMotion;
