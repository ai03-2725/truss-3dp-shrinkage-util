// Bundler-imported asset URLs (PRD §16). Importing through Vite keeps paths
// base-path-safe for standalone and future embedded builds.
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
import slicedSingle from '../assets/img/sliced-single.png'
import slicerLoaded from '../assets/img/slicer-loaded.png'
import trussQuad from '../assets/img/truss-quad.png'
import trussSingle from '../assets/img/truss-single.png'
import xBeam from '../assets/img/x-beam.jpg'
import xInnerDiagram from '../assets/img/x-inner-diagram.png'
import xInnerMeasurement from '../assets/img/x-inner-measurement.jpg'
import xOuterDiagram from '../assets/img/x-outer-diagram.png'
import xOuterMeasurement from '../assets/img/x-outer-measurement.jpg'
import quadStl from '../assets/stl/truss-quad.stl?url'
import singleStl from '../assets/stl/truss-single.stl?url'

/** Every image referenced by the flows, keyed for reuse. */
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
  slicedSingle,
  slicerLoaded,
  trussQuad,
  trussSingle,
  xBeam,
  xInnerDiagram,
  xInnerMeasurement,
  xOuterDiagram,
  xOuterMeasurement,
} as const

export type ImageKey = keyof typeof images

/** Downloadable STL URLs. */
export const stl = {
  quad: quadStl,
  single: singleStl,
}

/** Meaningful alt text derived from each image's content and context (PRD §16). */
export const imageAlt: Record<ImageKey, string> = {
  caliperEnterTop:
    'Correct inner measurement: the caliper enters from the top of the print',
  calipersIncorrectGap:
    'Incorrect inner measurement: the caliper flats are not contacting the supportive walls, yielding a diagonal measurement',
  calipersIncorrectSide:
    'Incorrect inner measurement: the caliper is used from the bottom, so the slanted outer faces point at the supportive walls',
  finishedPrint:
    'A finished Truss calibrator print on the build plate with no warping',
  innerCorrect1:
    'Correct inner measurement: the flat inner sides are flush against the supportive walls',
  innerCorrect2:
    'Correct inner measurement: the flats stay flush against the supportive walls at both ends of the caliper',
  innerMeasurementSingle:
    'Diagram of the inner measurement between the two central walls of the Single beam',
  innerMeasurementWalls:
    'Preview highlighting the inner measurement wall surfaces in the slicer',
  outerMeasurementSingle:
    'Diagram of the outer measurement across the two outer walls of the Single beam',
  outerMeasurementWalls:
    'Preview highlighting the outer measurement wall surfaces in the slicer',
  outerSeamExample:
    'Slicer preview after relocating the seam away from the measurement surfaces',
  printPrepared: 'Slicer preview of the prepared beam ready to print',
  printingQuad: 'Printing the Quad beam on the printer build plate',
  printingSingle: 'Printing the Single beam on the printer build plate',
  seamTool: 'Using the slicer seam tool to relocate a seam',
  seamVisibility: 'Enabling seam visibility in the slicer preview',
  shrinkageAdjust1:
    'Locating the per-filament XY shrinkage compensation setting in the slicer',
  shrinkageAdjust2: 'Entering the calculated XY shrinkage value in the slicer',
  singleMeasurementInner:
    'Photo measuring the inner dimension of the Single beam with the caliper entering from the top',
  singleMeasurementOuter:
    'Photo measuring the outer dimension across the Single beam walls',
  slicedSingle:
    'Sliced Single beam in the slicer with seams kept off the measurement faces',
  slicerLoaded: 'The Quad STL loaded into the slicer before slicing',
  trussQuad:
    'The Quad Truss calibrator design with four beams labelled X, Y, A and B',
  trussSingle: 'The Single Truss calibrator design with one X beam',
  xBeam: 'The X beam on the printed Truss, marked with an X label',
  xInnerDiagram:
    'Diagram of the inner X measurement between the two central walls',
  xInnerMeasurement:
    'Photo measuring the inner X dimension with the caliper entering from the top',
  xOuterDiagram:
    'Diagram of the outer X measurement across the two outer walls',
  xOuterMeasurement:
    'Photo measuring the outer X dimension across the outer walls',
}
