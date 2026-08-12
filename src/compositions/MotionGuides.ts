import { defineMotionGuideComposition } from "framediff/vision";
import { MOTION_DOCUMENT } from "../data/motion";

const shared = {
  file: "src/compositions/MotionGuides.ts",
  dataFile: "src/data/performance.motion.json",
  width: 480,
  height: 854,
  fps: 24,
  durationInFrames: 96,
  document: MOTION_DOCUMENT,
} as const;

export const poseGuideComp = defineMotionGuideComposition({
  ...shared,
  id: "PoseGuide",
  mode: "pose",
  background: "#02080b",
});

export const faceGuideComp = defineMotionGuideComposition({
  ...shared,
  id: "FaceGuide",
  mode: "face",
  background: "#09030a",
});

export const mocapGuideComp = defineMotionGuideComposition({
  ...shared,
  id: "MocapGuide",
  mode: "mocap",
  background: "#030509",
});
