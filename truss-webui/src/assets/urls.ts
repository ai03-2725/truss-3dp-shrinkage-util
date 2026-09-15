/**
 * Asset URL resolution (T11.3).
 *
 * **The one rule:** every URL is resolved against *this module's own URL*, never
 * the page or the domain root. The widget is embedded under an arbitrary
 * sub-path in a parent site (PRD §6.1), so `/assets/…` would 404 there — and it
 * would work perfectly in development, which is what makes it a build-time
 * requirement rather than a runtime hope.
 *
 * `new URL('./img/…', import.meta.url)` is the pattern Vite processes at build
 * time: it emits the file into the bundle and rewrites the reference relative to
 * the emitted script. Two consequences worth knowing:
 *
 * - The table below is **static on purpose**. A computed path (`./img/${name}`)
 *   is not processed by the build, so the emitted file would keep its hash-less
 *   source name and the reference would break in the bundled output.
 * - Nothing here is a root-absolute path, so the same build works standalone,
 *   under a sub-path, and from the dev server.
 *
 * The image entries are cross-checked against `assets.config.json` by test, which
 * is what stops a referenced image from silently failing to ship.
 */

/** Documentation figures, re-encoded by `pnpm assets:sync`. */
export const IMAGES = {
  caliperEnterTop: new URL('./img/caliper-enter-top.webp', import.meta.url).href,
  calipersIncorrectGap: new URL('./img/calipers-incorrect-gap.webp', import.meta.url).href,
  calipersIncorrectSide: new URL('./img/calipers-incorrect-side.webp', import.meta.url).href,
  finishedPrint: new URL('./img/finished-print.webp', import.meta.url).href,
  innerCorrect1: new URL('./img/inner-correct-1.webp', import.meta.url).href,
  innerCorrect2: new URL('./img/inner-correct-2.webp', import.meta.url).href,
  innerMeasurementSingle: new URL('./img/inner-measurement-single.webp', import.meta.url).href,
  innerMeasurementWalls: new URL('./img/inner-measurement-walls.webp', import.meta.url).href,
  outerMeasurementSingle: new URL('./img/outer-measurement-single.webp', import.meta.url).href,
  outerMeasurementWalls: new URL('./img/outer-measurement-walls.webp', import.meta.url).href,
  outerSeamExample: new URL('./img/outer-seam-example.webp', import.meta.url).href,
  printingQuad: new URL('./img/printing-quad.webp', import.meta.url).href,
  printingSingle: new URL('./img/printing-single.webp', import.meta.url).href,
  seamTool: new URL('./img/seam-tool.webp', import.meta.url).href,
  seamVisibility: new URL('./img/seam-visibility.webp', import.meta.url).href,
  shrinkageAdjust1: new URL('./img/shrinkage-adjust-1.webp', import.meta.url).href,
  shrinkageAdjust2: new URL('./img/shrinkage-adjust-2.webp', import.meta.url).href,
  singleMeasurementInner: new URL('./img/single-measurement-inner.webp', import.meta.url).href,
  singleMeasurementOuter: new URL('./img/single-measurement-outer.webp', import.meta.url).href,
  slicedSingle: new URL('./img/sliced-single.webp', import.meta.url).href,
  slicerLoaded: new URL('./img/slicer-loaded.webp', import.meta.url).href,
  trussQuad: new URL('./img/truss-quad.webp', import.meta.url).href,
  trussSingle: new URL('./img/truss-single.webp', import.meta.url).href,
  xBeam: new URL('./img/x-beam.webp', import.meta.url).href,
  xInnerDiagram: new URL('./img/x-inner-diagram.webp', import.meta.url).href,
  xInnerMeasurement: new URL('./img/x-inner-measurement.webp', import.meta.url).href,
  xOuterDiagram: new URL('./img/x-outer-diagram.webp', import.meta.url).href,
  xOuterMeasurement: new URL('./img/x-outer-measurement.webp', import.meta.url).href,
} as const

export type ImageKey = keyof typeof IMAGES

/** The two in-scope models. Dual is out of scope (PRD decision 12). */
export const STL = {
  quad: new URL('./stl/quad.stl', import.meta.url).href,
  single: new URL('./stl/single.stl', import.meta.url).href,
} as const

export type StlKey = keyof typeof STL

/** The filename a downloaded STL is offered under, matching the guides' names. */
export const STL_DOWNLOAD_NAMES: Readonly<Record<StlKey, string>> = {
  quad: 'Truss Calibration Beam Quad.stl',
  single: 'Truss Calibration Beam Single.stl',
}
