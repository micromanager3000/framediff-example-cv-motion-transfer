import { defineComposition, defineTimelineDocument, type StudioComposition } from "framediff";
import source from "./Main.html?raw";
import timeline from "./Main.timeline.json";
import { cvMotionGuide } from "./MainGuide";

export const mainComp = defineComposition(source, {
  timeline: defineTimelineDocument(timeline),
  meta: {
    timelineFile: "src/compositions/Main.timeline.json",
    deps: ["src/compositions/MainGuide.ts"],
  },
}) as StudioComposition;

mainComp.meta = { ...mainComp.meta, guide: cvMotionGuide };
