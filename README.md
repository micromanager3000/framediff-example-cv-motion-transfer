# Computer-vision motion transfer

This example turns one licensed four-second performance into four appearance-free control videos,
then wires each one into the same Seedance 2.0 reference-to-video recipe:

```text
performance.mp4
   ├── Video Depth Anything ───────────────▶ depth guide ────────┐
   └── MediaPipe Pose + Face Landmarker ──▶ pose / face guides ─┼─▶ Seedance 2.0
                                                  └──────────────┘   + fictional @Image1 look
```

The model never receives the original performance video. `@Image1` owns subject appearance and
art direction; `@Video1` contains only depth or tracked geometry. The root composition presents
matched depth, face, mocap, and depth-plus-tracks experiments side by side.

## Run the bundled lab

From the repository root:

```sh
npm install
npm run dev --workspace @framediff/example-cv-motion-transfer
```

The repository includes a 4-second, 720×1280 licensed dance excerpt, a fictional 720×1280 target
look, 48 sparse tracking samples over 96 render frames, and a pinned 480×854 grayscale depth
artifact. Scrub `PoseGuide`, `FaceGuide`, `MocapGuide`, and `HybridGuide` before opening the four
generative compositions.

The included depth artifact was produced with the official Apache-2.0 Video Depth Anything Small
checkpoint and is recorded honestly as a native import. The default preparation command below uses
fal's `VDA-Large` endpoint for a production-shaped run.

## Use your own performance

Choose a single-person clip that is 4–15 seconds, keeps the face and complete body readable, and
avoids cuts or occlusion. Normalize it to the duration and aspect required by your recipe before
tracking.

### 1. Extract pose, face, and blendshapes locally

```sh
npm run track --workspace @framediff/example-cv-motion-transfer -- /absolute/path/performance.mp4
```

The command runs MediaPipe entirely in local Chromium. It detects pose first, uses the pose to crop
and enlarge a small full-body face, then remaps 478-index facial contours into the original frame.
Only the 108 contour points used by the guide are retained; nulls preserve MediaPipe indices.
The default samples at 12 fps (`--stride 2`) and FrameDiff interpolates deterministically at 24 fps.
Use `--stride 1` when very fast blinks or mouth shapes matter more than artifact size.

The output is `src/data/performance.motion.json`, including the source SHA-256, normalized body
landmarks, selected face landmarks, and 52 blendshape scores. No source pixels are embedded.

### 2. Generate and pin temporal depth

```sh
npm run depth --workspace @framediff/example-cv-motion-transfer -- \
  /absolute/path/performance.mp4 \
  --look /absolute/path/fictional-target.png
```

This is an explicit paid action. It uploads the performance to `fal-ai/depth-anything-video`, runs
`VDA-Large` with grayscale output at 480p/24 fps, downloads the result, ingests every input/output
by content hash, and pins `DepthGuide.process.json` to the exact recipe fingerprint. At the current
fal price of $0.04 per input second, the four-second example costs about $0.16.

If depth was produced elsewhere, ingest it without a provider call:

```sh
npm run depth --workspace @framediff/example-cv-motion-transfer -- \
  /absolute/path/performance.mp4 \
  --look /absolute/path/fictional-target.png \
  --artifact /absolute/path/depth.mp4 \
  --model VDA-Small \
  --model-revision <checkpoint-or-code-revision>
```

`DepthGuide` and every composition that nests it fail closed if its artifact is missing, stale, or
not pinned. A paid downstream request cannot silently bake a processing slate.

### 3. Run matched Seedance experiments

Open one of `DepthTransfer`, `FaceTransfer`, `MocapTransfer`, or `HybridTransfer`, inspect the
resolved references, then click **Generate**. Navigation and preview never submit a paid request.
Each recipe uses Seedance 2.0 fast, 480p, 9:16, four seconds, no generated audio, and the same target
look; only `@Video1` changes. Each run is about $0.26 with FrameDiff's fitted fal token price, or
about $1.04 for all four. Pin an accepted take before using it in the comparison edit.

The repository does not include Seedance result takes: the configured validation account was out
of balance before any request was accepted. The recipes, exact processing-channel handoff, bake
preflight, and request construction are still covered by automated tests; rerun the four trials
after adding balance or using your own fal key.

## What to compare

| guide | strongest signal | likely weakness |
| --- | --- | --- |
| Depth | silhouette, volume, weight shift, camera, spatial blocking | eyes, brows, lips, small finger motion |
| Face | head pose, eyes, brows, mouth, blink timing | body mechanics and scene depth |
| Mocap | explicit joints plus facial contours | no surface volume; the generator may literalize neon geometry |
| Hybrid | depth volume plus disambiguating pose/face tracks | visually busy; prompt must reject guide appearance clearly |

Seedance is a generative model, not a deterministic retargeter. Prompt separation helps, but exact
joint angles, facial action units, contact, and timing are not guaranteed. When exact choreography
is required, keep the tracker data and final edit in FrameDiff rather than treating a generated take
as motion-capture ground truth.

## Privacy, likeness, and asset receipts

Use only performances you created, licensed, or obtained informed permission to process. Facial
landmarks and blendshapes are appearance-reduced, not automatically anonymous; treat them as
sensitive derived data, review retention requirements, and do not use this workflow to impersonate
a real person. Prefer fictional target looks and disclose generated media where appropriate.

- Bundled performance: first four seconds of [“Woman Dancing” by AI25.Studio Studio on Pexels](https://www.pexels.com/video/woman-dancing-7570272/), cropped to 720×1280 and resampled to 24 fps. Pexels labels it free to use under the [Pexels license](https://www.pexels.com/license/).
- Bundled target look: the fictional lighthouse keeper already generated and tracked by the
  `previz-to-gen` FrameDiff example; copied by identical SHA-256.
- Bundled depth: official Video Depth Anything Small code revision
  `4f5ae23172ba60fd7bc11ef671cca678842c7072`, checkpoint SHA-256
  `13379300b739e659f076a59d52e9801bd8d38c541a7e71f73bbca4dcfb013609`, CPU fp32,
  350-pixel inference size, grayscale H.264/yuv420p.

## Key files

| file | role |
| --- | --- |
| `src/data/performance.motion.json` | portable sparse pose, face, and blendshape artifact |
| `src/compositions/MotionGuides.ts` | reusable pose, face, and combined mocap compositions |
| `src/processing/DepthGuide.process.json` | pinned depth recipe, artifact, channels, and provenance |
| `src/compositions/HybridGuide.*` | nested depth with seek-safe tracking overlay |
| `src/gen/*.gen.json` | four matched Seedance 2.0 experiments |
| `scripts/extract-motion.mjs` | local MediaPipe extraction through Playwright |
| `scripts/prepare-depth.mjs` | fal execution or existing-artifact import and pinning |
