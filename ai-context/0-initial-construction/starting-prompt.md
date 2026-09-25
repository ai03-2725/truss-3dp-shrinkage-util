# Project plan:  
We will be building a webapp to simplify the usage around the Truss Calibrator.


# Context of the project:  

The Truss Calibrator is a 3D-printed utility to calibrate shrinkage ratios for 3D printer filaments.  
A beam-like object is printed by the user, then its length is measured with calipers to calculate the shrinkage ratio of the filament (measured value / designed value).  
A set of usage instructions for the utility and explanations as to how it works is located in ./README.md and the ./Documentation folder.  
Currently the user must follow the written documentation manually and do the math themselves; this webapp will simplify the process with automated calculations and a per-step flow.

The webapp will be developed using solid.js as its framework. Currently no work has been done beyond creating a starter Vite project under `/truss-webui` and pasting a set of pre-designed styles to `/truss-webui/src/styles`.  
Please see `./project-structure.md` for details on implementation.

The `/Documentation` folder contains the current usage instructions for the calibrator tool for using manually without a webapp.  

Please do not look at git history or other git branches within this repository.
