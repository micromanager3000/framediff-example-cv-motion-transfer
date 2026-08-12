import { processing, type ProcessingCompositionDocument } from "framediff";
import document from "./DepthGuide.process.json";

export const depthGuideComp = processing({
  id: "DepthGuide",
  file: "src/processing/DepthGuide.process.ts",
  dataFile: "src/processing/DepthGuide.process.json",
  width: 480,
  height: 854,
  fps: 24,
  durationInFrames: 96,
  outputChannel: "depth",
  document: document as ProcessingCompositionDocument,
});
