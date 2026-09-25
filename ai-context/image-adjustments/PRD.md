# Truss Calibrator Web App — Generated Guide Images

## Purpose and current state

The web app in `truss-webui/` currently commits resized copies of the guide images under `truss-webui/src/assets/images/`. The originals live in `Documentation/Images/`; the existing copies were downscaled to about 1100 px on their longest side and differ from the originals. This change makes the documentation originals the single source of truth for web-app images and makes generation repeatable instead of maintaining two sets of tracked files.

This PRD covers image assets only. Leave the documentation's own image references, STL downloads, app content, and calibration behavior unchanged.

## Required behavior

- Generate AVIF images from the source JPG/PNG files in `Documentation/Images/` that the web app uses. At present, `truss-webui/src/lib/assets.ts` imports 30 images; `Documentation/Images/truss-dual.png` is not used by the app and need not be generated. Do not convert non-image files such as `.DS_Store`.
- Encode each output as AVIF at quality **60/100**. Preserve the source aspect ratio and orientation. If the source's longest dimension exceeds **2560 px**, resize it so its longest dimension is **at most 2560 px**; otherwise retain its original dimensions. Never upscale. Generate an output with the source's basename and a `.avif` extension (for example, `caliper-enter-top.jpg` → `caliper-enter-top.avif`). Do not edit the originals.
- Write generated assets to a predictable location usable by Vite, but do **not** commit them. Remove the currently tracked JPG/PNG copies in `truss-webui/src/assets/images/` as part of the migration; ignore the generated outputs in git so a fresh clone regenerates them.
- If an output file already exists, skip that image without replacing or re-encoding it. Generate only missing outputs. The source files are treated as immutable for this workflow; changing conversion settings or sources requires deleting the affected outputs before regenerating them. A clean checkout must not depend on any pre-existing generated files.
- Provide an explicit image-generation package command and document it, including the embedding-host prerequisite, in `truss-webui/README.md`. Also run generation **before** the web app's `dev`, `build`, and `test` package scripts need the assets; a developer or CI runner should be able to install dependencies and invoke any of these scripts from a clean checkout without a separate manual generation step. A host that imports the app directly does **not** need automatic generation when it runs only its own build command; documenting the prerequisite is sufficient. If a required source cannot be read or an output cannot be produced, fail with a useful error rather than proceeding with missing images. Running the generation step a second time should leave existing outputs untouched.
- Change the app's image imports in `truss-webui/src/lib/assets.ts` to use generated `.avif` files without changing its exported `img` keys, image placement, or alt text. Keep using Vite-managed asset URLs so the built site still works at a nested URL and when the app is embedded in a host page. The generated AVIF files should be included in `dist/` by a production build; production runtime must not depend on access to `Documentation/Images/`.
- Retain support for the project's current Chrome, Firefox, Safari, and Edge targets (including current mobile Chrome and Safari). AVIF-only output is in scope; legacy-browser fallback formats are not required.

## Acceptance criteria

- From a clean checkout with dependencies installed and no generated images, each of `dev`, `build`, and `test` can be started without manually copying images. A host build that imports the app works after running the documented generation command. A production build resolves all image imports; both calibration flows show their images, including the enlarged/zoomed views, in standalone and embedded deployments.
- Every required output is AVIF encoded at quality 60, keeps the source orientation/aspect ratio, and has a longest dimension of no more than 2560 px (or its original dimensions if smaller). The diagrams and screenshots remain readable in the UI, including zoomed views.
- Repeating generation leaves existing output files unchanged and creates only missing ones. Removing a single output and rerunning generation recreates it. Missing/unreadable sources or conversion failures are reported rather than silently skipped.
- Git tracks the originals in `Documentation/Images/` but not the old web-app JPG/PNG copies or the new AVIF outputs. The documentation continues to display its original images, and the existing app flows, STL links, and image accessibility text remain intact.

## Build context

Development, CI, and embedded-app builds can assume the full repository is available, including `Documentation/Images/` alongside `truss-webui/`. Building `truss-webui/` from an isolated copy is not required. The deployed `dist/` output must still work without access to the source directory.
