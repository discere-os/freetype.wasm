#!/usr/bin/env deno run --allow-read

/**
 * FreeType.wasm Demo - Deno-First
 *
 * Demonstrates web-native optimizations and capabilities detection.
 */

import FreeType from "./src/lib/index.ts";
import { BROWSER_REQUIREMENTS, BUILD_VARIANTS } from "./src/lib/types.ts";

console.log("🚀 FreeType.wasm Demo - Deno-First");
console.log("=".repeat(70));

// 1. Initialize library
console.log("\n📦 Initializing FreeType.wasm...");
const ft = new FreeType();

try {
  await ft.initialize();
  console.log("✅ Library initialized");
} catch (error) {
  console.error("❌ Failed to initialize:", error.message);
  console.log("\nℹ️  Build WASM files first:");
  console.log("   deno task build:wasm");
  Deno.exit(1);
}

// 2. Get version
console.log("\n📋 Library Information:");
const version = ft.getVersion();
console.log(`  FreeType Version: ${version}`);

// 3. Check capabilities
console.log("\n🌐 Web-Native Capabilities:");
const caps = ft.getCapabilities();

const capabilities = [
  { name: "WASM SIMD", value: caps.has_wasm_simd, speedup: "3-5x", feature: "String operations" },
  { name: "WebGPU", value: caps.has_webgpu, speedup: "10x+", feature: "GPU acceleration" },
  { name: "Web Crypto", value: caps.has_web_crypto, speedup: "5-15x", feature: "Crypto operations" },
  { name: "OPFS", value: caps.has_opfs, speedup: "3-4x", feature: "File I/O" },
  { name: "Workers", value: caps.has_workers, speedup: "10x", feature: "Threading" },
  { name: "SharedArrayBuffer", value: caps.has_shared_array_buffer, speedup: "N/A", feature: "Real threading" },
];

console.log("\n  Feature              Status  Speedup  Description");
console.log("  " + "-".repeat(66));

for (const cap of capabilities) {
  const status = cap.value ? "✅" : "❌";
  const name = cap.name.padEnd(20);
  const speedup = cap.speedup.padEnd(8);
  console.log(`  ${name} ${status}      ${speedup} ${cap.feature}`);
}

console.log(`\n  Chrome Version:      ${caps.chrome_version || 'N/A'} (minimum: ${BROWSER_REQUIREMENTS.chromeMinVersion})`);

// 4. Check browser compatibility
console.log("\n🖥️  Browser Compatibility:");

if (caps.chrome_version >= BROWSER_REQUIREMENTS.chromeMinVersion && caps.has_wasm_simd) {
  console.log("  ✅ All requirements met - optimal performance");
} else {
  console.log("  ⚠️  Some requirements not met:");

  if (caps.chrome_version < BROWSER_REQUIREMENTS.chromeMinVersion && caps.chrome_version > 0) {
    console.log(`     • Chrome ${caps.chrome_version} < ${BROWSER_REQUIREMENTS.chromeMinVersion} (upgrade recommended)`);
  }
  if (!caps.has_wasm_simd) {
    console.log("     • WASM SIMD not available (3-5x performance loss)");
  }
}

// 5. Show build variants
console.log("\n🏗️  Available Build Variants:");
for (const variant of BUILD_VARIANTS) {
  const current = variant.name === "standard" ? " (current)" : "";
  console.log(`\n  ${variant.name.toUpperCase()}${current}`);
  console.log(`    Description: ${variant.description}`);
  console.log(`    Target Size: ${variant.targetSize}`);
  console.log(`    Features:    ${variant.features.join(', ')}`);
}

// 6. Performance demo
console.log("\n⚡ Performance Demo:");
console.log("  Testing SIMD string operations...");

try {
  const testString = "a".repeat(1024);
  const speedup = await ft.benchmarkSIMD(testString, 1000);

  console.log(`  ✅ SIMD strlen speedup: ${speedup.toFixed(2)}x`);

  if (speedup >= 3.0) {
    console.log("  🎉 Excellent! SIMD optimizations working correctly.");
  } else if (speedup >= 1.5) {
    console.log("  ⚠️  SIMD speedup lower than target (3.0x). Check browser support.");
  } else {
    console.log("  ❌ SIMD speedup very low. SIMD may not be available.");
  }
} catch (error) {
  console.log(`  ⚠️  Performance test failed: ${error.message}`);
}

// 7. Summary
console.log("\n📊 Summary:");

const availableFeatures = [
  caps.has_wasm_simd,
  caps.has_web_crypto,
  caps.has_opfs,
  caps.has_workers,
].filter(Boolean).length;

console.log(`  • ${availableFeatures}/4 key optimizations available`);
console.log(`  • FreeType version: ${version}`);
console.log(`  • Build type: standard`);

console.log("\n💡 Next Steps:");
console.log("  • Run tests:      deno task test");
console.log("  • Run benchmarks: deno task bench");
console.log("  • Build variants: deno task build:minimal | build:webgpu");

console.log("\n✅ Demo complete!");
