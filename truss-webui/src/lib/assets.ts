// Vite-managed asset URLs. Importing through the bundler (instead of /root paths)
// keeps downloads and images working at a nested URL and when embedded.
import quadStl from '../assets/truss-calibration-beam-quad.stl?url'
import singleStl from '../assets/truss-calibration-beam-single.stl?url'

import caliperEnterTop from '../assets/images/caliper-enter-top.jpg'
import calipersIncorrectGap from '../assets/images/calipers-incorrect-gap.jpg'
import calipersIncorrectSide from '../assets/images/calipers-incorrect-side.jpg'
import finishedPrint from '../assets/images/finished-print.jpg'
import innerCorrect1 from '../assets/images/inner-correct-1.jpg'
import innerCorrect2 from '../assets/images/inner-correct-2.jpg'
import innerMeasurementSingle from '../assets/images/inner-measurement-single.png'
import innerMeasurementWalls from '../assets/images/inner-measurement-walls.png'
import outerMeasurementSingle from '../assets/images/outer-measurement-single.png'
import outerMeasurementWalls from '../assets/images/outer-measurement-walls.png'
import outerSeamExample from '../assets/images/outer-seam-example.png'
import printPrepared from '../assets/images/print-prepared.png'
import printingQuad from '../assets/images/printing-quad.png'
import printingSingle from '../assets/images/printing-single.png'
import seamTool from '../assets/images/seam-tool.png'
import seamVisibility from '../assets/images/seam-visibility.png'
import shrinkageAdjust1 from '../assets/images/shrinkage-adjust-1.png'
import shrinkageAdjust2 from '../assets/images/shrinkage-adjust-2.png'
import singleMeasurementInner from '../assets/images/single-measurement-inner.jpg'
import singleMeasurementOuter from '../assets/images/single-measurement-outer.jpg'
import singlePrinted from '../assets/images/single-printed.jpg'
import slicedSingle from '../assets/images/sliced-single.png'
import slicerLoaded from '../assets/images/slicer-loaded.png'
import trussQuad from '../assets/images/truss-quad.png'
import trussSingle from '../assets/images/truss-single.png'
import xBeam from '../assets/images/x-beam.jpg'
import xInnerDiagram from '../assets/images/x-inner-diagram.png'
import xInnerMeasurement from '../assets/images/x-inner-measurement.jpg'
import xOuterDiagram from '../assets/images/x-outer-diagram.png'
import xOuterMeasurement from '../assets/images/x-outer-measurement.jpg'

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
