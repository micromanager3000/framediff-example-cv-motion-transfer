import { defineComposition } from "framediff";
import { createMotionGuideSetup } from "framediff/vision";
import { MOTION_DOCUMENT } from "../data/motion";
import source from "./HybridGuide.html?raw";

export const hybridGuideComp = defineComposition(source, {
  document: MOTION_DOCUMENT,
  setup: createMotionGuideSetup({ mode: "mocap", background: null }),
  meta: {
    output: "video",
    library: true,
    deps: ["src/data/performance.motion.json", "src/processing/DepthGuide.process.json"],
    dataFiles: ["src/data/performance.motion.json"],
  },
});
