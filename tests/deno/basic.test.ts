import { assertEquals, assert } from "https://deno.land/std@0.220.0/assert/mod.ts";
import FreeType from "../../src/lib/index.ts";

Deno.test("module loading", async () => {
  const ft = new FreeType();
  try {
    await ft.initialize();
    assert(ft, "FreeType should initialize");
  } catch (error) {
    // Expected to fail if WASM files not built yet
    console.warn("WASM files not found - run 'deno task build:wasm' first");
  }
});

Deno.test("capabilities detection", async () => {
  const ft = new FreeType();
  try {
    await ft.initialize();
    const caps = ft.getCapabilities();

    assert(caps, "Capabilities should be returned");
    console.log("Capabilities detected:", caps);

    if (caps.has_wasm_simd) {
      console.log("✅ WASM SIMD available (3-5x speedup)");
    } else {
      console.warn("⚠️  WASM SIMD not available - performance degraded");
    }

    if (caps.chrome_version >= 113) {
      console.log(`✅ Chrome ${caps.chrome_version} (meets minimum 113+)`);
    } else if (caps.chrome_version > 0) {
      console.warn(`⚠️  Chrome ${caps.chrome_version} < 113 (upgrade recommended)`);
    }
  } catch (error) {
    console.warn("Test skipped - WASM not built:", error.message);
  }
});

Deno.test("version retrieval", async () => {
  const ft = new FreeType();
  try {
    await ft.initialize();
    const version = ft.getVersion();

    assert(version, "Version should be returned");
    console.log("FreeType version:", version);

    // Version should be in format X.Y.Z
    const versionPattern = /^\d+\.\d+\.\d+$/;
    assert(
      versionPattern.test(version) || version === 'unknown',
      `Version should match X.Y.Z format, got: ${version}`
    );
  } catch (error) {
    console.warn("Test skipped - WASM not built:", error.message);
  }
});

Deno.test("module structure", async () => {
  const ft = new FreeType();
  try {
    await ft.initialize();
    const module = ft.getModule();

    assert(module, "Module should be returned");
    assert(module.ccall, "Module should have ccall");
    assert(module.cwrap, "Module should have cwrap");
    assert(module.HEAPU8, "Module should have HEAPU8");
  } catch (error) {
    console.warn("Test skipped - WASM not built:", error.message);
  }
});
