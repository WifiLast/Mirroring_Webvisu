#!/bin/bash

# First argument is the GLTF binary (.bin)
BIN_FILE="$1"
OUTPUT="ModelResourceData.js"

if [ -z "$BIN_FILE" ]; then
  echo "Usage: $0 model.bin image1.png [image2.png ...]"
  exit 1
fi

BIN_NAME=$(basename "$BIN_FILE")
BIN_B64=$(base64 -w 0 "$BIN_FILE")

# Start writing the file
cat > "$OUTPUT" <<EOF
// Container for additional model resources (Buffers and Images)
window.modelResources = {
    buffers: {
        "$BIN_NAME": "$BIN_B64"
    },
    images: {
EOF

# Shift to process remaining arguments as images
shift

# Loop through all provided image files
FIRST=true
for IMG_FILE in "$@"; do
    if [ ! -f "$IMG_FILE" ]; then
        echo "Warning: Image file '$IMG_FILE' not found, skipping."
        continue
    fi
    
    IMG_NAME=$(basename "$IMG_FILE")
    IMG_B64=$(base64 -w 0 "$IMG_FILE")
    
    # Add comma if not the first item (JSON format)
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo "," >> "$OUTPUT"
    fi
    
    echo "        \"$IMG_NAME\": \"$IMG_B64\"" >> "$OUTPUT"
done

# Close the JSON structure
cat >> "$OUTPUT" <<EOF

    }
};

// Helper to confirm it's loaded
console.log("ModelResourceData loaded.");
EOF

echo "Successfully generated $OUTPUT"