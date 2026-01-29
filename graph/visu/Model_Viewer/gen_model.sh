#!/bin/bash

# Arguments
GLTF_FILE="$1"
OUTPUT="ModelData.js"

# Check if file provided
if [ -z "$GLTF_FILE" ]; then
  echo "Usage: $0 model.gltf"
  exit 1
fi

# Check if file exists
if [ ! -f "$GLTF_FILE" ]; then
    echo "Error: File '$GLTF_FILE' not found."
    exit 1
fi

# Encode Content
GLTF_B64=$(base64 -w 0 "$GLTF_FILE")

# Write to ModelData.js
cat > "$OUTPUT" <<EOF
/*
ModelData.js
Auto-generated Base64 encoded GLTF data.
Generated from: $GLTF_FILE
*/

window.gltfModelData = "$GLTF_B64";

// Helper to confirm loading
console.log("ModelData.js loaded.");
EOF

echo "Successfully generated $OUTPUT from $GLTF_FILE"
