import { generative, type GenRecipeData } from "framediff";
import data from "./DepthTransfer.gen.json";

export const depthTransferComp = generative({
  id: "DepthTransfer",
  file: "src/gen/DepthTransfer.gen.ts",
  dataFile: "src/gen/DepthTransfer.gen.json",
  ...(data as GenRecipeData),
});
