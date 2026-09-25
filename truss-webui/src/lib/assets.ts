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
import innerMeasurementSingle from '../assets/images/inner-measurement-single.jpg'
import innerMeasurementWalls from '../assets/images/inner-measurement-walls.jpg'
import outerMeasurementSingle from '../assets/images/outer-measurement-single.jpg'
import outerMeasurementWalls from '../assets/images/outer-measurement-walls.jpg'
import outerSeamExample from '../assets/images/outer-seam-example.jpg'
import outerSeamExampleJa from '../assets/images/outer-seam-example-ja.jpg'
import printPrepared from '../assets/images/print-prepared.jpg'
import printingQuad from '../assets/images/printing-quad.jpg'
import printingSingle from '../assets/images/printing-single.jpg'
import seamTool from '../assets/images/seam-tool.jpg'
import seamToolJa from '../assets/images/seam-tool-ja.jpg'
import seamVisibility from '../assets/images/seam-visibility.jpg'
import seamVisibilityJa from '../assets/images/seam-visibility-ja.jpg'
import shrinkageAdjust1 from '../assets/images/shrinkage-adjust-1.jpg'
import shrinkageAdjust1JaOrca from '../assets/images/shrinkage-adjust-1-ja-orca.jpg'
import shrinkageAdjust1JaBambu from '../assets/images/shrinkage-adjust-1-ja-bambu.jpg'
import shrinkageAdjust2 from '../assets/images/shrinkage-adjust-2.jpg'
import shrinkageAdjust2JaOrca from '../assets/images/shrinkage-adjust-2-ja-orca.jpg'
import shrinkageAdjust2JaBambu from '../assets/images/shrinkage-adjust-2-ja-bambu.jpg'
import singleMeasurementInner from '../assets/images/single-measurement-inner.jpg'
import singleMeasurementOuter from '../assets/images/single-measurement-outer.jpg'
import singlePrinted from '../assets/images/single-printed.jpg'
import slicedSingle from '../assets/images/sliced-single.jpg'
import slicerLoaded from '../assets/images/slicer-loaded.jpg'
import trussQuad from '../assets/images/truss-quad.jpg'
import trussSingle from '../assets/images/truss-single.jpg'
import xBeam from '../assets/images/x-beam.jpg'
import xInnerDiagram from '../assets/images/x-inner-diagram.jpg'
import xInnerMeasurement from '../assets/images/x-inner-measurement.jpg'
import xOuterDiagram from '../assets/images/x-outer-diagram.jpg'
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
  outerSeamExampleJa,
  printPrepared,
  printingQuad,
  printingSingle,
  seamTool,
  seamToolJa,
  seamVisibility,
  seamVisibilityJa,
  shrinkageAdjust1,
  shrinkageAdjust1JaOrca,
  shrinkageAdjust1JaBambu,
  shrinkageAdjust2,
  shrinkageAdjust2JaOrca,
  shrinkageAdjust2JaBambu,
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
