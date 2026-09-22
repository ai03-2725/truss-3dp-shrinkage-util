// Bundler-imported asset URLs. Importing (rather than hardcoding absolute
// paths) keeps the build base-path-safe for future embedding. PRD §16.
import caliperEnterTop from '../assets/img/caliper-enter-top.jpg'
import calipersIncorrectGap from '../assets/img/calipers-incorrect-gap.jpg'
import calipersIncorrectSide from '../assets/img/calipers-incorrect-side.jpg'
import finishedPrint from '../assets/img/finished-print.jpg'
import innerCorrect1 from '../assets/img/inner-correct-1.jpg'
import innerCorrect2 from '../assets/img/inner-correct-2.jpg'
import innerMeasurementSingle from '../assets/img/inner-measurement-single.png'
import innerMeasurementWalls from '../assets/img/inner-measurement-walls.png'
import outerMeasurementSingle from '../assets/img/outer-measurement-single.png'
import outerMeasurementWalls from '../assets/img/outer-measurement-walls.png'
import outerSeamExample from '../assets/img/outer-seam-example.png'
import printPrepared from '../assets/img/print-prepared.png'
import printingQuad from '../assets/img/printing-quad.png'
import printingSingle from '../assets/img/printing-single.png'
import seamTool from '../assets/img/seam-tool.png'
import seamVisibility from '../assets/img/seam-visibility.png'
import shrinkageAdjust1 from '../assets/img/shrinkage-adjust-1.png'
import shrinkageAdjust2 from '../assets/img/shrinkage-adjust-2.png'
import singleMeasurementInner from '../assets/img/single-measurement-inner.jpg'
import singleMeasurementOuter from '../assets/img/single-measurement-outer.jpg'
import singlePrinted from '../assets/img/single-printed.jpg'
import slicedSingle from '../assets/img/sliced-single.png'
import slicerLoaded from '../assets/img/slicer-loaded.png'
import trussDual from '../assets/img/truss-dual.png'
import trussQuad from '../assets/img/truss-quad.png'
import trussSingle from '../assets/img/truss-single.png'
import xBeam from '../assets/img/x-beam.jpg'
import xInnerDiagram from '../assets/img/x-inner-diagram.png'
import xInnerMeasurement from '../assets/img/x-inner-measurement.jpg'
import xOuterDiagram from '../assets/img/x-outer-diagram.png'
import xOuterMeasurement from '../assets/img/x-outer-measurement.jpg'

export const images = {
  caliperEnterTop,
  calipersIncorrectGap,
  calipersIncorrectSide,
  finishedPrint,
  innerCorrect1,
  innerCorrect2,
  innerMeasurementSingle,
  innerMeasurementWalls,
  outerMeasurementSingle,
  outerMeasurementWalls,
  outerSeamExample,
  printPrepared,
  printingQuad,
  printingSingle,
  seamTool,
  seamVisibility,
  shrinkageAdjust1,
  shrinkageAdjust2,
  singleMeasurementInner,
  singleMeasurementOuter,
  singlePrinted,
  slicedSingle,
  slicerLoaded,
  trussDual,
  trussQuad,
  trussSingle,
  xBeam,
  xInnerDiagram,
  xInnerMeasurement,
  xOuterDiagram,
  xOuterMeasurement,
} as const

export type ImageKey = keyof typeof images

export const stl = {
  quad: new URL('../assets/stl/quad.stl', import.meta.url).href,
  single: new URL('../assets/stl/single.stl', import.meta.url).href,
  dual: new URL('../assets/stl/dual.stl', import.meta.url).href,
} as const

/** Meaningful alt text for every image, derived from its context. PRD §16. */
export const altText: Record<ImageKey, string> = {
  caliperEnterTop: 'Correct: the caliper enters the print from the top.',
  calipersIncorrectGap:
    'Incorrect: a gap between the caliper teeth and the support wall yields a diagonal measurement longer than the print.',
  calipersIncorrectSide:
    'Incorrect: the caliper is used from the bottom, with its slanted teeth facing the support walls.',
  finishedPrint: 'A finished Quad Truss print removed from the build plate.',
  innerCorrect1:
    "Correct: the caliper's flat inner sides are flush against the support walls.",
  innerCorrect2:
    'Correct: the caliper is flush against the walls on both ends.',
  innerMeasurementSingle:
    'Diagram of the inner measurement on the Single beam.',
  innerMeasurementWalls:
    'Slicer preview highlighting the inner walls used for measurement on the Quad beam.',
  outerMeasurementSingle:
    'Diagram of the outer measurement on the Single beam.',
  outerMeasurementWalls:
    'Slicer preview highlighting the outer walls used for measurement on the Quad beam.',
  outerSeamExample: 'A seam relocated away from the outer measurement surface.',
  printPrepared: 'A print prepared for removal from the build plate.',
  printingQuad: 'The Quad Truss being printed on the build plate.',
  printingSingle: 'The Single Truss being printed on the build plate.',
  seamTool: 'The slicer seam-painting tool used to relocate seams.',
  seamVisibility: 'Slicer preview with seam visibility enabled.',
  shrinkageAdjust1: "The filament's XY shrinkage setting in the slicer.",
  shrinkageAdjust2:
    'The XY shrinkage setting updated with the calculated value.',
  singleMeasurementInner:
    'Photo of calipers measuring the inner Single beam dimension.',
  singleMeasurementOuter:
    'Photo of calipers measuring the outer Single beam dimension.',
  singlePrinted: 'A finished Single beam print.',
  slicedSingle: 'The sliced Single beam previewed in the slicer.',
  slicerLoaded: 'The Quad Truss model loaded into a slicer before slicing.',
  trussDual: 'The Dual Truss calibrator design.',
  trussQuad: 'The Quad Truss calibrator design, with beams along both axes.',
  trussSingle: 'The Single Truss calibrator design, a single beam.',
  xBeam: 'The beam labelled X on the printed Quad Truss.',
  xInnerDiagram:
    "Diagram of the inner X dimension measured with the caliper's inner teeth.",
  xInnerMeasurement: 'Photo of calipers measuring the inner X dimension.',
  xOuterDiagram:
    "Diagram of the outer X dimension measured with the caliper's outer teeth.",
  xOuterMeasurement: 'Photo of calipers measuring the outer X dimension.',
}
