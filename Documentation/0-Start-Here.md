# Step 0 - Start here

Thank you for choosing to use the Truss calibrator.
I've done my best to make it as straightforward to use as possible - please read through the following to make sure you use it properly.

## Prerequisites - The three things you need

1. A decent modern pair of digital calipers.  
    The calipers must be capable of the following:  
    1. Measuring a **140mm wide object** (i.e. have a max measurable dimension of 150mm or wider).  
    1. Measuring a few dimensions **without any drift or error**.  
       A quick way to check is to measure a rigid object wider than 100mm around 10 times, returning the jaws to 0 between each attempt.  
       After each measurement, closing the jaws should yield a value of 0.00mm.  
       If it does not, keep in mind the number of consecutive times it was able to measure accurately, and calibrate its zero-point before reaching that quantity of consecutive measurements.  

    If you need such calipers, I highly recommend buying a genuine Mitsutoyo pair - they are expensive, but are extremely accurate, are built to last, and yield benefit across various aspects of 3D printing and design.  
      
2. A functional, calibrated modern printer.  
    Something like a **modern Bambu or equivalent** should do.  
    - If using a DIY/self-built printer, make sure that **all motion is properly calibrated** (i.e. rotation distance and similar).  
    - If using a Klipper-based printer, you will want to **calibrate skew correction first** - this can be done using the official guide located [here](https://www.klipper3d.org/Skew_Correction.html).  
    - The printer should be able to print the filament you wish to calibrate without warping, curling, or otherwise deforming.  
    - The printer must have a build plate size of at minimum 150x150mm.  

3. A modern slicer.  
    - The slicer should be able of slicing the provided Truss calibrators for accurate, reliable printing.
    - The slicer should ideally expose a per-filament XY shrinkage setting which can be used to correct for shrinkage based on the calibrator's results.  
    At the time of writing, OrcaSlicer, Bambu Studio, SuperSlicer, and Cura are some examples which provide this setting.  

## Notes
This guide will cover OrcaSlicer/Bambu Studio - for other slicers, please adjust the contents as necessary.  

## Next step
Once you are ready, proceed to the [first calibration using the Quad design](./1-Quad-Calibration.md).  
After the first Quad calibration, you may be interested in the rapid [single-beam calibration](./2-Single-Calibration.md).  