import { defineCompositionRegistry } from "framediff";
import { mainComp } from "./compositions/Main";
import { sourcePerformanceComp } from "./compositions/SourcePerformance";
import { faceGuideComp, mocapGuideComp, poseGuideComp } from "./compositions/MotionGuides";
import { hybridGuideComp } from "./compositions/HybridGuide";
import { depthGuideComp } from "./processing/DepthGuide.process";
import { depthTransferComp } from "./gen/DepthTransfer.gen";
import { faceTransferComp } from "./gen/FaceTransfer.gen";
import { mocapTransferComp } from "./gen/MocapTransfer.gen";
import { hybridTransferComp } from "./gen/HybridTransfer.gen";

export const COMPOSITIONS = defineCompositionRegistry({
  "cv-motion-lab": mainComp,
  "source-performance": sourcePerformanceComp,
  "depth-guide": depthGuideComp,
  "pose-guide": poseGuideComp,
  "face-guide": faceGuideComp,
  "mocap-guide": mocapGuideComp,
  "hybrid-guide": hybridGuideComp,
  "depth-transfer": depthTransferComp,
  "face-transfer": faceTransferComp,
  "mocap-transfer": mocapTransferComp,
  "hybrid-transfer": hybridTransferComp,
});

export const PROJECT_ROOT: keyof typeof COMPOSITIONS = "cv-motion-lab";
