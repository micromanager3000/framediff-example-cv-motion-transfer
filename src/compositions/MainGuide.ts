import type { StudioGuideDescriptor } from "framediff";

export const cvMotionGuide: StudioGuideDescriptor = {
  id: "cv-motion-transfer-v1",
  title: "CV motion transfer lab",
  summary: "Prepare depth and MediaPipe motion guides, inspect each signal, then run matched Seedance 2.0 comparisons without implicit paid generation.",
  estimatedMinutes: 12,
  steps: [
    {
      id: "source",
      phase: "Prepare",
      title: "Inspect the reference performance",
      description: "The source is an input to computer vision only; Seedance receives derived guides instead of the original appearance.",
      try: "Open SourcePerformance and scrub the full four-second clip.",
      success: "The complete body and face stay visible for all 96 frames.",
      target: { compositionKey: "source-performance", frame: 36 },
    },
    {
      id: "depth",
      phase: "Prepare",
      title: "Verify the pinned depth artifact",
      description: "DepthGuide is a processing composition whose exact grayscale channel is pinned by recipe fingerprint and content hash.",
      try: "Open DepthGuide and inspect its source and cache entry before using it downstream.",
      success: "The guide shows a grayscale temporal depth video rather than a stale or missing processing slate.",
      target: { compositionKey: "depth-guide", frame: 36, panel: "cache" },
    },
    {
      id: "face",
      phase: "Compare",
      title: "Separate facial performance from appearance",
      description: "The face guide keeps eye, brow, mouth, and head motion while throwing away the actor's texture and identity.",
      try: "Open FaceGuide, then jump between frames 12, 42, and 72.",
      success: "Contours change with expression and resolve identically after random-access scrubbing.",
      target: { compositionKey: "face-guide", frame: 42 },
    },
    {
      id: "mocap",
      phase: "Compare",
      title: "Inspect pose and face together",
      description: "MocapGuide combines 33 pose joints with selected facial contours in one high-contrast control video.",
      try: "Scrub MocapGuide non-linearly and inspect the body weight shifts and face motion.",
      success: "Returning to the same frame reproduces the same guide geometry.",
      target: { compositionKey: "mocap-guide", frame: 58 },
    },
    {
      id: "generate",
      phase: "Generate",
      title: "Run matched Seedance comparisons",
      description: "All four recipes share the same target look, duration, aspect, and model settings; only @Video1 changes.",
      try: "Open one transfer, inspect the prompt and references, then explicitly choose Generate when ready to spend.",
      success: "The request names the pinned guide as @Video1 and the target look as @Image1; navigation alone submits nothing.",
      target: { compositionKey: "hybrid-transfer", frame: 0 },
    }
  ],
};
