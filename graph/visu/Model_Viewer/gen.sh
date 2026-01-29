#!/bin/bash

GLTF_FILE="$1"
IMG_FILE="$2"
OUTPUT="ModelResourceData.js"

if [ -z "$GLTF_FILE" ] || [ -z "$IMG_FILE" ]; then
  echo "Usage: $0 model.bin image.png"
  exit 1
fi

GLTF_NAME=$(basename "$GLTF_FILE")
IMG_NAME=$(basename "$IMG_FILE")

GLTF_B64=$(base64 -w 0 "$GLTF_FILE")
IMG_B64=$(base64 -w 0 "$IMG_FILE")

cat > "$OUTPUT" <<EOF
// Container for additional model resources (Buffers and Images)
window.modelResources = {
    buffers: {
        "$GLTF_NAME": "$GLTF_B64"
    },
    images: {
        "$IMG_NAME": "$IMG_B64"
    }
};

// Helper to confirm it's loaded
console.log("ModelResourceData loaded.");
EOF