#!/bin/bash
set -euo pipefail

BUILD_TYPE="${1:-standard}"
CLEAN="${CLEAN:-false}"
FETCH_ONLY="${FETCH_ONLY:-false}"

echo "🔨 Unified Build System for FreeType.wasm"
echo "Build Type: $BUILD_TYPE"
echo "=========================================="

# 1. Validate tools
echo "📋 Validating build tools..."
command -v emcc >/dev/null 2>&1 || { echo "❌ emcc not found. Install Emscripten SDK."; exit 1; }
command -v meson >/dev/null 2>&1 || { echo "❌ meson not found. Install: pip install meson"; exit 1; }
command -v ninja >/dev/null 2>&1 || { echo "❌ ninja not found. Install: pip install ninja"; exit 1; }

echo "✅ emcc: $(emcc --version | head -1)"
echo "✅ meson: $(meson --version)"
echo "✅ ninja: $(ninja --version)"

# 2. Clean if requested
if [[ "$CLEAN" == "true" ]]; then
  echo "🧹 Cleaning build artifacts..."
  rm -rf build build-* install
  echo "✅ Cleaned build artifacts"
fi

# 3. Fetch or build dependencies
if [[ -f "dependencies.json" ]]; then
  echo "📦 Fetching dependencies..."
  bash scripts/fetch-dependencies.sh || echo "⚠️  Dependency fetch failed, will build locally"
fi

if [[ "$FETCH_ONLY" == "true" ]]; then
  echo "✅ Dependencies fetched"
  exit 0
fi

# 4. Configure Meson
echo "⚙️  Configuring Meson build..."
BUILD_DIR="build-${BUILD_TYPE}"

if [[ ! -d "$BUILD_DIR" ]]; then
  meson setup "$BUILD_DIR" \
    --cross-file=scripts/emscripten.cross \
    --prefix="$(pwd)/install" \
    -Dlibdir=wasm \
    -Dbindir=wasm \
    -Ddefault_library=static \
    -Dbuildtype=release \
    -Dwasm_build_type="$BUILD_TYPE" \
    -Dzlib=disabled \
    -Dpng=disabled \
    -Dharfbuzz=disabled \
    -Dbrotli=disabled \
    -Dbzip2=disabled

  echo "✅ Meson configured"
else
  echo "ℹ️  Build directory exists, reconfiguring..."
  meson configure "$BUILD_DIR" \
    -Dwasm_build_type="$BUILD_TYPE"
fi

# 5. Build
echo "🔧 Building WASM modules..."
meson compile -C "$BUILD_DIR"
echo "✅ Build complete"

# 6. Install
echo "📦 Installing to install/wasm/..."
meson install -C "$BUILD_DIR"
echo "✅ Install complete"

# 7. Post-process with wasm-opt (if available)
if command -v wasm-opt >/dev/null 2>&1; then
  echo "⚡ Optimizing with wasm-opt..."
  for wasm_file in install/wasm/*.wasm; do
    if [[ -f "$wasm_file" ]]; then
      wasm-opt -O3 "$wasm_file" -o "$wasm_file.opt"
      mv "$wasm_file.opt" "$wasm_file"
      echo "  ✅ Optimized $(basename $wasm_file)"
    fi
  done
else
  echo "ℹ️  wasm-opt not found, skipping optimization"
fi

# 8. Generate manifest
echo "📄 Generating manifest..."
cat > install/wasm/manifest.json <<EOF
{
  "library": "freetype",
  "version": "$(git describe --tags --always 2>/dev/null || echo 'dev')",
  "buildType": "$BUILD_TYPE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": $(cd install/wasm && ls -1 *.wasm *.js 2>/dev/null | jq -R . | jq -s . 2>/dev/null || echo '[]')
}
EOF

echo "✅ Manifest generated"

# 9. Show results
echo ""
echo "=========================================="
echo "✅ Build complete: install/wasm/"
echo "=========================================="
ls -lh install/wasm/

# Show file sizes
echo ""
echo "📊 File sizes:"
for file in install/wasm/*.wasm install/wasm/*.js; do
  if [[ -f "$file" ]]; then
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    size_kb=$((size / 1024))
    echo "  $(basename $file): ${size_kb}KB"
  fi
done

echo ""
echo "🎉 Success! Run 'deno task demo' to test."
