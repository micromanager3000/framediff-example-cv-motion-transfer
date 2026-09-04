import { defineComposition, type CompositionSetup } from "framediff";
import source from "./SourcePerformance.html?raw";
import document from "./SourcePerformance.comp.json";

type SourcePerformanceDocument = { source: string };

const sourcePerformanceSetup: CompositionSetup = async ({ document: value, query, resolveAsset, onDocument }) => {
  const video = query<HTMLVideoElement>("video");
  if (!video) throw new Error("Source Performance template has no video element.");
  const apply = async (next: unknown) => {
    const reference = (next as SourcePerformanceDocument | undefined)?.source ?? document.source;
    video.dataset.fdSrc = reference;
    video.src = await resolveAsset(reference);
  };
  await apply(value);
  return onDocument(apply);
};

export const sourcePerformanceComp = defineComposition(source, {
  document,
  setup: sourcePerformanceSetup,
  meta: {
    output: "video",
    library: true,
    document: { file: "src/compositions/SourcePerformance.comp.json" },
  },
});
