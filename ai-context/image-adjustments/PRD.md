# Truss Calibrator Web App — Image Adjustments 

## Context
The current webapp (`/truss-webui`) maintains a separate copy of images for its own use in `/truss-webui/src/assets/images`; these images are derived from the original source images in `/Documentation/Images`.  
However, these images seem to be manually created with no means to adjust their compression behavior and settings; this also results in duplicated assets within the git repository.  

# Goals
Adjust this current structure so that instead the images used by the webapp are generated as necessary from the source.
- The images should be compressed with the following settings:
  - Format: AVIF
  - Compression quality: 60 (out of 100)
  - Resize: Downsize so that the largest dimension is 2560 pixels; don't resize if already smaller
- The images should be generated before they are required - for example when running the `package.json` dev or test scripts.
- Each image should not be re-generated if the output file already exists - the source images will not be modified in the future.  
- The generated images should not be checked into the git repo; the source images should be the source of truth.  
