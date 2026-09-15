# Step 1 - Calibrating filament shrinkage using the Quad design

1. Make sure your filament has   
    1. Temperature settings  
    Personally I find that using the manufacturer's recommended settings is usually enough; the subsequent calibrations will usually make evident any issues.  
    If printing a temperature tower, breaking it to determine layer adhesion is strongly recommended.  
    2. Pressure Advance/Flow Dynamics  
    This can be done from Orca's built in calibration utilities (File -> New project, then Calibration -> Pressure advance) or from Bambu Studio's calibration page (Calibration -> Flow dynamics).  
    Make sure the chosen setting is applied properly to the printer (for example, Bambus may need selecting the K value from Device -> Filament, Klipper may need a per-filament startup macro for assigning the value).  
    3. Flow rate  
    This can also be done from Orca's built in calibration utilities (File -> New project, then Calibration -> Flow rate) or from Bambu Studio's calibration page (Calibration -> Flow rate).  
    I personally recommend using Orca's built-in "YOLO single-pass" for this calibration.  
    If using Bambu Studio's built-in flow rate calibration, make sure to select the *higher value* if torn between two chips on the first pass - the second pass only tests values under the first.  

2. Download the Quad STL file from [here](/Truss%20Calibration%20Beam%20Quad.stl).
    ![Quad design](./Images/truss-quad.png)
3. Load it into a modern slicer of your preference - this guide will cover OrcaSlicer/Bambu Studio.  
4. Slice it with settings which will print accurately and reliably (i.e. no warping, curling, extreme dimensional inaccuracy from overspeed, etc.)  
    ![Slicer loaded](./Images/slicer-loaded.png)
5. In the preview, make sure seams are not placed on the measurement surfaces.  
    - These walls for outer measurements:  
    ![Outer surfaces](./Images/outer-measurement-walls.png)  
    - These walls for inner measurements:  
    ![Inner surfaces](./Images/inner-measurement-walls.png)  
    In Orca/Bambu, you may need to enable seam visibility in the preview screen.
    ![Seam visibility](./Images/seam-visibility.png)
    If the slicer generated seams on those surfaces, the protrusion of the seams may interfere with measurement; relocate them using the seam tool to elsewhere.  
    ![Seam tool](./Images/seam-tool.png)  
    ![Seam relocation](./Images/outer-seam-example.png)  
6. Print the file.
  ![Printing](./Images/printing-quad.png)
7. Once printed, **do not force the print off the build plate** - this may warp the print and render measurements meaningless.  
  Wait for the print to fully cool, then remove it from the build plate; do not measure the print while it is attached to a build plate.  
  ![Finished print](./Images/finished-print.jpg)
8. Locate the X-beam along the X axis - this is marked with a X label on the print.  
  The letters were enlarged from this prototype stage; production prints should be much easier to read.
  ![X beam](./Images/x-beam.jpg)
9. Measure the X dimensions.  
  
    Before measuring, please note the following two warnings:
    1. **Do not apply excess force to the print with your calipers.**  
      The Truss is designed to resist such abuse as much as possible, but 3D printed plastics are elastic - applying excess force will deform the print and yield dimensions larger or smaller than actually printed.  
      Ideally the calipers should be exerting no expansive/compressive force on the print whatsoever - I personally let go of the clamping side entirely to achieve this, letting the print push the calipers back if necessary.  
      If your calipers have thumb-wheel rollers, do not use them to exert excess force during measurement.  
    
    2. Measure with the calipers parallel to the dimension you are measuring - excessively angled calipers will fail to measure the dimension correctly.

    Measure the following dimensions across the X beam:
    - Across these two walls using the outer measurement teeth of your calipers  
      ![X outer diagram](./Images/x-outer-diagram.png)
      ![X outer photo](./Images/x-outer-measurement.jpg)
    - Within these two walls using the inner measurement teeth of your calipers  
      ![X inner diagram](./Images/x-inner-diagram.png)
      ![X inner photo](./Images/x-inner-measurement.jpg)
      **Warning:** The file is designed to guide your calipers' inner teeth as accurately as possible, but only when oriented correctly.  
      View the below examples before measuring - **measuring incorrectly will yield incorrect, meaningless values.**  

      **Correct:** 
      - The caliper enters from the top of the print  
      ![Top entry](./Images/caliper-enter-top.jpg)

      - The flat inner sides of the caliper are flush against the supportive walls of the print located halfway across the beam  
      ![Correct inner measurement 1](./Images/inner-correct-1.jpg)
      
      - The above is true for both ends of the caliper  
      ![Correct inner measurement 2](./Images/inner-correct-2.jpg)

  
      **Incorrect:**
      - The calipers' inner flat sides are not making contact against the supportive walls - this will yield a diagonal measurement longer than what is printed
      ![Incorrect measurement - gap](./Images/calipers-incorrect-gap.jpg)

      - The calipers are being used from the bottom of the print - the slanted diagonal/outer sides of the caliper teeth should never face the supportive walls in the middle
      ![Incorrect measurement - wrong side](./Images/calipers-incorrect-side.jpg)

    Note these two values down - on a text editor or whatnot if manually calibrating, into the webapp once it goes live in the future.  

10. Repeat the two inner/outer measurements for all 4 axies.
    Note down the values, making sure to not mix them up (X/Y/A/B).

11. If calibrating manually, do the following:
    1. Take an average of all 8 measured values (inner/outer of X/Y/A/B beams) - add them all up, divide by 8. Note this total average down.  
    2. Divide this average value by 140 (the designed length in millimeters of the beams). The resulting value (say somewhere in the 0.95~0.99 range) is the shrinkage value of the filament.  
    3. Use this value to adjust the filament's X/Y shrinkage compensation.  
        For Orca/Bambu, edit the filament's settings, and locate the XY shrinkage option.  
        ![XY shrinkage setting](./Images/shrinkage-adjust-1.png)  
        Then, multiply the existing value by the obtained shrinkage value.  
        Say the obtained shrinkage value was 0.987 - in this case the existing value is 100%, so 100% * 0.987 would be 98.7%.  
        ![XY shrinkage adjusted](./Images/shrinkage-adjust-2.png)  

12. Now calibrate the printer's 4-axis extrapolation factor.
    1. Take an average of just the two X measurements (inner/outer) - add the two values and divide by 2. Note down this X average.  
    2. Divide the total average of all 8 values obtained in the first bit of the step below by this new X average. The resulting value should be somewhere close to 1.  
    3. Note this value down - this is the X to 4-axis extrapolation factor for the printer.  

    From now on, you can print just the single X axis beam to save time, then multiply its average measured value by this printer extrapolation factor to estimate what the average would be if a quad-beam Truss were printed.  
    This allows for estimating a more accurate shrinkage from a fast print in the future.  
      
    **Note:** This only works if the skew of the printer remains consistent.  
    If using this technique, do not adjust skew settings; if the skew changes, reprint a quad Truss and recalculate the extrapolation factor as necessary.  
    In addition, this value is printer-specific.

