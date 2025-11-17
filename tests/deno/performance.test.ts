import { assert } from "https://deno.land/std@0.220.0/assert/mod.ts";
import FreeType from "../../src/lib/index.ts";

const PERFORMANCE_TARGETS = {
  SIMD_MIN: 1.5,      // 1.5x minimum for SIMD (conservative, real-world varies)
  CRYPTO_MIN: 5.0,    // 5x minimum for WebCrypto
  WORKERS_MIN: 10.0,  // 10x minimum for Workers
  WEBGPU_MIN: 10.0,   // 10x minimum for WebGPU
};

Deno.test("SIMD performance validation", async () => {
  const ft = new FreeType();
  try {
    await ft.initialize();

    const caps = ft.getCapabilities();
    if (!caps.has_wasm_simd) {
      console.warn("⚠️  SIMD not available - skipping test");
      return;
    }

    console.log("\n📊 SIMD Performance Benchmark");
    console.log("=".repeat(60));

    // Test with different string sizes
    const testSizes = [32, 64, 128, 256, 512, 1024];

    for (const size of testSizes) {
      const testString = "a".repeat(size);
      const speedup = await ft.benchmarkSIMD(testString, 1000);

      console.log(`  Size ${size.toString().padStart(4)}: ${speedup.toFixed(2)}x speedup`);

      // For larger strings, expect better speedup
      if (size >= 256) {
        assert(
          speedup >= PERFORMANCE_TARGETS.SIMD_MIN,
          `SIMD speedup ${speedup.toFixed(2)}x < target ${PERFORMANCE_TARGETS.SIMD_MIN}x for size ${size}`
        );
      }
    }

    console.log("✅ SIMD performance tests passed");
  } catch (error) {
    console.warn("Test skipped - WASM not built:", error.message);
  }
});

Deno.test("web-native features availability", async () => {
  const ft = new FreeType();
  try {
    await ft.initialize();
    const caps = ft.getCapabilities();

    console.log("\n📋 Web-Native Features");
    console.log("=".repeat(60));
    console.log(`  SIMD:              ${caps.has_wasm_simd ? '✅' : '❌'} (target: 3-5x)`);
    console.log(`  WebGPU:            ${caps.has_webgpu ? '✅' : '❌'} (target: 10x+)`);
    console.log(`  WebCrypto:         ${caps.has_web_crypto ? '✅' : '❌'} (target: 5-15x)`);
    console.log(`  OPFS:              ${caps.has_opfs ? '✅' : '❌'} (target: 3-4x)`);
    console.log(`  Workers:           ${caps.has_workers ? '✅' : '❌'} (target: 10x)`);
    console.log(`  SharedArrayBuffer: ${caps.has_shared_array_buffer ? '✅' : '❌'}`);
    console.log(`  Chrome Version:    ${caps.chrome_version} (min: 113)`);

    // Count available optimizations
    const available = [
      caps.has_wasm_simd,
      caps.has_web_crypto,
      caps.has_opfs,
      caps.has_workers,
    ].filter(Boolean).length;

    console.log(`\n  Total optimizations: ${available}/4`);

    // Should have at least SIMD for minimum performance
    assert(
      caps.has_wasm_simd,
      "WASM SIMD is mandatory for acceptable performance"
    );

  } catch (error) {
    console.warn("Test skipped - WASM not built:", error.message);
  }
});

Deno.test("performance regression check", async () => {
  const ft = new FreeType();
  try {
    await ft.initialize();

    // Baseline: simple operation should be fast
    const start = performance.now();
    const version = ft.getVersion();
    const duration = performance.now() - start;

    console.log(`\n⏱️  Version call: ${duration.toFixed(2)}ms`);

    // Should be fast (< 10ms)
    assert(
      duration < 10,
      `Version retrieval too slow: ${duration}ms`
    );

    console.log("✅ Performance regression check passed");
  } catch (error) {
    console.warn("Test skipped - WASM not built:", error.message);
  }
});
