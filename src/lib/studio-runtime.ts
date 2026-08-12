import type { CompRegistry } from "framediff";
import { createStudioRuntime } from "framediff/studio-runtime";
import { COMPOSITIONS, PROJECT_ROOT } from "../config";
import "../main";

export const studioRuntime = createStudioRuntime(COMPOSITIONS);
export const projectRoot = PROJECT_ROOT;

if (import.meta.hot) {
  import.meta.hot.accept("../config", (module) => module && studioRuntime.replaceRegistry(module.COMPOSITIONS as CompRegistry));
}
