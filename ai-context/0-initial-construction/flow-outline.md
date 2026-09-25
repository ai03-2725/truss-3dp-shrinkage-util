# Flow overview  
This is loosely based on the usage instructions in `/Documentation`.  

- First, the user begins at a page to pick between the two calibration flows:
  Specifically, the user is asked whether this is the first time using the Truss Calibrator on the 3D printer they will be using to perform calibration.  
  - If the user selected yes, the user is sent to the first-time calibration flow (described separately below)  
  - If the user selected no, the user is sent to the quick calibration flow (described separately below)  
  
## The first-time calibration flow  
In this flow, the user is now guided along the instructions in `/Documentation/1-Quad-Calibration.md`.    
a. First, the user is asked whether they have the prequisites outlined in `/Documentation/0-Start-Here.md`:  
  - A decent modern pair of digital calipers,   
  - A functional, calibrated modern printer, and   
  - A modern slicer.  
  There should be a checkbox next to each of these requirements; once the user checks all values, the user may proceed to the next step by clicking a button.  
  In addition, there should be a checkbox for "Don't ask again" which is checkable once the above requirements are met; if checked, the option is saved in the browser's local storage, and this step is skipped on subsequent runs of this calibration flow.  
a. The user is asked whether they have completed prerequisite filament tuning (step 1 of the instructions file):  
  - Temperature settings  
  - Pressure Advance/Flow Dynamics  
  - Flow Rate  
  A checkbox should be shown next to each requirement; the user may click a button to continue to the next step once they have checked each requirement.  
b. The user is asked to slice the Quad Beam file in their slicer of choice.  
  A button is shown to download the applicable file (`/Truss Calibration Beam Quad.stl`) if the user doesn't already have it.  
  The information and images from steps 3 to 5 of the instructions file should be shown.    
  The user may proceed by clicking a button.  
c. The user is asked to print the sliced data.  
  The information and images from steps 6 to 7 of the instructions file should be shown.    
  The user may proceed by clicking a button.  
d. The user is asked to locate the X-beam.  
  The information and images from step 8 of the instructions file should be shown.  
  The user may proceed by clicking a button.  
e. The user is asked to measure the X-beam.  
  The information and images from step 9 of the instructions file should be shown.  
  However, instead of the `Note these two values down` section at the end of step 9, the user should be able to enter the measured dimension into two numerical textboxes (for outer and inner dimensions).  
  Once entered, the value is stored in the root component and the user may click a button to proceed to the next step.  
  The app should warn the user if the dimensions are very far from expected ranges (less than 135mm, larger than 142mm), but should not prevent the user from continuing.  
f. The user is asked to measure the remaining 3 axes - Y, A, and B (step 10 of the instructions file).  
  The user should be shown two numerical inputs for each axis (for outer and inner dimensions) to input their measured values.  
  Once entered, the value is stored in the root component and the user may click a button to proceed to the next step.  
  The app should warn the user if the dimensions are very far from expected ranges (less than 135mm, larger than 142mm), but should not prevent the user from continuing.  
g. The webapp calculates the 4-axis extrapolation factor for the printer in use (roughly matching step 12 of the instructions file).  
  This value is obtained by the formula ((the average of all 8 axis lengths entered in steps e and f) / (the average of just the two X beam measurements)).  
  The user is asked to give a name to this printer via a textbox to save this value; this value is checked for duplicates against the list of currently saved printers in the root component's memory; if duplicate, the user may not continue.
  Once a valid non-duplicate name is entered, the user may press a button to continue; clicking this button also updates the root component's printer list with the new printer (which in turn should automatically save to the browser's localstorage).  
g. The webapp calculates the shrinkage compensation value for the user.  
  The eight total measured values given in steps e and f should be averaged together, then divided by 140 (the designed length of the beam in millimeters).  
  This value should be shown to the user as a numerical value (truncated to 5 decimal places after the dot).  
  The user is then asked to locate the XY shrinkage option for the filament in use (the first half of step 11.3), then asked to enter the current value into a textbox (defaults to 100[%] which is the default for most slicers).  
  A new shrinkage percentage value is calculated by multiplying this entered value with the calculated shrinkage compensation value.  
  The user is shown details on how to enter this value (second half of step 11.3 of the instructions file)  
  A finish button at the bottom allows the user to leave the calibration and return to the app's home screen.  
  As the previous page saves the printer details when navigating, the user should not be allowed to move back from this screen to the previous step.
  
## The quick calibration flow  
In this flow, the user is now guided along the instructions in `/Documentation/2-Single-Calibration.md`.    
a. The user is asked to select the printer which they will be using.  
  This is a list of all of the printers which have been saved through the first-time calibration flow saved in the browser's local storage; this should be already loaded in memory by the parent component.  
  The user may click a button to proceed to the next step once they have selected the printer to use.  
b. The user is asked whether they have completed prerequisite filament tuning (step 1 of the instructions file):  
  - Temperature settings  
  - Pressure Advance/Flow Dynamics  
  - Flow Rate  
  A checkbox should be shown next to each requirement; the user may click a button to continue to the next step once they have checked each requirement.  
c. The user is asked to slice the Single Beam file in their slicer of choice.  
  A button is shown to download the applicable file (`/Truss Calibration Beam Single.stl`) if the user doesn't already have it.  
  The information and images from step 3 of the instructions file should be shown.    
  The user may proceed to the next step by pressing a button to confirm that they have sliced the file as required.  
d. The user is asked to print the sliced data.  
  The information and images from steps 4 to 5 of the instructions file should be shown.    
  The user may proceed by clicking a button.  
e. The user is asked to measure the beam.  
  The information and images from step 6 of the instructions file should be shown.  
  However, instead of the `Note these two values down` section at the end of step 6, the user should be able to enter the measured dimension into two numerical textboxes (for outer and inner dimensions).  
  Once entered, the value is stored in the root component and the user may click a button to proceed to the next step.  
f. The webapp calculates the extrapolated shrinkage compensation value for the user.  
  First, the two given measurement values from step e are averaged, then divided by 140 (the designed length of the beam in millimeters) to yield the shhrinkage compensation value of just the single beam alone.    
  Then, this calculated value is multiplied by the saved extrapolation factor for the selected printer, yielding an extrapolated value of what the compensation factor would be for a 4-beam print.  
  This final extrapolated value should be shown to the user as a numerical value (truncated to 5 decimal places after the dot).
  The user is then asked to locate the XY shrinkage option for the filament in use (the first half of step 7.4), then asked to enter the current value into a textbox (defaults to 100[%] which is the default for most slicers).  
  A new shrinkage percentage value is calculated by multiplying this entered value with the extrapolated shrinkage compensation value.  
  The user is shown details on how to enter this value (second half of step 7.4 of the instructions file)  
  A finish button at the bottom allows the user to leave the calibration and return to the app's home screen.  