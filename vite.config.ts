import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { fileURLToPath, URL } from "node:url";
import { framediffDev } from "./vendor/framediff/packages/framediff/vite-plugin.ts";

export default defineConfig({
  plugins: [sveltekit(), framediffDev()],
  server: { watch: { ignored: ["**/.svelte-kit/**", "**/build/**", "**/assets/**"] } },
  resolve: {
    dedupe: ["svelte"],
    alias: [
      { find: /^framediff$/, replacement: fileURLToPath(new URL("./vendor/framediff/packages/framediff/src/index.ts", import.meta.url)) },
      { find: /^framediff\/vision$/, replacement: fileURLToPath(new URL("./vendor/framediff/packages/framediff/src/vision/index.ts", import.meta.url)) },
    ],
  },
});
