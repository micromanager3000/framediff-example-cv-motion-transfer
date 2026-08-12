import { defineCodeScene } from "framediff";
import source from "./SourcePerformance.html?raw";

export const sourcePerformanceComp = defineCodeScene(source, {
  capabilities: ["dom"],
  dependencies: { assets: ["performance-source"] },
  meta: { output: "video", library: true },
});
