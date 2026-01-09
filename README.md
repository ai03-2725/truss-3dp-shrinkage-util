# Truss Shrinkage Calibrator
Extremely rapid filament shrinkage calibration for 3D printer filaments

![Cover image](./Documentation/Images/truss-single.png)

## Use it now
[Start here](./Documentation/0-Start-Here.md)

## About
The Truss shrinkage calibrator is a utility designed to calibrate shrinkage ratios for untested 3D printer filaments as quickly and efficiently as possible.  
Care has been taken to minimize filament waste, print time, and manual burden - calibration can be as short as a 10 minute print, under 2.5 grams of filament, and only two manual measurements after the first use.

## Implementation
The Truss calibrator achieves the above using the following:
- The Truss assumes that you have decent accurate calipers that do not deviate after a few measurements.  
- With this assumption, the Truss uses a "one-shot" long-distance measurement to accurately measure shrinkage in one go rather than relying on many small measurements.  
- The Truss uses long 140mm measurement distances for maximizing the use of common 150mm calipers.  
- A truss-structure beam (the namesake of the project) maximizes print rigidity over long measurement distances, allowing for accurate shrinkage measurements while minimizing filament use and print times.  
- Both inner-teeth and outer-teeth measurement points are carefully embedded into the structure to minimize measurement errors.  
- The truss focuses solely on shrinkage, optimizing for its speed while leaving other calibration to other tools.  
- A webapp is planned for giving immediate results based on measurements without needing to rely on manual math.  
- The above webapp will be focused on simplicity and ease of use.  

## Subsequent Extrapolation
The recommended first print is the Quad variant - this design has measurement points in 4 axies (X, Y, and two diagonals).  
Averaging the four measurements will yield an accurate shrinkage ratio; however, the differences in the 4 axies is dependent on the printer's skew rather than the filament, and will vary based on a set ratio.  
Therefore, if all four dimensions are measured once and the printer's skew does not change, the ratio can be used to extrapolate what all 4 dimensions (and their average) would be from a single axis measurement - allowing for predicting a more accurate shrinkage ratio from a single-dimension print.  

The truss calibrator uses this characteristic to allow subsequent calibrations after the first to be done using a single-beam design, extrapolating the remaining dimensions based on past results.  
This allows for an simulated 4-dimension calibration to be done from a single 10-minute 2.5g print.

The webapp will be designed to store the known values as well as allowing for export and import of such values for backup and restore.  

## Limitations
As the entire tool is made of walls and near-zero infill, there may be discrepancies between the shrinkage of the calibration tool and real-world prints if the infill shrinks at an aggressively different rate than the walls.  

## Todo
- Write the webapp portion to automate calculations

## Credits
The project builds upon the shoulders of giants - [Calistar](https://github.com/dirtdigger/fleur_de_cali) was the biggest inspiration for making this project, and its techniques such as indents to avoid measurement interference have been implemented in this design.  
While the Calistar focuses on versatility, measurement error correction, parametric variants, and multi-function capabilities, this design instead optimizes for speed.  