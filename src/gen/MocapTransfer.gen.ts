import { generative, type GenRecipeData } from "framediff";
import data from "./MocapTransfer.gen.json";

export const mocapTransferComp = generative({
  id: "MocapTransfer",
  file: "src/gen/MocapTransfer.gen.ts",
  dataFile: "src/gen/MocapTransfer.gen.json",
  ...(data as GenRecipeData),
});
