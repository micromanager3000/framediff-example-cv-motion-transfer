import { generative, type GenRecipeData } from "framediff";
import data from "./FaceTransfer.gen.json";

export const faceTransferComp = generative({
  id: "FaceTransfer",
  file: "src/gen/FaceTransfer.gen.ts",
  dataFile: "src/gen/FaceTransfer.gen.json",
  ...(data as GenRecipeData),
});
