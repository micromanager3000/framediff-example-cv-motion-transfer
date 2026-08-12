import { generative, type GenRecipeData } from "framediff";
import data from "./HybridTransfer.gen.json";

export const hybridTransferComp = generative({
  id: "HybridTransfer",
  file: "src/gen/HybridTransfer.gen.ts",
  dataFile: "src/gen/HybridTransfer.gen.json",
  ...(data as GenRecipeData),
});
