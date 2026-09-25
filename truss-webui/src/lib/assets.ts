// Vite-managed asset URLs. Importing through the bundler (instead of /root paths)
// keeps downloads and images working at a nested URL and when embedded.
import quadStl from '../assets/truss-calibration-beam-quad.stl?url'
import singleStl from '../assets/truss-calibration-beam-single.stl?url'

import caliperEnterTop from '../assets/images/caliper-enter-top.avif'
import calipersIncorrectGap from '../assets/images/calipers-incorrect-gap.avif'
import calipersIncorrectSide from '../assets/images/calipers-incorrect-side.avif'
import finishedPrint from '../assets/images/finished-print.avif'
import innerCorrect1 from '../assets/images/inner-correct-1.avif'
import innerCorrect2 from '../assets/images/inner-correct-2.avif'
import innerMeasurementSingle from '../assets/images/inner-measurement-single.avif'
import innerMeasurementWalls from '../assets/images/inner-measurement-walls.avif'
import outerMeasurementSingle from '../assets/images/outer-measurement-single.avif'
import outerMeasurementWalls from '../assets/images/outer-measurement-walls.avif'
import outerSeamExample from '../assets/images/outer-seam-example.avif'
import printPrepared from '../assets/images/print-prepared.avif'
import printingQuad from '../assets/images/printing-quad.avif'
import printingSingle from '../assets/images/printing-single.avif'
import seamTool from '../assets/images/seam-tool.avif'
import seamVisibility from '../assets/images/seam-visibility.avif'
import shrinkageAdjust1 from '../assets/images/shrinkage-adjust-1.avif'
import shrinkageAdjust2 from '../assets/images/shrinkage-adjust-2.avif'
import singleMeasurementInner from '../assets/images/single-measurement-inner.avif'
import singleMeasurementOuter from '../assets/images/single-measurement-outer.avif'
import singlePrinted from '../assets/images/single-printed.avif'
import slicedSingle from '../assets/images/sliced-single.avif'
import slicerLoaded from '../assets/images/slicer-loaded.avif'
import trussQuad from '../assets/images/truss-quad.avif'
import trussSingle from '../assets/images/truss-single.avif'
import xBeam from '../assets/images/x-beam.avif'
import xInnerDiagram from '../assets/images/x-inner-diagram.avif'
import xInnerMeasurement from '../assets/images/x-inner-measurement.avif'
import xOuterDiagram from '../assets/images/x-outer-diagram.avif'
import xOuterMeasurement from '../assets/images/x-outer-measurement.avif'

export const stl = { quad: quadStl, single: singleStl }

export const img = {
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
  trussQuad,
  trussSingle,
  xBeam,
  xInnerDiagram,
  xInnerMeasurement,
  xOuterDiagram,
  xOuterMeasurement,
}
