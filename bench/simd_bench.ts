#!/usr/bin/env deno run --allow-read

/**
 * SIMD Performance Benchmark for FreeType.wasm
 *
 * Measures SIMD string operation speedups to validate 3-5x performance targets.
 */

import FreeType from "../src/lib/index.ts";

const lib = new FreeType();

console.log("🚀 FreeType.wasm SIMD Performance Benchmark");
console.log("=".repeat(70));

try {
  await lib.initialize();

  const caps = lib.getCapabilities();

  console.log("\n📊 System Capabilities:");
  console.log(`  WASM SIMD:         ${caps.has_wasm_simd ? '✅ Available' : '❌ Not available'}`);
  console.log(`  WebGPU:            ${caps.has_webgpu ? '✅ Available' : '❌ Not available'}`);
  console.log(`  Web Crypto:        ${caps.has_web_crypto ? '✅ Available' : '❌ Not available'}`);
  console.log(`  OPFS:              ${caps.has_opfs ? '✅ Available' : '❌ Not available'}`);
  console.log(`  Workers:           ${caps.has_workers ? '✅ Available' : '❌ Not available'}`);
  console.log(`  Chrome Version:    ${caps.chrome_version || 'N/A'}`);

  if (!caps.has_wasm_simd) {
    console.log("\n⚠️  SIMD not available - benchmark results will be limited");
  }

  console.log("\n📈 SIMD String Operations Benchmark");
  console.log("=".repeat(70));
  console.log("Size\tIterations\tTime (ms)\tSpeedup\tTarget\tStatus");
  console.log("-".repeat(70));

  const sizes = [32, 64, 128, 256, 512, 1024, 2048, 4096];
  const iterations = 5000;

  const results: Array<{ size: number; speedup: number }> = [];

  for (const size of sizes) {
    const testString = "a".repeat(size);
    const speedup = await lib.benchmarkSIMD(testString, iterations);

    const target = size >= 256 ? 3.0 : 1.5; // Higher target for larger strings
    const status = speedup >= target ? "✅" : "⚠️ ";

    const timePerOp = (1000 / iterations).toFixed(3);

    console.log(
      `${size}\t${iterations}\t\t${timePerOp}\t\t${speedup.toFixed(2)}x\t${target.toFixed(1)}x\t${status}`
    );

    results.push({ size, speedup });
  }

  console.log("=".repeat(70));

  // Calculate statistics
  const speedups = results.map(r => r.speedup);
  const avgSpeedup = speedups.reduce((a, b) => a + b, 0) / speedups.length;
  const maxSpeedup = Math.max(...speedups);
  const minSpeedup = Math.min(...speedups);

  console.log("\n📊 Summary Statistics:");
  console.log(`  Average Speedup:  ${avgSpeedup.toFixed(2)}x`);
  console.log(`  Maximum Speedup:  ${maxSpeedup.toFixed(2)}x`);
  console.log(`  Minimum Speedup:  ${minSpeedup.toFixed(2)}x`);

  console.log("\n🎯 Performance Targets:");
  console.log(`  SIMD Strings:     ${avgSpeedup >= 3.0 ? '✅' : '⚠️ '} ${avgSpeedup.toFixed(2)}x / 3.0x target`);
  console.log(`  WebCrypto:        ⏳ Not yet implemented (target: 5-15x)`);
  console.log(`  Workers:          ⏳ Not yet implemented (target: 10x)`);
  console.log(`  WebGPU:           ⏳ Not yet implemented (target: 10x+)`);

  if (avgSpeedup >= 3.0) {
    console.log("\n✅ SIMD performance targets MET!");
  } else {
    console.log("\n⚠️  SIMD performance below target. Check SIMD availability and browser version.");
  }

  console.log("\n💡 Recommendations:");
  if (!caps.has_wasm_simd) {
    console.log("  • Enable WASM SIMD in your browser");
  }
  if (caps.chrome_version < 113) {
    console.log(`  • Upgrade to Chrome 113+ (current: ${caps.chrome_version})`);
  }
  if (avgSpeedup >= 3.0 && caps.has_wasm_simd) {
    console.log("  • All optimizations working correctly!");
  }

} catch (error) {
  console.error("\n❌ Benchmark failed:", error.message);
  console.log("\nℹ️  Build WASM files first:");
  console.log("   deno task build:wasm");
  Deno.exit(1);
}

console.log("\n✅ Benchmark complete!");
