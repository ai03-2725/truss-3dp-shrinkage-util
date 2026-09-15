# Project plan:  
We will be building a webapp to simplify the usage around the Truss Calibrator.


# Context of the project:  

The Truss Calibrator is a 3D-printed utility to calibrate shrinkage ratios for 3D printer filaments.  
A beam-like object is printed by the user, then its length is measured with calipers to calculate the shrinkage ratio of the filament (measured value / designed value).  
A set of usage instructions for the utility and explanations as to how it works is located in ./README.md and the ./Documentation folder.  
Currently the user must follow the written documentation manually and do the math themselves; this webapp will simplify the process with automated calculations and a per-step flow.


# Tooling for the project:  

The webapp will be developed using solid.js as its framework. Currently no work has been done beyond creating a starter Vite project under `/truss-webui` and pasting a set of pre-designed styles to `/truss-webui/src/styles`.  
The app should be able to function alone when compiled; it is also planned to embed the solid.js app into a page of a larger website.
As such, the app should be able to function without relying on browser paths or routes.

Due to the site embedding requirement, the app should avoid using styled UI frameworks, ideally simply using standard HTML elements styled with the stylesheet under `/truss-webui/src/styles/global.css` which will be used for the parent website.  
If any additional styles are required, they should be added to the same `global.css` file if the styling is for a component which can be used on other projects, or in a separate `local.css` if the style is so specific to this one project that it cannot be reused elsewhere.


# Structure of the project:  
The webapp will have a landing page shown upon opening, then two buttons to either enter the calibration flow or to edit saved printer data.  
The calibration flow will be a set of pages through which the user navigates by reading/interacting with each page's contents and clicking the next button to proceed to the next step; a current draft of the contents of each step is available in `./flow-outline.md`.  
The edit saved printer data menu should show a list of all saved printers from the browser's local storage - specifically their names and their extrapolation factors (a numerical value, details in the usage instructions and in the flow outline document).  
Saved printers should be able to be added, modified, and deleted.  
The user is also able to export and import the list of saved printers (likely as a JSON file or similar).  