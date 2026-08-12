import {
  HttpFolderCAS,
  createAssetResolver,
  hashBlob,
  loadManifest,
  type AssetResolver,
  type CompRegistry,
} from "framediff";
import { COMPOSITIONS } from "./config";

let renderToolsPromise: Promise<typeof import("framediff/render")> | undefined;
const loadRenderTools = () => (renderToolsPromise ??= import("framediff/render"));

if (import.meta.hot) import.meta.hot.accept("./config", () => undefined);

let resolverPromise: Promise<AssetResolver> | undefined;
const getResolver = () => (resolverPromise ??= loadManifest("/__framediff/assets").then((manifest) => createAssetResolver({
  manifest,
  cas: new HttpFolderCAS(),
  trustLocalCacheSources: true,
})));

window.__frameDiffBakeComposition = async (id: string) => {
  const comp = (COMPOSITIONS as CompRegistry)[id];
  if (!comp) throw new Error(`unknown comp "${id}"`);
  const { exportVideo } = await loadRenderTools();
  const cas = new HttpFolderCAS();
  const buf = await exportVideo(comp, {
    width: comp.width,
    height: comp.height,
    codec: "avc1.640028",
    muxerCodec: "avc",
    bitrate: 5_000_000,
    resolver: await getResolver(),
  });
  const blob = new Blob([buf], { type: "video/mp4" });
  const hash = await hashBlob(blob);
  await cas.put(hash, blob, `${id}.mp4`);
  return hash;
};
