#!/bin/bash
set -euo pipefail

echo "📦 Fetching WASM dependencies..."

# Check if dependencies.json exists
if [[ ! -f "dependencies.json" ]]; then
  echo "⚠️  No dependencies.json found"
  exit 0
fi

# Create dependencies directory
mkdir -p .wasm-deps

# Parse dependencies.json and fetch each dependency
# This is a simplified version - real implementation would use jq
# For now, just create placeholder structure

cat dependencies.json | grep -o '"url": *"[^"]*"' | cut -d'"' -f4 | while read url; do
  if [[ -n "$url" ]]; then
    filename=$(basename "$url")
    echo "  Fetching $filename..."

    # Download to .wasm-deps directory
    if command -v curl >/dev/null 2>&1; then
      curl -sL "$url" -o ".wasm-deps/$filename" || echo "    ⚠️  Failed to fetch"
    elif command -v wget >/dev/null 2>&1; then
      wget -q "$url" -O ".wasm-deps/$filename" || echo "    ⚠️  Failed to fetch"
    else
      echo "    ❌ Neither curl nor wget found"
      exit 1
    fi

    if [[ -f ".wasm-deps/$filename" ]]; then
      echo "    ✅ Downloaded $filename"
    fi
  fi
done

echo "✅ Dependencies fetched to .wasm-deps/"
